"""Debug: xem raw JSON employee va test PUT endpoint."""
import requests
import base64
import struct
import json
import sys
import io

# Force UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5212/api/employees")
FACE_API_URL = os.getenv("FACE_API_URL", "http://localhost:8000/api/encode")

def debug():
    res = requests.get(BACKEND_URL, timeout=5)
    employees = res.json()
    emp = employees[0]

    print("=== RAW JSON employee[0] ===")
    print(json.dumps(emp, indent=2, ensure_ascii=True))
    print()

    emp_id = emp.get("employeeId")
    image_url = emp.get("faceImageUrl")

    if not image_url:
        print("Khong co anh!")
        return

    print(f"Encoding anh tu: {image_url}")
    encode_res = requests.post(FACE_API_URL, json={"url": image_url}, timeout=30)
    encode_data = encode_res.json()

    if not encode_data.get("Success"):
        print(f"Encode that bai: {encode_data.get('Message')}")
        return

    embedding_floats = encode_data["Embedding"]
    print(f"Embedding dim: {len(embedding_floats)}")

    byte_data = struct.pack(f'{len(embedding_floats)}f', *embedding_floats)
    b64_embedding = base64.b64encode(byte_data).decode('utf-8')

    emp["faceEmbedding"] = b64_embedding

    print(f"\nGoi PUT toi {BACKEND_URL}/{emp_id}")
    put_res = requests.put(f"{BACKEND_URL}/{emp_id}", json=emp, timeout=10)
    print(f"PUT Status: {put_res.status_code}")
    print(f"PUT Response: {put_res.text[:300]}")

    # Verify GET all
    print("\nVerify: GET all employees...")
    all_res = requests.get(BACKEND_URL, timeout=5)
    all_emps = all_res.json()
    for e in all_emps:
        if e.get("employeeId") == emp_id:
            emb = e.get("faceEmbedding", "")
            if emb:
                b = base64.b64decode(emb)
                dim = len(b) // 4
                print(f"faceEmbedding sau PUT: {dim}-dim -> {'OK!' if dim == 512 else 'WRONG!'}")
            else:
                print("RESULT: van TRONG sau PUT - endpoint co the khong luu faceEmbedding!")
            break

    # Also try GET by ID
    print(f"\nThu GET /api/employees/{emp_id}...")
    single_res = requests.get(f"{BACKEND_URL}/{emp_id}", timeout=5)
    print(f"GET by ID status: {single_res.status_code}")

if __name__ == "__main__":
    debug()
