import { useState } from "react";
import { User, Shield, Server, Bell, Key } from "lucide-react";
import { authService } from "../services/authService";
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
// ...existing code...

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
          {user.role === "Admin" || user.role === "SuperAdmin" ? (
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
          {activeTab === "system" && (
            <div className="settings-section">
              <p>Chức năng đang phát triển...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default SettingsPage;
