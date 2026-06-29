import time
import asyncio
from urllib.parse import urlparse
import cv2
import numpy as np
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import httpx
import threading
import base64
import struct
import requests
import insightface
from insightface.app import FaceAnalysis
from ultralytics import YOLO

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

MAX_FRAME_SIZE = 5 * 1024 * 1024   # 5 MB per camera frame
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB per encode request

frame_buffer = None
lock = threading.Lock()
model_lock = threading.Lock()    # serialize InsightFace inference giữa các request

BACKEND_URL = "http://localhost:5212"
CONFIDENCE_THRESHOLD = 0.4       # ngưỡng cosine distance để coi là khớp khuôn mặt
known_faces = []                 # [{employee_id, name, embedding np.float32[512]}]

class UrlRequest(BaseModel):
    url: str

print("[FaceAPI] Init InsightFace (buffalo_l)...")
app_face = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app_face.prepare(ctx_id=0, det_size=(640, 640))
print("[FaceAPI] Init YOLO11s (PPE)...")
ppe_model = YOLO('models/ppe_yolo11.pt')
print("[FaceAPI] Init Done!")

def _validate_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in ("http", "https")

def _sync_get_embedding(img_array):
    try:
        with model_lock:
            faces = app_face.get(img_array)
        if len(faces) > 0:
            # Lấy khuôn mặt đầu tiên (to nhất / tự tin nhất)
            return faces[0].embedding
        return None
    except Exception as e:
        print("Lỗi nhận diện khuôn mặt:", e)
        return None

def cosine_distance(e1, e2):
    norm = np.linalg.norm(e1) * np.linalg.norm(e2)
    if norm == 0:
        return 1.0
    return 1 - np.dot(e1, e2) / norm

def find_matching_employee(face_embedding):
    if not known_faces:
        return None, 1.0
    best, best_d = None, float('inf')
    for rf in known_faces:
        d = cosine_distance(face_embedding, rf['embedding'])
        if d < best_d:
            best_d, best = d, rf
    if best_d < CONFIDENCE_THRESHOLD:
        return best, best_d
    return None, best_d

def load_faces_from_backend():
    """Nạp embedding tất cả nhân viên từ Backend — 1 nguồn duy nhất cho Tầng AI."""
    global known_faces
    try:
        resp = requests.get(f"{BACKEND_URL}/api/employees/registered-faces", timeout=5)
        if resp.status_code != 200:
            print(f"[FaceAPI] Load faces failed. Status: {resp.status_code}")
            return
        loaded = []
        for face in resp.json():
            emb = face.get('faceEmbedding')
            if not emb:
                continue
            try:
                ba = base64.b64decode(emb)
                if len(ba) // 4 != 512:
                    continue
                vec = np.array(struct.unpack('512f', ba), dtype=np.float32)
                loaded.append({
                    'employee_id': face['employeeId'],
                    'name': face['fullName'],
                    'embedding': vec,
                })
            except Exception:
                pass
        known_faces = loaded
        emp_count = len({f['employee_id'] for f in known_faces})
        print(f"[FaceAPI] Loaded {len(known_faces)} embeddings for {emp_count} employees.")
    except Exception as e:
        print(f"[FaceAPI] Error loading faces: {e}")

def _sync_recognize(img_array):
    with model_lock:
        faces = app_face.get(img_array)
    results = []
    for face in faces:
        emp, dist = find_matching_employee(face.embedding)
        x1, y1, x2, y2 = [int(v) for v in face.bbox]
        results.append({
            'employeeId': emp['employee_id'] if emp else None,
            'name': emp['name'] if emp else None,
            'distance': float(dist),
            'bbox': [x1, y1, x2, y2],
        })
    return results

