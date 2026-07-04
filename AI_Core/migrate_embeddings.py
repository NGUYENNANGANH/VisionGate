import requests
import base64
import struct
import time

import os

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5212/api/employees")
FACE_API_URL = os.getenv("FACE_API_URL", "http://localhost:8000/api/encode")

def migrate():
    print("Start migrating embeddings to InsightFace (512-dim ArcFace)...")

    try:
        res = requests.get(BACKEND_URL, timeout=10)
        res.raise_for_status()
        employees = res.json()
    except Exception as e:
        print(f"Error getting employees: {e}")
        return

    print(f"Found {len(employees)} employees.")

    success_count = 0
    fail_count = 0

    for emp in employees:
        emp_id = emp.get("employeeId")
        image_url = emp.get("faceImageUrl")

        if not image_url:
            print(f"Skipping ID {emp_id}: No image.")
            continue

        print(f"Processing ID {emp_id}...")

        try:
            encode_res = requests.post(FACE_API_URL, json={"url": image_url}, timeout=30)
            encode_data = encode_res.json()

            if not encode_data.get("Success"):
                print(f"  Error from Face API: {encode_data.get('Message')}")
                fail_count += 1
                continue

            embedding_floats = encode_data.get("Embedding")
            byte_data = struct.pack(f'{len(embedding_floats)}f', *embedding_floats)
            b64_embedding = base64.b64encode(byte_data).decode('utf-8')

            # H5: re-fetch employee mới nhất ngay trước PUT
            # tránh ghi đè các field đã thay đổi kể từ lần GET đầu
            fresh_res = requests.get(f"{BACKEND_URL}/{emp_id}", timeout=10)
            if fresh_res.status_code == 200:
                emp = fresh_res.json()
            emp["faceEmbedding"] = b64_embedding

            update_res = requests.put(f"{BACKEND_URL}/{emp_id}", json=emp, timeout=10)
            if update_res.status_code in [200, 204]:
                print(f"  OK updated 512-dim embedding.")
                success_count += 1
            else:
                print(f"  Error from Backend: {update_res.status_code}")
                fail_count += 1

        except Exception as e:
            print(f"  Error processing: {e}")
            fail_count += 1

        time.sleep(0.5)

    print("\n========================================")
    print("MIGRATE COMPLETE!")
    print(f"Success: {success_count}")
    print(f"Fail: {fail_count}")
    print("========================================")

if __name__ == "__main__":
    migrate()
