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
import threading
import queue
from unidecode import unidecode

# Bắt buộc OpenCV dùng TCP để đọc luồng RTSP (tránh lỗi Stream timeout do mất gói tin UDP)
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

import os
BACKEND_URL = os.getenv("BACKEND_URL", "https://api.nguyennanganh.dev")
FACE_API_URL = os.getenv("FACE_API_URL", "http://localhost:8000")
DEVICE_ID = int(os.getenv("DEVICE_ID", "1"))
# Camera Dahua DH-IPC-HFW1539DTK2-SAW-IL.
# IP lấy ĐỘNG từ giao diện web (Device.IpAddress qua API). Mật khẩu giữ tại đây cho an toàn (không đưa lên web).
CAMERA_USERNAME = "admin"
CAMERA_PASSWORD = "L22E4ABC"
RTSP_PORT = 554
RTSP_SUBTYPE = 0               # 0 = luồng chính (5MP, nét); 1 = luồng phụ (nhẹ)
FALLBACK_IP = "192.168.1.29"   # dùng khi giao diện chưa nhập IP / không gọi được API
USE_WEBCAM = False             # True = dùng webcam laptop thay camera IP
USE_VIDEO = False               # True = dùng file mp4 thay vì RTSP/Webcam
VIDEO_PATH = "d:/doan/VisionGate/AI_Core/IMG_3105.MOV" # Đường dẫn file video test
CHECK_INTERVAL = 3
RECOGNITION_INTERVAL = 3  # Tần suất lấy frame cho AI (chạy nền nên có thể để thấp)

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
            print(f"Check-in failed. Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print(f"Check-in error: {e}")
        return False

def send_frame_to_api(frame):
    try:
        _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 55])
        requests.post(
            f"{FACE_API_URL}/camera/frame?deviceId={DEVICE_ID}",
            data=jpeg.tobytes(),
            headers={"Content-Type": "application/octet-stream"},
            timeout=1
        )
    except Exception as e:
        print(f"send_frame error: {e}")

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

def get_active_device_config():
    """Return an active device config. If none is active, AI/camera stays paused."""
    try:
        resp = requests.get(f"{BACKEND_URL}/api/devices", timeout=5)
        if resp.status_code != 200:
            print(f"[CameraService] Devices API returned {resp.status_code}. AI paused.")
            return None

        devices = resp.json()
        if not devices:
            print("[CameraService] Chua co thiet bi nao. AI paused.")
            return None

        active_devices = [d for d in devices if d.get('isActive', True)]
        if not active_devices:
            print("[CameraService] Khong co thiet bi dang hoat dong. AI paused.")
            return None

        return next((d for d in active_devices if d.get('deviceId') == DEVICE_ID), active_devices[0])
    except Exception as e:
        print(f"[CameraService] Cannot call devices API ({e}). AI paused.")
        return None


def has_active_device(device_id):
    try:
        resp = requests.get(f"{BACKEND_URL}/api/devices", timeout=3)
        if resp.status_code != 200:
            return False

        devices = resp.json()
        active_devices = [d for d in devices if d.get('isActive', True)]
        if not active_devices:
            print("[CameraService] Tat ca thiet bi da OFF. Dung AI.")
            return False

        return any(d.get('deviceId') == device_id for d in active_devices)
    except Exception as e:
        print(f"[CameraService] Cannot refresh device status ({e}). Dung AI tam thoi.")
        return False

