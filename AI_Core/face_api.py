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
import insightface
from insightface.app import FaceAnalysis

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

class UrlRequest(BaseModel):
    url: str

print("[FaceAPI] Init InsightFace (buffalo_l)...")
app_face = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app_face.prepare(ctx_id=0, det_size=(640, 640))
print("[FaceAPI] Init Done!")

def _validate_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in ("http", "https")

def _sync_get_embedding(img_array):
    try:
        faces = app_face.get(img_array)
        if len(faces) > 0:
            # Lấy khuôn mặt đầu tiên (to nhất / tự tin nhất)
            return faces[0].embedding
        return None
    except Exception as e:
        print("Lỗi nhận diện khuôn mặt:", e)
        return None

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
