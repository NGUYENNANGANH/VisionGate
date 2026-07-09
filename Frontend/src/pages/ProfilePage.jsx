import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import "./SettingsPage.css";

const getInitials = (name = "") => name.trim().split(/\s+/).slice(-2).map(w => w[0]).join("").toUpperCase();
const getHue = (name = "") => name.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
const roleLabel = (role) =>
  role === 0 || role === "SuperAdmin" ? "Super Admin" :
  role === 1 || role === "Admin" ? "HR Admin" : "Viewer";

/* ── Tab 1: Hồ sơ ── */
function ProfileTab({ user, onOpenPasswordModal }) {
  const hue = getHue(user?.fullName);
  return (
    <div className="card settings-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Hồ sơ cá nhân</h3>
        </div>
        <button className="btn" onClick={onOpenPasswordModal} style={{ background: "var(--surface)", border: "1px solid var(--border-2)", color: "var(--ink)", fontWeight: 600, fontSize: 13.5, padding: "8px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
          <Icon name="history" size={15} stroke={2.2} /> Đổi mật khẩu
        </button>
      </div>

      {/* Avatar header */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid var(--border-2)" }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%", flexShrink: 0,
          background: "#c01736", border: "4px solid #fbe5e9",
          display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 28,
        }}>
          {getInitials(user?.fullName)}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 18, color: "var(--ink)" }}>
              {user?.fullName || "Administrator"}
            </div>
            <span className="badge badge-teal" style={{ textTransform: "uppercase", fontSize: 10, fontWeight: 700, padding: "3px 10px" }}>
              {roleLabel(user?.role)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, color: "var(--ink-3)", fontSize: 13 }}>
            <Icon name="mail" size={14} /> {user?.email || "admin@visiongate.com"}
          </div>
        </div>
      </div>

      {/* Fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="field">
          <label>Họ và tên</label>
          <input className="input" defaultValue={user?.fullName} disabled style={{ background: "var(--surface-2)", color: "var(--ink-2)", borderColor: "var(--border-2)" }} />
        </div>
        <div className="field">
          <label>Email</label>
          <input className="input" defaultValue={user?.email} disabled style={{ background: "var(--surface-2)", color: "var(--ink-2)", borderColor: "var(--border-2)" }} />
        </div>
        <div className="field">
          <label>Tên đăng nhập</label>
          <input className="input" defaultValue={user?.username || user?.fullName} disabled style={{ background: "var(--surface-2)", color: "var(--ink-2)", borderColor: "var(--border-2)" }} />
        </div>
        <div className="field">
          <label>Vai trò</label>
          <input className="input" defaultValue={roleLabel(user?.role)} disabled style={{ background: "var(--surface-2)", color: "var(--ink-2)", borderColor: "var(--border-2)" }} />
        </div>
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid var(--border-2)", display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-4)", fontStyle: "italic" }}>
        <Icon name="info" size={14} /> Để thay đổi thông tin, vui lòng liên hệ quản trị viên hệ thống.
      </div>
    </div>
  );
}

/* ── Tab 2: Bảo mật ── */
function ChangePasswordModal({ onClose }) {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", ok: true });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pw.current || !pw.next) return setMsg({ text: "Vui lòng điền đầy đủ thông tin.", ok: false });
    if (pw.next !== pw.confirm) return setMsg({ text: "Mật khẩu xác nhận không khớp.", ok: false });
    if (pw.next.length < 6) return setMsg({ text: "Mật khẩu mới phải có ít nhất 6 ký tự.", ok: false });
    setLoading(true); setMsg({ text: "", ok: true });
    try {
      await authService.changePassword(pw.current, pw.next);
      setMsg({ text: "Đổi mật khẩu thành công!", ok: true });
      setPw({ current: "", next: "", confirm: "" });
    } catch (err) {
      setMsg({ text: err.response?.data?.message || "Mật khẩu hiện tại không đúng.", ok: false });
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content fade-in" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: 18, fontFamily: "var(--display)" }}>Đổi mật khẩu</h3>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="modal-body" style={{ padding: "20px 24px" }}>
          <p style={{ fontSize: 13.5, color: "var(--ink-3)", margin: "0 0 24px" }}>Cập nhật mật khẩu mới để bảo vệ tài khoản của bạn</p>
          
          {msg.text && (
            <div className={msg.ok ? "alert-success" : "alert-danger"} style={{ marginBottom: 20 }}>{msg.text}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field" style={{ marginBottom: 20 }}>
              <label>Mật khẩu hiện tại</label>
              <div className="input-icon">
                <Icon name="lock" size={17} />
                <input className="input login-pass-input" style={{ paddingLeft: 40 }} type={showPasswords ? "text" : "password"}
                  value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} placeholder="••••••••" />
                <button type="button" className="login-pass-toggle" onClick={() => setShowPasswords(s => !s)}>
                  <Icon name={showPasswords ? "eye_off" : "eye"} size={17} />
                </button>
              </div>
            </div>

            <div className="field" style={{ marginBottom: 20 }}>
              <label>Mật khẩu mới</label>
              <div className="input-icon">
                <Icon name="lock" size={17} />
                <input className="input login-pass-input" style={{ paddingLeft: 40 }} type={showPasswords ? "text" : "password"}
                  value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} placeholder="••••••••" />
                <button type="button" className="login-pass-toggle" onClick={() => setShowPasswords(s => !s)}>
                  <Icon name={showPasswords ? "eye_off" : "eye"} size={17} />
                </button>
              </div>
            </div>

            <div className="field" style={{ marginBottom: 24 }}>
              <label>Xác nhận mật khẩu mới</label>
              <div className="input-icon">
                <Icon name="lock" size={17} />
                <input className="input login-pass-input" style={{ paddingLeft: 40 }} type={showPasswords ? "text" : "password"}
                  value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••••" />
                <button type="button" className="login-pass-toggle" onClick={() => setShowPasswords(s => !s)}>
                  <Icon name={showPasswords ? "eye_off" : "eye"} size={17} />
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32 }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>Hủy</button>
              <button className="btn btn-primary" type="submit" disabled={loading} style={{ minWidth: 140 }}>
                <Icon name="check" size={16} stroke={2.6} />
                {loading ? "Đang lưu..." : "Xác nhận đổi"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ProfilePage() {
  const [user] = useState(() => authService.getUser());
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const navigate = useNavigate();
  const handleLogout = () => { authService.logout(); navigate("/login"); };
  if (!user) return null;

  return (
    <div className="dashboard-container">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="main">
        <Header onLogout={handleLogout} />
        <div className="page">
          <div className="page-inner fade-in">
            <div className="page-head" style={{ marginBottom: 32 }}>
              <div>
                <h1 className="page-title">Tài khoản của tôi</h1>
              </div>
            </div>

            <div>
              <ProfileTab user={user} onOpenPasswordModal={() => setShowPasswordModal(true)} />
            </div>
          </div>
        </div>
      </div>
      
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}

export default ProfilePage;
