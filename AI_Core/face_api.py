from fastapi import FastAPI
from pydantic import BaseModel
from deepface import DeepFace
import requests
from io import BytesIO
import os
import tempfile

app = FastAPI()

class ImageUrl(BaseModel):
    url: str

@app.post("/api/encode")
async def encode_face(data: ImageUrl):
    temp_path = None
    try:
        # 1. Tải ảnh từ URL
        response = requests.get(data.url, timeout=10)
        if response.status_code != 200:
            return {
                "Success": False,
                "Message": f"Không thể tải ảnh từ URL. Status: {response.status_code}"
            }

        # 2. Lưu ảnh tạm thời
        temp_path = tempfile.mktemp(suffix=".jpg")
        with open(temp_path, "wb") as f:
            f.write(response.content)

        # 3. Trích xuất Face Embedding bằng DeepFace (FaceNet512 model)
        # FaceNet512 tạo vector 512 chiều (tốt hơn face_recognition 128 chiều)
        embedding_objs = DeepFace.represent(
            img_path=temp_path,
            model_name="Facenet512",
            enforce_detection=False,
            detector_backend="opencv"
        )
        
        if len(embedding_objs) > 0:
            embedding = embedding_objs[0]["embedding"]
            return {
                "Success": True,
                "Embedding": embedding,
                "Message": f"Thành công! Vector {len(embedding)} chiều"
            }
        else:
            return {
                "Success": False,
                "Message": "Không tìm thấy khuôn mặt trong ảnh"
            }

    except ValueError as e:
        if "Face could not be detected" in str(e):
            return {
                "Success": False,
                "Message": "Không phát hiện khuôn mặt. Vui lòng chụp ảnh rõ mặt người."
            }
        return {
            "Success": False,
            "Message": f"Lỗi: {str(e)}"
        }
    except Exception as e:
        return {
            "Success": False,
            "Message": f"Lỗi xử lý ảnh: {str(e)}"
        }
    finally:
        # Xóa file tạm
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/")
async def root():
    return {
        "service": "VisionGate Face Recognition API",
        "version": "2.0",
        "status": "running",
        "model": "FaceNet512"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Chạy: uvicorn face_api:app --host 0.0.0.0 --port 5000 --reload