def main():
    global registered_count
    global DEVICE_ID
    print("VisionGate Camera Service")
    faces_loaded = False

    if USE_VIDEO:
        source = VIDEO_PATH
        print(f"[CameraService] Đang dùng video test: {VIDEO_PATH}")
    elif USE_WEBCAM:
        source = 0
        print("[CameraService] Đang dùng Webcam laptop")

    last_api_check = 0

    while True: # Outer loop to auto-reconnect and poll config
        if not USE_VIDEO and not USE_WEBCAM:
            d = get_active_device_config()
            if d is None:
                print("[CameraService] Khong co thiet bi active. Service dung han, khong poll nua.")
                return

            ip = d.get('ipAddress') or FALLBACK_IP
            user = d.get('rtspUsername') or CAMERA_USERNAME
            pwd = d.get('rtspPassword') or CAMERA_PASSWORD
            port = d.get('rtspPort') or RTSP_PORT
            DEVICE_ID = d.get('deviceId', DEVICE_ID)
            print(f"[CameraService] Active device #{DEVICE_ID}: {user}@{ip}:{port}")

            if ip.startswith("http") or ip.endswith(".mp4") or ip.endswith(".mov"):
                source = ip
                print(f"[CameraService] Dung video truc tiep: {source}")
            else:
                source = f"rtsp://{user}:{pwd}@{ip}:{port}/cam/realmonitor?channel=1&subtype={RTSP_SUBTYPE}"


        if not faces_loaded:
            try:
                r = requests.post(f"{FACE_API_URL}/reload-faces", timeout=15)
                if r.status_code == 200:
                    registered_count = r.json().get("count", 0)
                    faces_loaded = True
                    print(f"[CameraService] FastAPI loaded {registered_count} embeddings")
                else:
                    print(f"[CameraService] reload-faces returned {r.status_code}")
                    return
            except Exception as e:
                print(f"[CameraService] Cannot reload faces on FastAPI: {e}")
                return
        cap = cv2.VideoCapture(source, cv2.CAP_FFMPEG) if (isinstance(source, str) and source.startswith("rtsp")) else cv2.VideoCapture(source)
        if not USE_VIDEO:
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # luôn lấy frame mới nhất, giảm độ trễ RTSP
        if not cap.isOpened():
            print("Cannot open camera! Retrying in 5 seconds...")
            time.sleep(5)
            continue

        print("Camera ready.")
        frame_count = 0
        should_stop_service = False
        cached_results = []
        cached_ppe = None
        last_api_check = time.time()

        # --- Background recognition thread ---
        recog_queue = queue.Queue(maxsize=1)   # chỉ giữ 1 frame chờ xử lý
        recog_result_lock = threading.Lock()
        recog_running = [True]

        def recognition_worker():
            while recog_running[0]:
                try:
                    frame_to_recog = recog_queue.get(timeout=1)
                except queue.Empty:
                    continue
                result = recognize_frame(frame_to_recog)
                if result and result.get('success'):
                    nonlocal cached_results, cached_ppe
                    global registered_count
                    new_results = []
                    with recog_result_lock:
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
                                    send_checkin_to_backend(emp_id, frame_to_recog.copy(), dist, cached_ppe)
                                    last_checkin_time[emp_id] = time.time()
                            else:
                                label = f"UNKNOWN (Dist: {dist:.2f})"
                                color = (0, 0, 255)
                                
                            new_results.append({'bbox': bbox, 'label': label, 'color': color})
                        cached_results = new_results

        recog_thread = threading.Thread(target=recognition_worker, daemon=True)
        recog_thread.start()
        
        # --- Background stream thread ---
        stream_queue = queue.Queue(maxsize=2)
        def stream_worker():
            while recog_running[0]:
                try:
                    frame_to_stream = stream_queue.get(timeout=1)
                except queue.Empty:
                    continue
                send_frame_to_api(frame_to_stream)

        stream_thread = threading.Thread(target=stream_worker, daemon=True)
        stream_thread.start()
        # --- End background threads setup ---

        while True:
            # Check API periodically (e.g. every 10 seconds) to see if device was turned off
            if time.time() - last_api_check > 10:
                last_api_check = time.time()
                if not USE_VIDEO and not USE_WEBCAM:
                    if not has_active_device(DEVICE_ID):
                        should_stop_service = True
                        break

            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps <= 0 or fps > 120: fps = 30
            frame_time = 1.0 / fps
            start_time = time.time()
            ret, frame = cap.read()
            if not (isinstance(source, str) and source.startswith('rtsp')):
                elapsed = time.time() - start_time
                if elapsed < frame_time:
                    time.sleep(frame_time - elapsed)
            if not ret: 
                print("[CameraService] Mất kết nối stream. Đang thử lại...")
                break
        
            # Thu nhỏ khung hình nếu video quá to (giảm lag và vừa màn hình)
            height, width = frame.shape[:2]
            max_dim = 800
            if height > max_dim or width > max_dim:
                scale = max_dim / max(height, width)
                frame = cv2.resize(frame, (int(width * scale), int(height * scale)))
            
            frame_count += 1

            # Push frame to recognition thread (luôn lấy frame MỚI NHẤT)
            if frame_count % RECOGNITION_INTERVAL == 0:
                # Nếu queue đang có frame cũ chờ xử lý -> vứt frame cũ đi, nạp frame mới vào
                if recog_queue.full():
                    try:
                        recog_queue.get_nowait()
                    except queue.Empty:
                        pass
                try:
                    recog_queue.put_nowait(frame.copy())
                except queue.Full:
                    pass

            with recog_result_lock:
                for item in cached_results:
                    draw_face_info(frame, item['bbox'], item['label'], item['color'])

                cv2.putText(frame, f"Faces: {len(cached_results)} | Registered: {registered_count}", (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

                # Vẽ khung cho đồ bảo hộ
                if cached_ppe and 'boxes' in cached_ppe:
                    for b in cached_ppe['boxes']:
                        x1, y1, x2, y2 = b['bbox']
                        label = f"{b['label']} {b['conf']:.2f}"
                        if b['label'] == 'helmet': box_color = (0, 255, 255)
                        elif b['label'] == 'vest': box_color = (0, 165, 255)
                        else: box_color = (255, 0, 0)
                        cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
                        cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, box_color, 2)

            # Gửi frame lên AI để hiển thị live stream trên web (đẩy vào queue, không block)
            if frame_count % 2 == 0:
                try:
                    stream_queue.put_nowait(frame.copy())
                except queue.Full:
                    pass

            # Tránh việc chạy max CPU khi đọc file video nội bộ
            if USE_VIDEO or (isinstance(source, str) and not source.startswith("rtsp")):
                time.sleep(0.02)

        recog_running[0] = False
        cap.release()
        if should_stop_service:
            print("[CameraService] Thiet bi da tat. Service dung han, khong poll nua.")
            return

        print("Camera Service stopped for this session. Reconnecting...")
        time.sleep(2)

if __name__ == "__main__":
    main()
