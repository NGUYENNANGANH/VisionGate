# VisionGate

Hệ thống điểm danh khuôn mặt và giám sát an toàn lao động (PPE) theo thời gian thực, sử dụng AI.

## Tổng quan

VisionGate tích hợp nhận diện khuôn mặt và phát hiện trang bị bảo hộ lao động (PPE) qua camera IP để tự động điểm danh nhân công và cảnh báo vi phạm an toàn trên công trường.

**Tính năng chính:**
- Điểm danh tự động qua nhận diện khuôn mặt (RetinaFace + ArcFace)
- Phát hiện vi phạm PPE theo thời gian thực (YOLO) — mũ bảo hộ, găng tay, áo phản quang, ủng, khẩu trang
- Live feed camera với bounding box overlay
- Dashboard thống kê, báo cáo chấm công, xuất Excel
- Cảnh báo vi phạm realtime qua SignalR
- Phân quyền 3 cấp: SuperAdmin / Admin / Viewer

---

## Kiến trúc hệ thống

```
ReactJS (Frontend)
    │  REST API + SignalR
    ▼
ASP.NET Core 8 (Backend)  ──── SQL Server (Database)
    │  HTTP nội bộ
    ▼
FastAPI (AI Service)
    └── InsightFace (RetinaFace + ArcFace buffalo_l)
    └── YOLO (PPE Detection)
```

---

## Công nghệ sử dụng

| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| Backend | ASP.NET Core | 8.0 |
| ORM | Entity Framework Core | 8.0.8 |
| Database | SQL Server | 2019+ |
| Realtime | SignalR | (tích hợp ASP.NET Core) |
| Auth | JWT Bearer | — |
| Frontend | ReactJS + Vite | 18+ |
| AI Service | FastAPI + Python | — |
| Face Detection | RetinaFace (InsightFace buffalo_l) | — |
| Face Recognition | ArcFace 512D embedding | — |
| PPE Detection | YOLO | — |
| Report | ClosedXML (Excel export) | 0.104.2 |

---

## Cấu trúc thư mục

```
VisionGate/
├── Backend/                  # ASP.NET Core API
│   ├── Controllers/          # Auth, Employees, CheckIns, Violations, Dashboard, Reports...
│   ├── Models/               # Entity models (User, Employee, CheckInRecord, ...)
│   ├── Services/             # Business logic
│   ├── Repositories/         # Data access layer
│   ├── Hubs/                 # SignalR hub
│   ├── DTOs/                 # Request/Response objects
│   ├── Migrations/           # EF Core migrations
│   └── Program.cs
├── Frontend/                 # ReactJS app
│   └── src/
│       ├── pages/            # Dashboard, Employees, Devices, Violations, Reports...
│       ├── components/       # UI components, layout, auth guards
│       └── services/         # API calls, SignalR, auth
└── AI_Core/                  # FastAPI AI microservice
    └── face_api.py           # RetinaFace detect + ArcFace encode + YOLO PPE
```

---

## Cài đặt và chạy

### Yêu cầu
- .NET 8 SDK
- Node.js 18+
- SQL Server 2019+
- Python 3.9+

### 1. Database

```bash
cd Backend
dotnet ef database update
```

### 2. Backend (ASP.NET Core)

```bash
cd Backend
dotnet run
# Chạy tại: http://localhost:5212
# Swagger UI: http://localhost:5212/swagger
```

### 3. AI Service (FastAPI)

```bash
cd AI_Core
pip install fastapi uvicorn insightface opencv-python httpx ultralytics
uvicorn face_api:app --host 0.0.0.0 --port 8000
```

### 4. Frontend (ReactJS)

```bash
cd Frontend
npm install
npm run dev
# Chạy tại: http://localhost:5173
```

---

## Phân quyền

| Role | Giá trị | Quyền |
|---|---|---|
| SuperAdmin | 0 | Toàn quyền — quản lý user, thiết bị, cấu hình hệ thống |
| Admin | 1 | Quản lý vận hành, xử lý vi phạm, cấu hình |
| Viewer | 2 | Chỉ xem dashboard, báo cáo, lịch sử điểm danh |

Tài khoản SuperAdmin mặc định được seed khi khởi tạo database.

---

## API chính

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Đăng nhập, trả JWT |
| POST | `/api/auth/users` | SuperAdmin | Tạo tài khoản mới |
| GET | `/api/employees` | Authenticated | Danh sách nhân công |
| POST | `/api/employees/{id}/face` | Authenticated | Đăng ký khuôn mặt |
| GET | `/api/checkins` | Authenticated | Lịch sử điểm danh |
| GET | `/api/violations` | Authenticated | Danh sách vi phạm |
| GET | `/api/dashboard` | Authenticated | Thống kê tổng quan |
| GET | `/api/reports/export` | Authenticated | Xuất báo cáo Excel |
| GET/PUT | `/api/settings` | SuperAdmin, Admin | Cấu hình hệ thống |

Swagger UI đầy đủ tại `http://localhost:5212/swagger`.

---

## Cơ sở dữ liệu

6 bảng chính: `Users`, `Employees`, `Devices`, `CheckInRecords`, `PPEDetections`, `Violations`.

Xem thiết kế chi tiết trong báo cáo đồ án — mục 3.10 Thiết kế cơ sở dữ liệu.
