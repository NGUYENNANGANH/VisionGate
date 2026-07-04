"""Script kiểm tra embedding dimension trong DB."""
import requests
import base64
import struct

import os
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5212/api/employees")

def check():
    try:
        res = requests.get(BACKEND_URL, timeout=5)
        res.raise_for_status()
        employees = res.json()
    except Exception as e:
        print(f"Loi ket noi backend: {e}")
        return

    print(f"Total employees: {len(employees)}")
    print("-" * 60)

    for emp in employees:
        emp_id = emp.get("employeeId")
        name = emp.get("fullName", "???")
        emb = emp.get("faceEmbedding", "")
        img = emp.get("faceImageUrl", "")

        if emb:
            try:
                b = base64.b64decode(emb)
                dim = len(b) // 4
                status = "OK (512)" if dim == 512 else f"WRONG ({dim}-dim)"
            except Exception:
                status = "DECODE ERROR"
        else:
            status = "NO EMBEDDING"

        has_img = "yes" if img else "no"
        safe_name = name.encode('ascii', errors='replace').decode('ascii')
        print(f"  ID={emp_id} | {safe_name[:20]:<20} | emb={status} | img={has_img}")

if __name__ == "__main__":
    check()
