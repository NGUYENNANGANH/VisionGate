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
function ProfileTab({ user }) {
  const hue = getHue(user?.fullName);
  return (
    <div className="card settings-card">
      <h3 style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Hồ sơ cá nhân</h3>
      <p style={{ fontSize: 13.5, color: "var(--ink-3)", margin: "0 0 24px" }}>Thông tin tài khoản của bạn trong hệ thống</p>

      {/* Avatar header */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid var(--border-2)" }}>
        <div style={{
          width: 72, height: 72, borderRadius: 18, flexShrink: 0,
          background: `linear-gradient(135deg, hsl(${hue} 55% 55%), hsl(${hue + 30} 60% 45%))`,
          display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 26,
          boxShadow: "0 8px 20px -8px rgba(14,163,158,.35)",
        }}>
          {getInitials(user?.fullName)}
        </div>
        <div>
          <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 20, color: "var(--ink)" }}>
            {user?.fullName || "Administrator"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span className="badge badge-teal">{roleLabel(user?.role)}</span>
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{user?.email || ""}</span>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="field">
          <label>Họ và tên</label>
          <input className="input" defaultValue={user?.fullName} disabled />
        </div>
        <div className="field">
          <label>Email</label>
          <input className="input" defaultValue={user?.email} disabled />
        </div>
        <div className="field">
          <label>Tên đăng nhập</label>
          <input className="input" defaultValue={user?.username || user?.fullName} disabled />
        </div>
        <div className="field">
          <label>Vai trò</label>
          <input className="input" defaultValue={roleLabel(user?.role)} disabled />
        </div>
      </div>

      <p style={{ marginTop: 16, fontSize: 12.5, color: "var(--ink-4)" }}>
        Để thay đổi thông tin, vui lòng liên hệ quản trị viên hệ thống.
      </p>
    </div>
  );
}

/* ── Tab 2: Bảo mật ── */
function SecurityTab() {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
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
    <div className="card settings-card">
      <h3 style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Bảo mật & Mật khẩu</h3>
      <p style={{ fontSize: 13.5, color: "var(--ink-3)", margin: "0 0 24px" }}>Đảm bảo tài khoản dùng mật khẩu mạnh để bảo vệ hệ thống</p>

      {msg.text && (
        <div className={msg.ok ? "alert-success" : "alert-danger"} style={{ marginBottom: 20 }}>{msg.text}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Mật khẩu hiện tại</label>
          <div style={{ position: "relative" }}>
            <Icon name="lock" size={16} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }} />
            <input className="input" style={{ paddingLeft: 40 }} type="password"
              value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} placeholder="••••••••" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Mật khẩu mới</label>
            <div style={{ position: "relative" }}>
              <Icon name="lock" size={16} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }} />
              <input className="input" style={{ paddingLeft: 40 }} type="password"
                value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} placeholder="••••••••" />
            </div>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Xác nhận mật khẩu mới</label>
            <div style={{ position: "relative" }}>
              <Icon name="lock" size={16} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }} />
              <input className="input" style={{ paddingLeft: 40 }} type="password"
                value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••••" />
            </div>
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          <Icon name="check" size={16} stroke={2.6} />
          {loading ? "Đang lưu..." : "Đổi mật khẩu"}
        </button>
      </form>
    </div>
  );
}

function ProfilePage() {
  const [user] = useState(() => authService.getUser());
  const [tab, setTab] = useState("profile");
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
            <div className="page-head">
              <div>
                <h1 className="page-title">Tài khoản của tôi</h1>
                <p className="page-sub">Hồ sơ cá nhân và bảo mật</p>
              </div>
            </div>

            <div>
              <div className="tabs" style={{ marginBottom: 22 }}>
                  <button className={`tab ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")}>
                    <Icon name="user" size={15} /> Hồ sơ cá nhân
                  </button>
                  <button className={`tab ${tab === "security" ? "active" : ""}`} onClick={() => setTab("security")}>
                    <Icon name="lock" size={15} /> Bảo mật
                  </button>
                </div>

              {tab === "profile" && <ProfileTab user={user} />}
              {tab === "security" && <SecurityTab />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
