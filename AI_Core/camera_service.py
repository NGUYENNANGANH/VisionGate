"""
VisionGate Camera Service — đọc luồng RTSP, gửi frame sang FastAPI để nhận diện + PPE.
Nhận diện/so khớp khuôn mặt được xử lý TẬP TRUNG ở FastAPI (Tầng xử lý AI).
Camera Service chỉ: đọc RTSP, gọi /recognize, upload snapshot, gửi check-in về Backend.
"""
import cv2
import numpy as np
import requests
import time
import base64
import os
from unidecode import unidecode

# Bắt buộc OpenCV dùng TCP để đọc luồng RTSP (tránh lỗi Stream timeout do mất gói tin UDP)
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

BACKEND_URL = "http://localhost:5212"
FACE_API_URL = "http://localhost:8000"
DEVICE_ID = 1
# Camera Dahua DH-IPC-HFW1539DTK2-SAW-IL.
# IP lấy ĐỘNG từ giao diện web (Device.IpAddress qua API). Mật khẩu giữ tại đây cho an toàn (không đưa lên web).
CAMERA_USERNAME = "admin"
CAMERA_PASSWORD = "L22E4ABC"
RTSP_PORT = 554
RTSP_SUBTYPE = 0               # 0 = luồng chính (5MP, nét); 1 = luồng phụ (nhẹ)
FALLBACK_IP = "192.168.1.29"   # dùng khi giao diện chưa nhập IP / không gọi được API
USE_WEBCAM = False             # True = dùng webcam laptop thay camera IP
USE_VIDEO = True               # True = dùng file mp4 thay vì RTSP/Webcam
VIDEO_PATH = "d:/doan/VisionGate/AI_Core/IMG_3105.MOV" # Đường dẫn file video test
CHECK_INTERVAL = 3
RECOGNITION_INTERVAL = 3

# Cloudinary (unsigned upload) — đồng bộ với luồng đăng ký khuôn mặt ở Frontend.
# Ảnh điểm danh/vi phạm được upload lên Cloudinary, DB chỉ lưu URL (không lưu base64).
CLOUDINARY_CLOUD_NAME = "dmh02ga34"
CLOUDINARY_UPLOAD_PRESET = "visiongate"
CLOUDINARY_FOLDER = "checkins"

last_checkin_time = {}
registered_count = 0

def upload_to_cloudinary(jpeg_bytes):
    """Upload snapshot lên Cloudinary (unsigned). Trả về secure_url, hoặc None nếu lỗi."""
    try:
        files = {"file": ("checkin.jpg", jpeg_bytes, "image/jpeg")}
        data = {"upload_preset": CLOUDINARY_UPLOAD_PRESET, "folder": CLOUDINARY_FOLDER}
        resp = requests.post(
            f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload",
            files=files, data=data, timeout=10)
        if resp.status_code == 200:
            return resp.json().get("secure_url")
        print(f"Cloudinary upload failed. Status: {resp.status_code}")
        return None
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        return None

def recognize_frame(frame):
    """Gửi frame sang FastAPI /recognize. FastAPI chạy InsightFace (so khớp) + PPE, trả kết quả."""
    try:
        _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        resp = requests.post(
            f"{FACE_API_URL}/recognize",
            data=jpeg.tobytes(),
            headers={"Content-Type": "application/octet-stream"},
            timeout=10)
        if resp.status_code == 200:
            return resp.json()
        print(f"Recognize failed. Status: {resp.status_code}")
    except Exception as e:
        print(f"Recognize error: {e}")
    return None

