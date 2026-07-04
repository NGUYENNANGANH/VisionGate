import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { Plus, Edit2, Trash2, X, Users } from "lucide-react";
import "./SettingsPage.css";

function ShiftModal({ shift, onClose, onSave }) {
  const [formData, setFormData] = useState({
    shiftName: shift ? shift.shiftName : "",
    startTime: shift ? shift.startTime.substring(0, 5) : "08:00",
    endTime: shift ? shift.endTime.substring(0, 5) : "17:00",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{shift ? "Sửa ca làm việc" : "Thêm ca làm việc mới"}</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Tên ca làm việc *</label>
              <input type="text" value={formData.shiftName} onChange={e => setFormData({ ...formData, shiftName: e.target.value })} required placeholder="VD: Ca Sáng" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label>Giờ bắt đầu *</label>
                <input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Giờ kết thúc *</label>
                <input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} required />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Đang lưu..." : "Lưu"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignEmployeesModal({ shift, onClose }) {
  const [employees, setEmployees] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api.get("/employees");
        setEmployees(res.data);
        const currentIds = res.data.filter(emp => emp.shiftId === shift.shiftId).map(emp => emp.employeeId);
        setSelectedIds(new Set(currentIds));
      } catch (err) {
        alert("Không tải được danh sách nhân viên.");
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [shift]);

  const handleToggle = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleToggleAll = () => {
    if (selectedIds.size === employees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employees.map(e => e.employeeId)));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/shiftconfigs/${shift.shiftId}/assign`, Array.from(selectedIds));
      onClose();
    } catch (err) {
      alert("Có lỗi khi gán nhân viên: " + (err.response?.data?.message || err.response?.status || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Gán nhân viên vào {shift.shiftName}</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: "60vh", overflowY: "auto", padding: "10px 24px" }}>
          {loading ? (
            <div>Đang tải...</div>
          ) : employees.length === 0 ? (
            <div>Chưa có nhân viên nào trong hệ thống.</div>
          ) : (
            <div>
              <div style={{ padding: "12px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "10px" }}>
                <input 
                  type="checkbox" 
                  checked={selectedIds.size === employees.length && employees.length > 0} 
                  onChange={handleToggleAll} 
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Chọn tất cả ({selectedIds.size}/{employees.length})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                {employees.map(emp => (
                  <label key={emp.employeeId} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: selectedIds.has(emp.employeeId) ? "#eff6ff" : "#f8fafc", borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(emp.employeeId)} 
                      onChange={() => handleToggle(emp.employeeId)}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "#1e293b" }}>{emp.fullName}</span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>Mã NV: {emp.employeeCode}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</button>
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  const [user] = useState(() => authService.getUser());
  const navigate = useNavigate();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  const handleLogout = () => { authService.logout(); navigate("/login"); };

  const loadShifts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/shiftconfigs");
      setShifts(res.data);
    } catch (err) {
      setError("Không thể tải danh sách ca làm việc.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadShifts(); }, []);

  const handleSaveShift = async (formData) => {
    try {
      if (selectedShift) {
        await api.put(`/shiftconfigs/${selectedShift.shiftId}`, formData);
      } else {
        await api.post("/shiftconfigs", formData);
      }
      setIsModalOpen(false);
      loadShifts();
    } catch (err) {
      alert(err.response?.data?.message || "Có lỗi xảy ra khi lưu.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa ca làm việc này?")) return;
    try {
      await api.delete(`/shiftconfigs/${id}`);
      loadShifts();
    } catch (err) {
      alert(err.response?.data?.message || "Không thể xóa ca làm việc này.");
    }
  };

  const openAddModal = () => { setSelectedShift(null); setIsModalOpen(true); };
  const openEditModal = (shift) => { setSelectedShift(shift); setIsModalOpen(true); };
  const openAssignModal = (shift) => { setSelectedShift(shift); setIsAssignModalOpen(true); };

  if (!user) return null;

  return (
    <div className="dashboard-container">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="main">
        <Header onLogout={handleLogout} />
        <div className="page">
          <div className="page-inner fade-in">
            <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 className="page-title">Quản lý ca làm việc</h1>
              </div>
              <button className="btn-primary" onClick={openAddModal}>
                <Plus size={18} /> Thêm ca làm việc
              </button>
            </div>

            {error && <div className="alert-danger" style={{ marginBottom: 20 }}>{error}</div>}

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {loading ? (
                <div style={{ padding: 20 }}>Đang tải...</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>ID</th>
                      <th>Tên ca</th>
                      <th>Giờ bắt đầu</th>
                      <th>Giờ kết thúc</th>
                      <th style={{ width: 140, textAlign: "right" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map(shift => (
                      <tr key={shift.shiftId}>
                        <td>{shift.shiftId}</td>
                        <td style={{ fontWeight: 600 }}>{shift.shiftName} {shift.shiftId === 1 && <span style={{ fontSize: 11, background: "var(--blue-soft)", color: "var(--blue)", padding: "2px 6px", borderRadius: 4, marginLeft: 8 }}>Mặc định</span>}</td>
                        <td>{shift.startTime.substring(0, 5)}</td>
                        <td>{shift.endTime.substring(0, 5)}</td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button className="icon-btn edit" style={{ color: "#10b981" }} onClick={() => openAssignModal(shift)} title="Gán nhân viên"><Users size={16} /></button>
                            <button className="icon-btn edit" onClick={() => openEditModal(shift)} title="Sửa"><Edit2 size={16} /></button>
                            {shift.shiftId !== 1 && (
                              <button className="icon-btn delete" onClick={() => handleDelete(shift.shiftId)} title="Xóa"><Trash2 size={16} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {shifts.length === 0 && (
                      <tr><td colSpan="5" style={{ textAlign: "center", padding: 30 }}>Chưa có ca làm việc nào</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {isModalOpen && <ShiftModal shift={selectedShift} onClose={() => setIsModalOpen(false)} onSave={handleSaveShift} />}
      {isAssignModalOpen && <AssignEmployeesModal shift={selectedShift} onClose={() => { setIsAssignModalOpen(false); loadShifts(); }} />}
    </div>
  );
}

export default SettingsPage;