def _sync_detect_ppe(img_array):
    with model_lock:
        results = ppe_model.predict(img_array, conf=0.25, iou=0.6, imgsz=800, verbose=False)
    
    detected_names = set()
    confidences = []
    ppe_boxes = []
    
    if len(results) > 0:
        for box in results[0].boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            name = results[0].names[cls_id]
            detected_names.add(name)
            
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
            if name in ['helmet', 'vest', 'boots']:
                confidences.append(conf)
                ppe_boxes.append({
                    "label": name,
                    "conf": conf,
                    "bbox": [x1, y1, x2, y2]
                })
                
    avg_conf = round(sum(confidences) / len(confidences), 2) if confidences else 1.0
    
    return {
        "hasHelmet": "helmet" in detected_names,
        "hasGloves": True, # Mặc định
        "hasSafetyVest": "vest" in detected_names,
        "hasSafetyBoots": "boots" in detected_names,
        "hasMask": True,   # Mặc định
        "ppeConfidenceScore": avg_conf,
        "boxes": ppe_boxes
    }

@app.post("/api/encode")
async def encode_face(request: UrlRequest):
    # C3: validate URL scheme trước khi fetch
    if not _validate_url(request.url):
        return JSONResponse(status_code=400, content={"Success": False, "Message": "URL không hợp lệ (chỉ http/https)"})
    try:
        # H1: dùng httpx async thay requests sync — không block event loop
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(request.url)
            resp.raise_for_status()
            if len(resp.content) > MAX_IMAGE_SIZE:
                return JSONResponse(status_code=413, content={"Success": False, "Message": "Ảnh quá lớn (tối đa 10MB)"})
            image_bytes = resp.content

        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return JSONResponse(content={"Success": False, "Message": "Không thể đọc ảnh"})

        # H2: chạy ONNX inference trong thread pool — không block event loop
        loop = asyncio.get_event_loop()
        embedding = await loop.run_in_executor(None, _sync_get_embedding, img)

        if embedding is not None:
            return JSONResponse(content={"Success": True, "Embedding": embedding.tolist()})
        else:
            return JSONResponse(content={"Success": False, "Message": "Không tìm thấy khuôn mặt hợp lệ"})

    except Exception as e:
        return JSONResponse(content={"Success": False, "Message": f"Lỗi xử lý ảnh: {str(e)}"})

@app.post("/camera/frame")
async def receive_frame(request: Request):
    global frame_buffer
    body = await request.body()
    # H6: giới hạn kích thước frame
    if len(body) > MAX_FRAME_SIZE:
        raise HTTPException(status_code=413, detail="Frame quá lớn (tối đa 5MB)")
    with lock:
        frame_buffer = body
    return {"status": "ok"}

def mjpeg_generator():
    global frame_buffer
    while True:
        with lock:
            frame_data = frame_buffer

        if frame_data is not None:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_data + b'\r\n')
        time.sleep(0.05)  # ~20 FPS cap

@app.get("/camera/stream")
async def video_feed():
    return StreamingResponse(
        mjpeg_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.post("/recognize")
async def recognize(request: Request):
    """Nhận frame từ Camera Service → InsightFace nhận diện + so khớp embedding (+ PPE sau)."""
    body = await request.body()
    if len(body) > MAX_FRAME_SIZE:
        raise HTTPException(status_code=413, detail="Frame quá lớn (tối đa 5MB)")
    nparr = np.frombuffer(body, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return JSONResponse(content={"success": False, "message": "Không đọc được ảnh", "faces": []})
    loop = asyncio.get_event_loop()
    
    # Chạy song song cả hai luồng nhận diện bằng asyncio.gather để tối ưu tốc độ
    faces, ppe = await asyncio.gather(
        loop.run_in_executor(None, _sync_recognize, img),
        loop.run_in_executor(None, _sync_detect_ppe, img)
    )
    return JSONResponse(content={
        "success": True,
        "registeredCount": len(known_faces),
        "faces": faces,
        "ppe": ppe,
    })

@app.post("/reload-faces")
async def reload_faces():
    """Gọi sau khi có người đăng ký mới để nạp lại embedding (Backend hoặc Camera Service gọi)."""
    load_faces_from_backend()
    return {"status": "ok", "count": len(known_faces)}

@app.on_event("startup")
def _startup_load_faces():
    load_faces_from_backend()
