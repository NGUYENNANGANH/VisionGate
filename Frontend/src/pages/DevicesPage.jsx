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
    setFormData({
      deviceCode: "",
      deviceName: "",
      location: "",
      ipAddress: "",
      isOnline: true,
    });
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
        await api.put(`/devices/${selectedDevice.deviceId}`, {
          ...formData,
          deviceId: selectedDevice.deviceId,
        });
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
    <div className="devices-container">
      <Sidebar user={user} />

      <main className="main-content">
        <Header onLogout={handleLogout} />

        <div className="page-header">
          <div>
            <h1>Quản lý thiết bị</h1>
            <p className="page-description">
              Cấu hình camera AI và thiết bị kiểm soát ra vào
            </p>
          </div>
          <button className="btn-primary" onClick={handleAdd}>
            <Plus size={20} />
            Thêm thiết bị mới
          </button>
        </div>

        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : (
          <div className="devices-grid">
            {devices.map((device) => (
              <div key={device.deviceId} className="device-card">
                <div className="device-header">
                  <div className="device-status">
                    {device.isOnline ? (
                      <Wifi size={20} className="icon-online" />
                    ) : (
                      <WifiOff size={20} className="icon-offline" />
                    )}
                    <span
                      className={`status-text ${device.isOnline ? "online" : "offline"}`}
                    >
                      {device.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                  <div className="device-actions">
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => handleEdit(device)}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDelete(device.deviceId)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="device-body">
                  <h3>{device.deviceName}</h3>
                  <p className="device-code">#{device.deviceCode}</p>
                  <div className="device-info">
                    <MapPin size={16} />
                    <span>{device.location}</span>
                  </div>
                  {device.ipAddress && (
                    <div className="device-ip">IP: {device.ipAddress}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {selectedDevice ? "Cập nhật thiết bị" : "Thêm thiết bị mới"}
                </h2>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Mã thiết bị *</label>
                    <input
                      type="text"
                      value={formData.deviceCode}
                      onChange={(e) =>
                        setFormData({ ...formData, deviceCode: e.target.value })
                      }
                      required
                      placeholder="CAM-001"
                    />
                  </div>
                  <div className="form-group">
                    <label>Tên thiết bị *</label>
                    <input
                      type="text"
                      value={formData.deviceName}
                      onChange={(e) =>
                        setFormData({ ...formData, deviceName: e.target.value })
                      }
                      required
                      placeholder="Camera cổng chính"
                    />
                  </div>
                  <div className="form-group">
                    <label>Vị trí *</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      required
                      placeholder="Cổng vào chính - Tầng 1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Địa chỉ IP</label>
                    <input
                      type="text"
                      value={formData.ipAddress}
                      onChange={(e) =>
                        setFormData({ ...formData, ipAddress: e.target.value })
                      }
                      placeholder="192.168.1.100"
                    />
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.isOnline}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isOnline: e.target.checked,
                          })
                        }
                      />
                      <span>Thiết bị hoạt động</span>
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="btn-primary">
                    {selectedDevice ? "Cập nhật" : "Thêm thiết bị"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default DevicesPage;
