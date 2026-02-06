import cv2
import numpy as np
import requests
import time
from deepface import DeepFace
import struct
import base64

# ===== CẤU HÌNH =====
BACKEND_URL = "http://localhost:5212"
DEVICE_ID = 1
CHECK_INTERVAL = 3
CONFIDENCE_THRESHOLD = 0.4


last_checkin_time = {}
known_employees = []

def load_employees_from_backend():
    global known_employees
    try:
        response = requests.get(f"{BACKEND_URL}/api/employees", timeout=5)
        if response.status_code == 200:
            employees = response.json()
            known_employees = []
            
            for emp in employees:
                face_emb = emp.get('faceEmbedding')
                
                # Bỏ qua nếu không có FaceEmbedding
                if not face_emb:
                    continue
                
                try:
                    # FaceEmbedding được lưu dạng Base64, không phải HEX
                    import base64
                    
                    # Decode Base64 thành bytes
                    byte_array = base64.b64decode(face_emb)
                    float_count = len(byte_array) // 4
                    
                    # Kiểm tra số lượng float (512 cho FaceNet512)
                    if float_count != 512:
                        print(f"⚠️ Bỏ qua {emp['fullName']}: Vector có {float_count} chiều (cần 512)")
                        continue
                    
                    # Unpack bytes thành float array
                    embedding = list(struct.unpack(f'{float_count}f', byte_array))
                    
                    known_employees.append({
                        'id': emp['employeeId'],
                        'name': emp['fullName'],
                        'embedding': np.array(embedding)
                    })
                    print(f"✅ Loaded: {emp['fullName']} (ID: {emp['employeeId']}, {float_count} dims)")
                    
                except Exception as e:
                    print(f"Bỏ qua {emp.get('fullName', 'Unknown')}: {e}")
                    continue
            
            print(f"Đã load {len(known_employees)} nhân viên có Face Embedding")
        else:
            print(f"Không thể tải danh sách nhân viên. Status: {response.status_code}")
    except Exception as e:
        print(f"Lỗi khi load nhân viên: {e}")

def cosine_distance(embedding1, embedding2):
    return 1 - np.dot(embedding1, embedding2) / (
        np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
    )

def find_matching_employee(face_embedding):
    if len(known_employees) == 0:
        return None, 1.0
    
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
            "employeeId": employee_id,
            "deviceId": DEVICE_ID,
            "checkInImageUrl": f"data:image/jpeg;base64,{img_base64[:100]}...",
            "faceConfidence": round((1 - confidence) * 100, 2),
            "hasHelmet": True,
            "hasGloves": True,
            "hasSafetyVest": True,
            "hasSafetyBoots": True,
            "hasMask": True,
            "ppeConfidenceScore": 0.85,
            "detectionData": f"Camera {DEVICE_ID} - Auto Detect"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/checkins/ai-process",
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"Check-in thành công cho Employee #{employee_id}")
            return True
        else:
            print(f"Check-in thất bại. Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"Lỗi khi gửi check-in: {e}")
        return False

def can_checkin(employee_id):
    current_time = time.time()
    if employee_id in last_checkin_time:
        elapsed = current_time - last_checkin_time[employee_id]
        if elapsed < CHECK_INTERVAL:
            return False
    return True

def main():
    print("=" * 60)
    print("🎥 VisionGate Camera Service")
    print("=" * 60)
    
    load_employees_from_backend()
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Không thể mở camera!")
        return
    
    print("Camera đã sẵn sàng. Nhấn 'q' để thoát, 'r' để reload danh sách nhân viên.")
    
    # Điều chỉnh tham số để phát hiện dễ hơn
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    frame_count = 0
    last_faces = []  # Lưu vị trí khuôn mặt để vẽ mượt
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Không đọc được frame từ camera")
            break
        
        frame_count += 1
        
        # LUÔN LUÔN phát hiện và vẽ khung (mỗi frame)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1,  # Dễ dàng hơn
            minNeighbors=4,   # Giảm từ 5 xuống 4
            minSize=(50, 50)  # Kích thước tối thiểu
        )
        
        # Vẽ khung cho tất cả khuôn mặt phát hiện được
        for (x, y, w, h) in faces:
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            cv2.putText(frame, "Detecting...", (x, y-10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        # Chỉ nhận diện AI mỗi 10 frame (tối ưu tốc độ)
        if frame_count % 10 == 0 and len(faces) > 0:
            x, y, w, h = faces[0]  # Lấy khuôn mặt đầu tiên
            face_img = frame[y:y+h, x:x+w]
            
            try:
                cv2.imwrite("temp_face.jpg", face_img)
                
                embedding_objs = DeepFace.represent(
                    img_path="temp_face.jpg",
                    model_name="Facenet512",
                    enforce_detection=False,
                    detector_backend="skip"
                )
                
                if len(embedding_objs) > 0:
                    face_embedding = np.array(embedding_objs[0]["embedding"])
                    matched_emp, distance = find_matching_employee(face_embedding)
                    
                    if matched_emp:
                        label = f"{matched_emp['name']} ({int((1-distance)*100)}%)"
                        color = (0, 255, 0)
                        
                        if can_checkin(matched_emp['id']):
                            print(f"Phát hiện: {matched_emp['name']} (Độ tin cậy: {int((1-distance)*100)}%)")
                            send_checkin_to_backend(matched_emp['id'], face_img, distance)
                            last_checkin_time[matched_emp['id']] = time.time()
                    else:
                        label = f"UNKNOWN ({int((1-distance)*100)}%)"
                        color = (0, 0, 255)
                        print(f"Phát hiện người lạ (Khoảng cách: {distance:.2f})")
                    
                    # Vẽ label lên khung
                    cv2.putText(frame, label, (x, y-10), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                    cv2.rectangle(frame, (x, y), (x+w, y+h), color, 3)
            
            except Exception as e:
                print(f"Lỗi xử lý khuôn mặt: {e}")
        
        # Hiển thị số khuôn mặt phát hiện được
        cv2.putText(frame, f"Faces: {len(faces)}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        cv2.imshow('VisionGate - Camera AI', frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('r'):
            print("Đang reload danh sách nhân viên...")
            load_employees_from_backend()
    
    cap.release()
    cv2.destroyAllWindows()
    print("Đã tắt Camera Service")

if __name__ == "__main__":
    main()