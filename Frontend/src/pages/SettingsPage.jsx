import { useState, useEffect } from "react";
import { User, Shield, Server, Bell, Key, Clock, Save, CheckCircle } from "lucide-react";
import { authService } from "../services/authService";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import "./SettingsPage.css";

// Placeholder Components
const ProfileSettings = ({ user }) => (
  <div className="settings-section">
    <h3>Thông tin cá nhân</h3>
    <div className="form-group">
      <label>Họ và tên</label>
      <input
        type="text"
        defaultValue={user.fullName}
        disabled
        className="form-input"
      />
    </div>
    <div className="form-group">
      <label>Email</label>
      <input
        type="email"
        defaultValue={user.email}
        disabled
        className="form-input"
      />
    </div>
    <div className="form-group">
      <label>Vai trò</label>
      <input
        type="text"
        defaultValue={user.role}
        disabled
        className="form-input"
      />
    </div>
  </div>
);

// ...existing imports...

const SecuritySettings = () => {
  const [passwords, setPasswords] = useState({ current: "", new: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwords.current || !passwords.new) {
      setMessage({ text: "Vui lòng nhập đầy đủ thông tin", type: "error" });
      return;
    }

    setLoading(true);
    setMessage({ text: "", type: "" }); // Clear message

    try {
      await authService.changePassword(passwords.current, passwords.new);
      setMessage({ text: "Đổi mật khẩu thành công!", type: "success" });
      setPasswords({ current: "", new: "" });
    } catch (error) {
      console.error(error);
      setMessage({
        text:
          error.response?.data?.message ||
          "Mật khẩu hiện tại không đúng hoặc lỗi hệ thống",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-section">
      <h3>Bảo mật & Mật khẩu</h3>
      {message.text && (
        <div
          className={`alert ${message.type === "error" ? "alert-danger" : "alert-success"}`}
          style={{
            padding: "10px",
            borderRadius: "6px",
            marginBottom: "16px",
            background: message.type === "error" ? "#fee2e2" : "#dcfce7",
            color: message.type === "error" ? "#dc2626" : "#16a34a",
          }}
        >
          {message.text}
        </div>
      )}
      <form onSubmit={handleChangePassword}>
        <div className="form-group">
          <label>Mật khẩu hiện tại</label>
          <input
            type="password"
            value={passwords.current}
            onChange={(e) =>
              setPasswords({ ...passwords, current: e.target.value })
            }
            placeholder="••••••••"
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Mật khẩu mới</label>
          <input
            type="password"
            value={passwords.new}
            onChange={(e) =>
              setPasswords({ ...passwords, new: e.target.value })
            }
            placeholder="••••••••"
            className="form-input"
          />
        </div>
        <button
          className="btn-primary"
          style={{ marginTop: "16px" }}
          disabled={loading}
        >
          {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
        </button>
      </form>
    </div>
  );
};

const ShiftSettings = () => {
  const [shiftStart, setShiftStart] = useState("08:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    loadShiftSettings();
  }, []);

  const loadShiftSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/settings");
      const settings = res.data;
      const start = settings.find((s) => s.key === "Shift:StartTime");
      const end = settings.find((s) => s.key === "Shift:EndTime");
      if (start) setShiftStart(start.value);
      if (end) setShiftEnd(end.value);
    } catch (err) {
      console.error("Failed to load shift settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      // Try to update existing or create new settings
      const saveKey = async (key, value) => {
        try {
          await api.put(`/settings/${key}`, { value });
        } catch (err) {
          if (err.response?.status === 404) {
            await api.post("/settings", { key, value, description: key === "Shift:StartTime" ? "Giờ bắt đầu ca làm" : "Giờ kết thúc ca làm" });
          } else {
            throw err;
          }
        }
      };

      await saveKey("Shift:StartTime", shiftStart);
      await saveKey("Shift:EndTime", shiftEnd);
      setMessage({ text: "Lưu cấu hình ca làm thành công!", type: "success" });
    } catch (err) {
      console.error(err);
      setMessage({ text: "Lỗi khi lưu cấu hình. Vui lòng thử lại.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="settings-section"><p>Đang tải cấu hình...</p></div>;

  return (
    <div className="settings-section">
      <h3><Clock size={20} style={{ verticalAlign: "middle", marginRight: 8 }} />Cấu hình Ca làm việc (Shift Setup)</h3>
      <p style={{ color: "#6b7280", marginBottom: "1.2rem", fontSize: "0.9rem" }}>
        Cấu hình giờ bắt đầu và kết thúc ca làm. Hệ thống sẽ dùng thông tin này để tính toán <strong>Đi muộn</strong> và <strong>Về sớm</strong> trong báo cáo chấm công.
      </p>

      {message.text && (
        <div style={{
          padding: "10px 14px",
          borderRadius: "6px",
          marginBottom: "16px",
          background: message.type === "error" ? "#fee2e2" : "#dcfce7",
          color: message.type === "error" ? "#dc2626" : "#16a34a",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          {message.type === "success" && <CheckCircle size={16} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          <div className="form-group" style={{ flex: "1", minWidth: "200px" }}>
            <label>🟢 Giờ bắt đầu ca (Check-in)</label>
            <input
              type="time"
              value={shiftStart}
              onChange={(e) => setShiftStart(e.target.value)}
              className="form-input"
              style={{ fontSize: "1.1rem", padding: "10px 14px" }}
            />
            <small style={{ color: "#9ca3af" }}>Nhân viên đến sau giờ này sẽ bị tính <b>Đi muộn</b></small>
          </div>
          <div className="form-group" style={{ flex: "1", minWidth: "200px" }}>
            <label>🔴 Giờ kết thúc ca (Check-out)</label>
            <input
              type="time"
              value={shiftEnd}
              onChange={(e) => setShiftEnd(e.target.value)}
              className="form-input"
              style={{ fontSize: "1.1rem", padding: "10px 14px" }}
            />
            <small style={{ color: "#9ca3af" }}>Nhân viên về trước giờ này sẽ bị tính <b>Về sớm</b></small>
          </div>
        </div>

        <div style={{
          marginTop: "20px",
          padding: "14px 18px",
          background: "#f0f9ff",
          borderRadius: "8px",
          border: "1px solid #bae6fd",
          fontSize: "0.88rem",
          color: "#0369a1"
        }}>
          <strong>ℹ️ Lưu ý:</strong> Mỗi lần nhân viên quét mặt sẽ tạo 1 bản ghi gốc (Raw Log). Khi xuất báo cáo, hệ thống tự động lấy <b>lần quét đầu tiên</b> làm Check-in và <b>lần quét cuối cùng</b> làm Check-out cho mỗi người trong ngày.
        </div>

        <button
          className="btn-primary"
          style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "8px" }}
          disabled={saving}
        >
          <Save size={16} />
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </form>
    </div>
  );
};

function SettingsPage() {
  const [user] = useState(() => authService.getUser());
  const [activeTab, setActiveTab] = useState("profile");
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div className="settings-container">
      <Sidebar user={user} />

      <main className="settings-content">
        <Header onLogout={handleLogout} />

        <div className="page-header">
          <div>
            <h1>Cài đặt hệ thống</h1>
            <p className="page-description">
              Quản lý tài khoản và cấu hình ứng dụng
            </p>
          </div>
        </div>

        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <User size={18} /> Thông tin cá nhân
          </button>
          <button
            className={`tab-btn ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            <Key size={18} /> Bảo mật
          </button>
          {user.role === "0" || user.role === "SuperAdmin" ? (
            <button
              className={`tab-btn ${activeTab === "system" ? "active" : ""}`}
              onClick={() => setActiveTab("system")}
            >
              <Server size={18} /> Cấu hình hệ thống
            </button>
          ) : null}
        </div>

        <div className="settings-body">
          {activeTab === "profile" && <ProfileSettings user={user} />}
          {activeTab === "security" && <SecuritySettings />}
          {activeTab === "system" && <ShiftSettings />}
        </div>
      </main>
    </div>
  );
}

export default SettingsPage;
