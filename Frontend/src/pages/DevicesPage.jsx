import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Edit, Trash2, Wifi, WifiOff, MapPin, X, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { AI_CORE_URL } from "../config/constants";
import { uploadService } from "../services/uploadService";
import api from "../services/api";
import signalRService from "../services/signalRService";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import "./DevicesPage.css";

// Canvas-based MJPEG renderer — smooth, flicker-free
function CameraCanvas({ src, style }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(new Image());
  const rafRef = useRef(null);

  useEffect(() => {
    const img = imgRef.current;
    img.src = src;

    const draw = () => {
      const canvas = canvasRef.current;
      if (canvas && img.naturalWidth > 0) {
        const ctx = canvas.getContext("2d");
        // Resize canvas to match video aspect ratio
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        const w = canvas.clientWidth;
        const h = w / aspectRatio;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      img.src = "";
    };
  }, [src]);

  return <canvas ref={canvasRef} style={style} />;
}

function DevicesPage() {
  const [user] = useState(() => authService.getUser());
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [viewingDevice, setViewingDevice] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    deviceCode: "",
    deviceName: "",
    location: "",
    ipAddress: "",
    rtspUsername: "admin",
    rtspPassword: "",
    rtspPort: 554,
    gateDirection: 0,
    isActive: true,
  });
  const navigate = useNavigate();

  const normalizeGateDirection = (gateDirection) => {
    if (gateDirection === "Out" || gateDirection === "out" || gateDirection === 1 || gateDirection === "1") return 1;
    return 0;
  };
  const toGateDirectionPayload = (gateDirection) => normalizeGateDirection(gateDirection) === 1 ? "Out" : "In";
  const getGateLabel = (gateDirection) => normalizeGateDirection(gateDirection) === 1 ? "Cổng ra" : "Cổng vào";
  const getGateBadgeStyle = (gateDirection) => normalizeGateDirection(gateDirection) === 1
    ? { background: "rgba(79, 70, 229, .12)", color: "#4338ca" }
    : { background: "var(--primary-soft)", color: "var(--primary-700)" };

  const loadDevices = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await api.get("/devices");
      setDevices(response.data);
    } catch (error) {
      console.error("Failed to load devices:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    const handleDeviceStatus = (deviceStatus) => {
      const deviceId = deviceStatus?.deviceId ?? deviceStatus?.DeviceId;
      const isActive = deviceStatus?.isActive ?? deviceStatus?.IsActive;
      if (!deviceId || typeof isActive !== "boolean") {
        loadDevices({ silent: true });
        return;
      }

      setDevices((prev) => prev.map((device) => (
        device.deviceId === deviceId ? { ...device, isActive } : device
      )));
    };

    signalRService.on("ReceiveDeviceStatus", handleDeviceStatus);
    signalRService.start().catch(() => {});

    const refreshTimer = window.setInterval(() => {
      loadDevices({ silent: true });
    }, 5000);

    return () => {
      window.clearInterval(refreshTimer);
      signalRService.off("ReceiveDeviceStatus");
    };
  }, [loadDevices]);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const url = await uploadService.uploadImage(file, "videos");
      setFormData((prev) => ({ ...prev, ipAddress: url }));
      alert("Đã tải lên video thành công!");
    } catch (error) {
      alert(error.message || "Lỗi tải video");
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const handleAdd = () => {
    setSelectedDevice(null);
    setFormData({ deviceCode: "", deviceName: "", location: "", ipAddress: "", rtspUsername: "admin", rtspPassword: "", rtspPort: 554, gateDirection: 0, isActive: true });
    setShowModal(true);
  };

  const handleEdit = (device) => {
    setSelectedDevice(device);
    setFormData({
      deviceCode: device.deviceCode,
      deviceName: device.deviceName,
      location: device.location,
      ipAddress: device.ipAddress || "",
      rtspUsername: device.rtspUsername || "admin",
      rtspPassword: device.rtspPassword || "",
      rtspPort: device.rtspPort || 554,
      gateDirection: normalizeGateDirection(device.gateDirection),
      isActive: device.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.delete(`/devices/${deleteConfirmId}`);
      loadDevices();
    } catch (error) {
      console.error("Failed to delete device:", error);
      alert("Không thể xóa thiết bị. Vui lòng thử lại.");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isUploading) return;

    const payload = {
      ...formData,
      gateDirection: toGateDirectionPayload(formData.gateDirection),
    };

    try {
      if (selectedDevice) {
        await api.put(`/devices/${selectedDevice.deviceId}`, { ...payload, deviceId: selectedDevice.deviceId });
      } else {
        await api.post("/devices", payload);
      }
      setShowModal(false);
      loadDevices();
    } catch (error) {
      console.error("Failed to save device:", error);
      const validationError = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join("\n")
        : null;
      alert(error.response?.data?.message || validationError || "Có lỗi xảy ra");
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
              </div>
              {(user?.role === 0 || user?.role === "SuperAdmin") && (
                <button className="btn btn-primary" onClick={handleAdd}>
                  <Plus size={20} /> Thêm thiết bị mới
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>Đang tải...</div>
            ) : (
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))" }}>
                {devices.map((d) => (
                  <div key={d.deviceId} className="card" style={{ overflow: "hidden", padding: 0 }}>
                    {/* Camera preview */}
                    <div style={{ position: "relative" }}>
                      {d.isActive ? (
                        <div 
                          style={{ height: 168, background: "#000", borderRadius: "18px 18px 0 0", overflow: "hidden", position: "relative", cursor: "pointer" }}
                          onClick={() => setViewingDevice(d)}
                          title="Bấm để xem phóng to"
                        >
                          <img 
                            src={`${AI_CORE_URL}/camera/stream?deviceId=${d.deviceId}`} 
                            style={{ width: "100%", height: "100%", objectFit: "contain", position: "absolute", inset: 0, zIndex: 1 }} 
                            alt="Camera Feed"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'grid';
                            }}
                          />
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#1a2230,#0e1420)", display: "grid", placeItems: "center" }}>
                            <Wifi size={32} style={{ color: "rgba(14,163,158,.5)" }} />
                          </div>
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
                        <span className={`badge ${d.isActive ? "badge-green" : "badge-red"}`}
                          style={{ background: d.isActive ? "rgba(21,163,90,.92)" : "rgba(226,59,84,.92)", color: "#fff" }}>
                          <span className="bdot" style={{ background: "#fff" }} />
                          {d.isActive ? "ONLINE" : "OFFLINE"}
                        </span>
                      </div>
                      {/* Edit/Delete overlay */}
                      {(user?.role === 0 || user?.role === "SuperAdmin") && (
                        <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6, zIndex: 10 }}>
                          <button style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.12)", color: "#fff", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", cursor: "pointer" }}
                            onClick={(e) => { e.stopPropagation(); handleEdit(d); }}><Edit size={15} /></button>
                          <button style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.12)", color: "#fff", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", cursor: "pointer" }}
                            onClick={(e) => { e.stopPropagation(); handleDelete(d.deviceId); }}><Trash2 size={15} /></button>
                        </div>
                      )}
                    </div>
                    {/* Card body */}
                    <div style={{ padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                          {d.isActive ? <Wifi size={18} /> : <WifiOff size={18} />}
                        </div>
                        <div>
                          <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 16 }}>{d.deviceName}</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                            <span className="chip-mono">#{d.deviceCode}</span>
                            <span className="badge" style={{ ...getGateBadgeStyle(d.gateDirection), padding: "4px 8px", fontSize: 11 }}>
                              <span className="bdot" />{getGateLabel(d.gateDirection)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 15, display: "grid", gap: 9 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--ink-2)" }}>
                          <MapPin size={15} style={{ color: "var(--ink-3)" }} />{d.location}
                        </div>
                        {d.ipAddress && (
                          <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--ink-2)", overflow: "hidden" }}>
                            <span className="mono" style={{ fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }} title={d.ipAddress}>
                              IP {d.ipAddress}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add new card */}
                {(user?.role === 0 || user?.role === "SuperAdmin") && (
                  <button className="card"
                    style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, border: "2px dashed var(--border)", background: "transparent", minHeight: 280, color: "var(--ink-3)", transition: "border .15s,color .15s", width: "100%", cursor: "pointer" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary-700)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--ink-3)"; }}
                    onClick={handleAdd}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--surface-3)", display: "grid", placeItems: "center" }}>
                      <Plus size={24} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>Thêm thiết bị cổng</div>
                    <div style={{ fontSize: 12.5, textAlign: "center", maxWidth: 200 }}>Kết nối camera AI cho cổng vào hoặc cổng ra</div>
                  </button>
                )}
              </div>
            )}

            {/* Modal */}
            {showModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(13,21,38,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
                onClick={() => { if (!isUploading) setShowModal(false); }}>
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
                      <label>LOẠI CỔNG *</label>
                      <select className="input" value={formData.gateDirection}
                        onChange={(e) => setFormData({ ...formData, gateDirection: parseInt(e.target.value, 10) })}
                        required>
                        <option value={0}>Cổng vào</option>
                        <option value={1}>Cổng ra</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>ĐỊA CHỈ IP (CAMERA) HOẶC LINK VIDEO TEST</label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input className="input" type="text" value={formData.ipAddress}
                          onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                          placeholder="192.168.1.100 hoặc link video..." style={{ flex: 1 }} />
                        <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, padding: "0 16px", background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", color: "var(--ink-2)", fontSize: "14px", fontWeight: 600 }}>
                          <Upload size={16} />
                          {isUploading ? "Đang tải..." : "Tải Video"}
                          <input type="file" accept="video/mp4,video/webm,video/quicktime" style={{ display: "none" }} onChange={handleVideoUpload} disabled={isUploading} />
                        </label>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: "12px", marginBottom: "16px" }}>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>TÀI KHOẢN RTSP</label>
                        <input className="input" type="text" value={formData.rtspUsername}
                          onChange={(e) => setFormData({ ...formData, rtspUsername: e.target.value })}
                          placeholder="admin" />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>MẬT KHẨU RTSP</label>
                        <input className="input" type="password" value={formData.rtspPassword}
                          onChange={(e) => setFormData({ ...formData, rtspPassword: e.target.value })}
                          placeholder="***" />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>CỔNG</label>
                        <input className="input" type="number" value={formData.rtspPort}
                          onChange={(e) => setFormData({ ...formData, rtspPort: parseInt(e.target.value) || 554 })}
                          placeholder="554" />
                      </div>
                    </div>
                    <div className="field">
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input type="checkbox" checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
                        <span>Kích hoạt lượt kiểm tra</span>
                      </label>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                      <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={isUploading}>Hủy</button>
                      <button type="submit" className="btn btn-primary" disabled={isUploading}>
                        {isUploading ? "Đang tải video..." : (selectedDevice ? "Cập nhật" : "Thêm thiết bị")}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {viewingDevice && (
              <div className="modal-backdrop fade-in" onClick={() => setViewingDevice(null)} style={{ zIndex: 9999, position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: "90%", height: "90%", maxWidth: 1200, padding: 0, background: "rgba(10,10,10,0.4)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", position: "relative", display: "flex", justifyContent: "center", alignItems: "center", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 24, right: 24, zIndex: 10 }}>
                    <button style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", display: "grid", placeItems: "center", backdropFilter: "blur(8px)", transition: "all 0.2s" }} onClick={() => setViewingDevice(null)} title="Đóng (Esc)">
                      <X size={24} />
                    </button>
                  </div>
                  <div style={{ position: "absolute", top: 24, left: 24, zIndex: 10, background: "rgba(0,0,0,0.5)", color: "#fff", padding: "10px 20px", borderRadius: 12, backdropFilter: "blur(8px)", fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: 10, fontSize: 16 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff4d4f", boxShadow: "0 0 12px #ff4d4f" }}></div>
                    {viewingDevice.deviceName} - {viewingDevice.location}
                  </div>
                  <CameraCanvas
                    src={`${AI_CORE_URL}/camera/stream?deviceId=${viewingDevice.deviceId}`}
                    style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                  />
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
              <div className="modal-backdrop fade-in" onClick={() => setDeleteConfirmId(null)} style={{ zIndex: 9999, position: "fixed", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", background: "rgba(13,21,38,.45)", backdropFilter: "blur(4px)" }}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", padding: "32px", borderRadius: "var(--r-lg)", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", width: 400, maxWidth: "calc(100vw - 32px)", textAlign: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--red-soft)", color: "var(--red)", display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto 20px" }}>
                    <Trash2 size={32} />
                  </div>
                  <h2 style={{ margin: "0 0 12px", fontFamily: "var(--display)", fontSize: 22, color: "var(--ink)" }}>Xóa thiết bị?</h2>
                  <p style={{ margin: "0 0 24px", color: "var(--ink-2)", fontSize: 15, lineHeight: 1.5 }}>
                    Bạn có chắc chắn muốn xóa thiết bị này không? Hành động này không thể hoàn tác và sẽ ảnh hưởng đến luồng giám sát hiện tại.
                  </p>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button className="btn btn-ghost" style={{ flex: 1, padding: "12px 0", fontSize: 15 }} onClick={() => setDeleteConfirmId(null)}>Hủy bỏ</button>
                    <button className="btn" style={{ flex: 1, background: "var(--red)", color: "#fff", padding: "12px 0", fontSize: 15, border: "none" }} onClick={confirmDelete}>Xóa ngay</button>
                  </div>
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
