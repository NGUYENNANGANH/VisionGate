"""
VisionGate Camera Service — InsightFace (RetinaFace + ArcFace)
"""
import cv2
import numpy as np
import requests
import time
import struct
import base64
import insightface
from insightface.app import FaceAnalysis
from unidecode import unidecode

BACKEND_URL = "http://localhost:5212"
FACE_API_URL = "http://localhost:5000"
DEVICE_ID = 1
CHECK_INTERVAL = 3
CONFIDENCE_THRESHOLD = 0.4
RECOGNITION_INTERVAL = 3

last_checkin_time = {}
known_employees = []

print("[CameraService] Init InsightFace...")
app_face = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app_face.prepare(ctx_id=0, det_size=(640, 640))
print("[CameraService] InsightFace is ready!")

def load_employees_from_backend():
    global known_employees
    try:
        response = requests.get(f"{BACKEND_URL}/api/employees?isActive=true", timeout=5)
        if response.status_code == 200:
            employees = response.json()
            known_employees = []
            for emp in employees:
                face_emb = emp.get('faceEmbedding')
                if not face_emb: continue
                try:
                    byte_array = base64.b64decode(face_emb)
                    float_count = len(byte_array) // 4
                    if float_count != 512: continue
                    embedding = list(struct.unpack(f'{float_count}f', byte_array))
                    known_employees.append({
                        'id': emp['employeeId'],
                        'name': emp['fullName'],
                        'embedding': np.array(embedding, dtype=np.float32)
                    })
                except Exception as e:
                    pass
            print(f"Loaded {len(known_employees)} employees.")
        else:
            print(f"Failed to load employees. Status: {response.status_code}")
    except Exception as e:
        print(f"Error loading employees: {e}")

def cosine_distance(embedding1, embedding2):
    dot_product = np.dot(embedding1, embedding2)
    norm_product = np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
    if norm_product == 0: return 1.0
    return 1 - dot_product / norm_product

def find_matching_employee(face_embedding):
    if len(known_employees) == 0: return None, 1.0
    min_distance = float('inf')
    matched_employee = None
    for emp in known_employees:
        distance = cosine_distance(face_embedding, emp['embedding'])
        if distance < min_distance:
            min_distance = distance
            matched_employee = emp
    if min_distance < CONFIDENCE_THRESHOLD:
        return matched_employee, min_distance
    else:
        return None, min_distance

def send_checkin_to_backend(employee_id, face_image, confidence):
    try:
        _, buffer = cv2.imencode('.jpg', face_image)
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        payload = {
            "employeeId": int(employee_id),
            "deviceId": DEVICE_ID,
            "checkInImageUrl": f"data:image/jpeg;base64,{img_base64}",
            "faceConfidence": round(float((1 - confidence) * 100), 2),
            "hasHelmet": True,
            "hasGloves": True,
            "hasSafetyVest": True,
            "hasSafetyBoots": True,
            "hasMask": True,
            "ppeConfidenceScore": 0.85,
            "detectionData": f"Camera {DEVICE_ID} - InsightFace"
        }
        response = requests.post(f"{BACKEND_URL}/api/checkins/ai-process", json=payload, timeout=10)
        if response.status_code == 200:
            print(f"Check-in OK for Employee #{employee_id}")
            return True
        else:
            print(f"Check-in failed. Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"Check-in error: {e}")
        return False

def send_frame_to_api(frame):
    try:
        _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        requests.post(f"{FACE_API_URL}/camera/frame", data=jpeg.tobytes(), headers={"Content-Type": "application/octet-stream"}, timeout=1)
    except Exception:
        pass

def can_checkin(employee_id):
    current_time = time.time()
    if employee_id in last_checkin_time:
        if current_time - last_checkin_time[employee_id] < CHECK_INTERVAL:
            return False
    return True

def draw_face_info(frame, bbox, label, color):
    x1, y1, x2, y2 = bbox.astype(int)
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
    cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

def main():
    print("VisionGate Camera Service")
    load_employees_from_backend()
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Cannot open camera!")
        return
    print("Camera ready. Press q to quit, r to reload.")
    frame_count = 0
    cached_results = []
    
    while True:
        ret, frame = cap.read()
        if not ret: break
        frame_count += 1
        
        if frame_count % RECOGNITION_INTERVAL == 0:
            faces = app_face.get(frame)
            cached_results = []
            for face in faces:
                embedding = face.embedding
                bbox = face.bbox
                matched_emp, distance = find_matching_employee(embedding)
                if matched_emp:
                    clean_name = unidecode(matched_emp['name'])
                    label = f"{clean_name} ({int((1-distance)*100)}%)"
                    color = (0, 255, 0)
                    if can_checkin(matched_emp['id']):
                        print(f"Detected: {clean_name}")
                        x1, y1, x2, y2 = bbox.astype(int)
                        face_img = frame[max(0, y1):min(frame.shape[0], y2), max(0, x1):min(frame.shape[1], x2)]
                        send_checkin_to_backend(matched_emp['id'], face_img, distance)
                        last_checkin_time[matched_emp['id']] = time.time()
                else:
                    label = f"UNKNOWN ({int((1-distance)*100)}%)"
                    color = (0, 0, 255)
                cached_results.append({'bbox': bbox, 'label': label, 'color': color})
                
        for result in cached_results:
            draw_face_info(frame, result['bbox'], result['label'], result['color'])
            
        cv2.putText(frame, f"Faces: {len(cached_results)} | Employees: {len(known_employees)}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        if frame_count % 2 == 0: send_frame_to_api(frame)
        cv2.imshow('VisionGate - Camera AI', frame)
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'): break
        elif key == ord('r'):
            print("Reloading employees...")
            load_employees_from_backend()
            
    cap.release()
    cv2.destroyAllWindows()
    print("Camera Service stopped.")

if __name__ == "__main__":
    main()