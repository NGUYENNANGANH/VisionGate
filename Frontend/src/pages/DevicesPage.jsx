import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Wifi, WifiOff, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import "./DevicesPage.css";

function DevicesPage() {
  const [user] = useState(() => authService.getUser());
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [formData, setFormData] = useState({
    deviceCode: "",
    deviceName: "",
    location: "",
    ipAddress: "",
    isOnline: true,
  });
  const navigate = useNavigate();

  const loadDevices = async () => {
    try {
      setLoading(true);
      const response = await api.get("/devices");
      setDevices(response.data);
    } catch (error) {
      console.error("Failed to load devices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const handleAdd = () => {
    setSelectedDevice(null);
    setFormData({ deviceCode: "", deviceName: "", location: "", ipAddress: "", isOnline: true });
    setShowModal(true);
  };

  const handleEdit = (device) => {
    setSelectedDevice(device);
    setFormData({
      deviceCode: device.deviceCode,
      deviceName: device.deviceName,
      location: device.location,
      ipAddress: device.ipAddress || "",
      isOnline: device.isOnline,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa thiết bị này?")) return;
    try {
      await api.delete(`/devices/${id}`);
      loadDevices();
    } catch (error) {
      console.error("Failed to delete device:", error);
      alert("Không thể xóa thiết bị. Vui lòng thử lại.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selectedDevice) {
        await api.put(`/devices/${selectedDevice.deviceId}`, { ...formData, deviceId: selectedDevice.deviceId });
      } else {
        await api.post("/devices", formData);
      }
      setShowModal(false);
      loadDevices();
    } catch (error) {
      console.error("Failed to save device:", error);
      alert(error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

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
                <h1 className="page-title">Quản lý thiết bị</h1>
                <p className="page-sub">Cấu hình camera AI và thiết bị kiểm soát ra vào</p>
              </div>
              <button className="btn btn-primary" onClick={handleAdd}>
                <Plus size={20} /> Thêm thiết bị mới
              </button>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>Đang tải...</div>
            ) : (
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))" }}>
                {devices.map((d) => (
                  <div key={d.deviceId} className="card" style={{ overflow: "hidden", padding: 0 }}>
                    {/* Camera preview */}
                    <div style={{ position: "relative" }}>
                      {d.isOnline ? (
                        <div style={{ height: 168, background: "linear-gradient(135deg,#1a2230,#0e1420)", borderRadius: "18px 18px 0 0", display: "grid", placeItems: "center" }}>
                          <Wifi size={32} style={{ color: "rgba(14,163,158,.5)" }} />
                        </div>
                      ) : (
                        <div style={{ height: 168, background: "linear-gradient(135deg,#1a2230,#0e1420)", display: "grid", placeItems: "center", position: "relative", borderRadius: "18px 18px 0 0" }}>
                          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg,rgba(255,255,255,.018) 0 14px,transparent 14px 28px)", borderRadius: "18px 18px 0 0" }} />
                          <div style={{ textAlign: "center", color: "rgba(255,255,255,.35)", position: "relative" }}>
                            <WifiOff size={34} style={{ color: "rgba(226,59,84,.6)" }} />
                            <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 8, letterSpacing: ".04em" }}>KHÔNG CÓ TÍN HIỆU</div>
                          </div>
                        </div>
                      )}
                      {/* Status badge */}
                      <div style={{ position: "absolute", top: 12, left: 12 }}>
                        <span className={`badge ${d.isOnline ? "badge-green" : "badge-red"}`}
                          style={{ background: d.isOnline ? "rgba(21,163,90,.92)" : "rgba(226,59,84,.92)", color: "#fff" }}>
                          <span className="bdot" style={{ background: "#fff" }} />
                          {d.isOnline ? "ONLINE" : "OFFLINE"}
                        </span>
                      </div>
                      {/* Edit/Delete overlay */}
                      <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6 }}>
                        <button style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.12)", color: "#fff", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", cursor: "pointer" }}
                          onClick={() => handleEdit(d)}><Edit size={15} /></button>
                        <button style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.12)", color: "#fff", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", cursor: "pointer" }}
                          onClick={() => handleDelete(d.deviceId)}><Trash2 size={15} /></button>
                      </div>
                    </div>
                    {/* Card body */}
                    <div style={{ padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                          {d.isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
                        </div>
                        <div>
                          <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 16 }}>{d.deviceName}</div>
                          <span className="chip-mono">#{d.deviceCode}</span>
                        </div>
                      </div>
                      <div style={{ marginTop: 15, display: "grid", gap: 9 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--ink-2)" }}>
                          <MapPin size={15} style={{ color: "var(--ink-3)" }} />{d.location}
                        </div>
                        {d.ipAddress && (
                          <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--ink-2)" }}>
                            <span className="mono" style={{ fontSize: 12.5 }}>IP {d.ipAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add new card */}
                <button className="card"
                  style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, border: "2px dashed var(--border)", background: "transparent", minHeight: 280, color: "var(--ink-3)", transition: "border .15s,color .15s", width: "100%", cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary-700)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--ink-3)"; }}
                  onClick={handleAdd}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--surface-3)", display: "grid", placeItems: "center" }}>
                    <Plus size={24} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>Thêm camera mới</div>
                  <div style={{ fontSize: 12.5, textAlign: "center", maxWidth: 200 }}>Kết nối camera AI để bắt đầu giám sát ra vào</div>
                </button>
              </div>
            )}

            {/* Modal */}
            {showModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(13,21,38,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
                onClick={() => setShowModal(false)}>
                <div style={{ background: "var(--surface)", padding: "32px 28px", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-lg)", width: 460, maxWidth: "calc(100vw - 32px)" }}
                  onClick={(e) => e.stopPropagation()}>
                  <h2 style={{ margin: "0 0 24px", fontFamily: "var(--display)", fontSize: 20, color: "var(--ink)" }}>
                    {selectedDevice ? "Cập nhật thiết bị" : "Thêm thiết bị mới"}
                  </h2>
                  <form onSubmit={handleSave}>
                    <div className="field">
                      <label>MÃ THIẾT BỊ *</label>
                      <input className="input" type="text" value={formData.deviceCode}
                        onChange={(e) => setFormData({ ...formData, deviceCode: e.target.value })}
                        required placeholder="CAM-001" />
                    </div>
                    <div className="field">
                      <label>TÊN THIẾT BỊ *</label>
                      <input className="input" type="text" value={formData.deviceName}
                        onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                        required placeholder="Camera cổng chính" />
                    </div>
                    <div className="field">
                      <label>VỊ TRÍ *</label>
                      <input className="input" type="text" value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        required placeholder="Cổng vào chính - Tầng 1" />
                    </div>
                    <div className="field">
                      <label>ĐỊA CHỈ IP</label>
                      <input className="input" type="text" value={formData.ipAddress}
                        onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                        placeholder="192.168.1.100" />
                    </div>
                    <div className="field">
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input type="checkbox" checked={formData.isOnline}
                          onChange={(e) => setFormData({ ...formData, isOnline: e.target.checked })} />
                        <span>Thiết bị hoạt động</span>
                      </label>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                      <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                      <button type="submit" className="btn btn-primary">
                        {selectedDevice ? "Cập nhật" : "Thêm thiết bị"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DevicesPage;
