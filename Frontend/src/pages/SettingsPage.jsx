import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import "./SettingsPage.css";

/* ── Tab: Cấu hình ca làm ── */
function ShiftTab() {
  const [shiftStart, setShiftStart] = useState("08:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", ok: true });

  useEffect(() => {
    api.get("/settings").then(res => {
      const start = res.data.find(x => x.key === "Shift:StartTime");
      const end = res.data.find(x => x.key === "Shift:EndTime");
      if (start) setShiftStart(start.value);
      if (end) setShiftEnd(end.value);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg({ text: "", ok: true });
    const save = async (key, value, desc) => {
      try { await api.put(`/settings/${key}`, { value }); }
      catch (err) {
        if (err.response?.status === 404) await api.post("/settings", { key, value, description: desc });
        else throw err;
      }
    };
    try {
      await save("Shift:StartTime", shiftStart, "Giờ bắt đầu ca làm");
      await save("Shift:EndTime", shiftEnd, "Giờ kết thúc ca làm");
      setMsg({ text: "Lưu cấu hình ca làm thành công!", ok: true });
    } catch { setMsg({ text: "Lỗi khi lưu cấu hình. Vui lòng thử lại.", ok: false }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="card settings-card" style={{ color: "var(--ink-3)" }}>Đang tải cấu hình...</div>;

  return (
    <div className="card settings-card">
      <h3 style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Cấu hình ca làm việc</h3>
      <p style={{ fontSize: 13.5, color: "var(--ink-3)", margin: "0 0 24px" }}>
        Hệ thống dùng thông tin này để tính <strong>Đi muộn</strong> và <strong>Về sớm</strong> trong báo cáo chấm công.
      </p>

      {msg.text && (
        <div className={msg.ok ? "alert-success" : "alert-danger"} style={{ marginBottom: 20 }}>{msg.text}</div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--ink-2)" }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--green)", display: "inline-block" }} />
              Giờ bắt đầu ca (Check-in)
            </div>
            <div style={{ position: "relative" }}>
              <Icon name="clock" size={16} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }} />
              <input className="input" style={{ paddingLeft: 40 }} type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)} />
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 6 }}>Nhân viên đến sau giờ này bị tính Đi muộn</div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--ink-2)" }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--red)", display: "inline-block" }} />
              Giờ kết thúc ca (Check-out)
            </div>
            <div style={{ position: "relative" }}>
              <Icon name="clock" size={16} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }} />
              <input className="input" style={{ paddingLeft: 40 }} type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} />
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 6 }}>Nhân viên về trước giờ này bị tính Về sớm</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 12, background: "var(--blue-soft)", border: "1px solid rgba(47,107,240,.18)", marginBottom: 22 }}>
          <Icon name="logs" size={18} style={{ color: "var(--blue)", flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
            Mỗi lần nhân viên quét mặt tạo 1 bản ghi gốc. Báo cáo tự lấy <strong>lần quét đầu tiên</strong> làm Check-in và <strong>lần quét cuối cùng</strong> làm Check-out cho mỗi người trong ngày.
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={saving}>
          <Icon name="save" size={16} />
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </form>
    </div>
  );
}

function SettingsPage() {
  const [user] = useState(() => authService.getUser());
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
                <h1 className="page-title">Cấu hình hệ thống</h1>
                <p className="page-sub">Thiết lập các tham số hoạt động của toàn hệ thống</p>
              </div>
            </div>

            <div>
              <ShiftTab />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