def send_checkin_to_backend(employee_id, face_image, confidence, ppe=None):
    try:
        _, buffer = cv2.imencode('.jpg', face_image)
        # Upload ảnh lên Cloudinary, DB chỉ lưu URL. Nếu Cloudinary lỗi -> fallback base64.
        image_url = upload_to_cloudinary(buffer.tobytes())
        if not image_url:
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            image_url = f"data:image/jpeg;base64,{img_base64}"
        ppe = ppe or {}
        payload = {
            "employeeId": int(employee_id),
            "deviceId": DEVICE_ID,
            "checkInImageUrl": image_url,
            "faceConfidence": round(float((1 - confidence) * 100), 2),
            "hasHelmet": ppe.get("hasHelmet", True),
            "hasGloves": ppe.get("hasGloves", True),
            "hasSafetyVest": ppe.get("hasSafetyVest", True),
            "hasSafetyBoots": ppe.get("hasSafetyBoots", True),
            "hasMask": ppe.get("hasMask", True),
            "ppeConfidenceScore": ppe.get("ppeConfidenceScore", 0.85),
            "detectionData": f"Camera {DEVICE_ID} - FastAPI"
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
    global registered_count
    print("VisionGate Camera Service")
    # Yêu cầu FastAPI nạp lại embedding mới nhất từ Backend (1 nguồn duy nhất ở Tầng AI)
    try:
        r = requests.post(f"{FACE_API_URL}/reload-faces", timeout=15)
        if r.status_code == 200:
            registered_count = r.json().get("count", 0)
            print(f"[CameraService] FastAPI loaded {registered_count} embeddings")
        else:
            print(f"[CameraService] reload-faces returned {r.status_code}")
    except Exception as e:
        print(f"[CameraService] Cannot reload faces on FastAPI: {e}")

    if USE_VIDEO:
        source = VIDEO_PATH
        print(f"[CameraService] Đang dùng video test: {VIDEO_PATH}")
    elif USE_WEBCAM:
        source = 0
        print("[CameraService] Đang dùng Webcam laptop")
    else:
        # Lấy TOÀN BỘ thông tin kết nối từ CSDL (mỗi thiết bị một cấu hình riêng)
        ip, user, pwd, port = FALLBACK_IP, CAMERA_USERNAME, CAMERA_PASSWORD, RTSP_PORT
        try:
            resp = requests.get(f"{BACKEND_URL}/api/devices/{DEVICE_ID}", timeout=5)
            if resp.status_code == 200:
                d = resp.json()
                ip = d.get('ipAddress') or ip
                user = d.get('rtspUsername') or user
                pwd = d.get('rtspPassword') or pwd
                port = d.get('rtspPort') or port
                print(f"[CameraService] Loaded camera config from API: {user}@{ip}:{port}")
            else:
                print(f"[CameraService] API returned {resp.status_code}, using fallback {user}@{ip}:{port}")
        except Exception as e:
            print(f"[CameraService] Cannot call API ({e}), using fallback {user}@{ip}:{port}")
        source = f"rtsp://{user}:{pwd}@{ip}:{port}/cam/realmonitor?channel=1&subtype={RTSP_SUBTYPE}"
    cap = cv2.VideoCapture(source, cv2.CAP_FFMPEG) if (isinstance(source, str) and source.startswith("rtsp")) else cv2.VideoCapture(source)
    if not USE_VIDEO:
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # luôn lấy frame mới nhất, giảm độ trễ RTSP
    if not cap.isOpened():
        print("Cannot open camera!")
        return
    print("Camera ready.")
    frame_count = 0
    cached_results = []
    cached_ppe = None

    while True:
        ret, frame = cap.read()
        if not ret: break
        
        # Thu nhỏ khung hình nếu video quá to (giảm lag và vừa màn hình)
        height, width = frame.shape[:2]
        max_dim = 800
        if height > max_dim or width > max_dim:
            scale = max_dim / max(height, width)
            frame = cv2.resize(frame, (int(width * scale), int(height * scale)))
            
        frame_count += 1

        if frame_count % RECOGNITION_INTERVAL == 0:
            result = recognize_frame(frame)
            cached_results = []
            if result and result.get('success'):
                registered_count = result.get('registeredCount', registered_count)
                cached_ppe = result.get('ppe')
                for f in result.get('faces', []):
                    bbox = np.array(f['bbox'], dtype=float)
                    dist = float(f.get('distance', 1.0))
                    emp_id = f.get('employeeId')
                    if emp_id:
                        clean_name = unidecode(f.get('name') or '')
                        label = f"{clean_name} (Dist: {dist:.2f})"
                        color = (0, 255, 0)
                        if can_checkin(emp_id):
                            print(f"Detected: {clean_name}")
                            send_checkin_to_backend(emp_id, frame.copy(), dist, cached_ppe)
                            last_checkin_time[emp_id] = time.time()
                    else:
                        label = f"UNKNOWN (Dist: {dist:.2f})"
                        color = (0, 0, 255)
                    cached_results.append({'bbox': bbox, 'label': label, 'color': color})

        for item in cached_results:
            draw_face_info(frame, item['bbox'], item['label'], item['color'])

        cv2.putText(frame, f"Faces: {len(cached_results)} | Registered: {registered_count}", (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        if cached_ppe:
            helmet_str = "OK" if cached_ppe.get("hasHelmet") else "NO"
            vest_str = "OK" if cached_ppe.get("hasSafetyVest") else "NO"
            boots_str = "OK" if cached_ppe.get("hasSafetyBoots") else "NO"
            color = (0, 255, 0) if (cached_ppe.get("hasHelmet") and cached_ppe.get("hasSafetyVest") and cached_ppe.get("hasSafetyBoots")) else (0, 0, 255)
            cv2.putText(frame, f"PPE - Helmet:{helmet_str} | Vest:{vest_str} | Boots:{boots_str}", (10, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
            
            # Vẽ khung cho đồ bảo hộ
            if 'boxes' in cached_ppe:
                for b in cached_ppe['boxes']:
                    x1, y1, x2, y2 = b['bbox']
                    label = f"{b['label']} {b['conf']:.2f}"
                    # helmet = màu vàng, vest = màu cam, boots = màu đỏ sẫm
                    if b['label'] == 'helmet': box_color = (0, 255, 255)
                    elif b['label'] == 'vest': box_color = (0, 165, 255)
                    else: box_color = (255, 0, 0)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
                    cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, box_color, 2)

        if frame_count % 2 == 0: send_frame_to_api(frame)

        # Hiển thị màn hình xem trực tiếp
        cv2.imshow("VisionGate Camera Test", frame)
        if cv2.waitKey(20) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("Camera Service stopped.")

if __name__ == "__main__":
    main()
