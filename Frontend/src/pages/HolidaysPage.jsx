import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CalendarDays, Edit2, Plus, Save, Trash2, X } from "lucide-react";
import { authService } from "../services/authService";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import "./SettingsPage.css";

const holidayTypes = [
  { value: "Holiday", label: "Nghỉ lễ" },
  { value: "CompanyOff", label: "Nghỉ phát sinh" },
];

const weekendDays = [
  { value: "Saturday", label: "Thứ 7" },
  { value: "Sunday", label: "Chủ nhật" },
];

const toInputDate = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

const formatDate = (value) =>
  new Date(value).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

const getTypeLabel = (type) => holidayTypes.find((item) => item.value === type)?.label || type;

function HolidayModal({ holiday, onClose, onSave }) {
  const [formData, setFormData] = useState({
    date: toInputDate(holiday?.date),
    name: holiday?.name || "",
    type: holiday?.type === "Weekend" ? "Holiday" : holiday?.type || "Holiday",
    isActive: holiday?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên ngày nghỉ.");
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 460 }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{holiday ? "Sửa ngày nghỉ" : "Thêm ngày nghỉ"}</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Ngày nghỉ *</label>
              <input
                type="date"
                className="form-input"
                value={formData.date}
                onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Tên ngày nghỉ *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                placeholder="VD: Nghỉ lễ Quốc khánh"
                required
              />
            </div>
            <div className="form-group">
              <label>Loại ngày nghỉ</label>
              <select
                className="form-input"
                value={formData.type}
                onChange={(event) => setFormData({ ...formData, type: event.target.value })}
              >
                {holidayTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600, color: "var(--ink-2)" }}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })}
                style={{ width: 16, height: 16 }}
              />
              Đang áp dụng
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HolidaysPage() {
  const [user] = useState(() => authService.getUser());
  const [holidays, setHolidays] = useState([]);
  const [weeklyOffDays, setWeeklyOffDays] = useState(["Saturday", "Sunday"]);
  const [loading, setLoading] = useState(true);
  const [savingWeekend, setSavingWeekend] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const activeCount = useMemo(() => holidays.filter((holiday) => holiday.isActive).length, [holidays]);
  const weekendText = weeklyOffDays.length
    ? weeklyOffDays.map((day) => weekendDays.find((item) => item.value === day)?.label).filter(Boolean).join(", ")
    : "Chưa chọn";

  const handleLogout = () => { authService.logout(); navigate("/login"); };

  const loadData = async () => {
    try {
      setLoading(true);
      const [holidaysResponse, settingsResponse] = await Promise.all([
        api.get("/holidays"),
        api.get("/holiday-settings"),
      ]);
      setHolidays(holidaysResponse.data || []);
      setWeeklyOffDays(settingsResponse.data?.weeklyOffDays || ["Saturday", "Sunday"]);
    } catch (error) {
      console.error("Failed to load holidays:", error);
      toast.error("Không thể tải lịch ngày nghỉ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const toggleWeekendDay = (day) => {
    setWeeklyOffDays((current) => current.includes(day)
      ? current.filter((item) => item !== day)
      : [...current, day]);
  };

  const handleSaveWeekend = async () => {
    setSavingWeekend(true);
    try {
      await api.put("/holiday-settings", { weeklyOffDays });
      toast.success("Đã lưu ngày nghỉ cuối tuần.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu ngày nghỉ cuối tuần.");
    } finally {
      setSavingWeekend(false);
    }
  };

  const openAddModal = () => {
    setSelectedHoliday(null);
    setIsModalOpen(true);
  };

  const openEditModal = (holiday) => {
    setSelectedHoliday(holiday);
    setIsModalOpen(true);
  };

  const handleSave = async (formData) => {
    const payload = {
      date: `${formData.date}T00:00:00`,
      name: formData.name.trim(),
      type: formData.type,
      isActive: formData.isActive,
    };

    try {
      if (selectedHoliday) {
        await api.put(`/holidays/${selectedHoliday.holidayId}`, payload);
        toast.success("Đã cập nhật ngày nghỉ.");
      } else {
        await api.post("/holidays", payload);
        toast.success("Đã thêm ngày nghỉ.");
      }
      setIsModalOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu ngày nghỉ.");
    }
  };

  const handleDelete = async (holiday) => {
    if (!window.confirm(`Xóa ngày nghỉ ${holiday.name}?`)) return;
    try {
      await api.delete(`/holidays/${holiday.holidayId}`);
      toast.success("Đã xóa ngày nghỉ.");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa ngày nghỉ.");
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
            <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 className="page-title">Lịch ngày nghỉ</h1>
                <p className="page-sub">Cuối tuần tự áp dụng, ngày nghỉ phát sinh thì thêm theo ngày.</p>
              </div>
              <button className="btn-primary" onClick={openAddModal}>
                <Plus size={18} /> Thêm ngày nghỉ
              </button>
            </div>

            <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1.2fr) repeat(2, minmax(0, .8fr))", marginBottom: 18 }}>
              <div className="card" style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
                  <div>
                    <div style={{ color: "var(--ink-3)", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Nghỉ cuối tuần</div>
                    <div style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 5 }}>{weekendText}</div>
                  </div>
                  <button className="btn-secondary" onClick={handleSaveWeekend} disabled={savingWeekend}>
                    <Save size={16} /> {savingWeekend ? "Đang lưu" : "Lưu"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {weekendDays.map((day) => (
                    <label key={day.value} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: weeklyOffDays.includes(day.value) ? "var(--blue-soft)" : "#fff", color: "var(--ink-2)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={weeklyOffDays.includes(day.value)}
                        onChange={() => toggleWeekendDay(day.value)}
                        style={{ width: 16, height: 16 }}
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="card" style={{ padding: 18 }}>
                <div style={{ color: "var(--ink-3)", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Ngày nghỉ phát sinh</div>
                <div style={{ fontFamily: "var(--display)", fontSize: 28, fontWeight: 800, marginTop: 8 }}>{holidays.length}</div>
              </div>
              <div className="card" style={{ padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--blue-soft)", color: "var(--blue)" }}>
                  <CalendarDays size={22} />
                </div>
                <div>
                  <div style={{ color: "var(--ink-3)", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Đang áp dụng</div>
                  <div style={{ fontFamily: "var(--display)", fontSize: 28, fontWeight: 800, marginTop: 4 }}>{activeCount}</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {loading ? (
                <div style={{ padding: 20 }}>Đang tải...</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Tên ngày nghỉ</th>
                      <th>Loại</th>
                      <th>Trạng thái</th>
                      <th style={{ width: 120, textAlign: "right" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.map((holiday) => (
                      <tr key={holiday.holidayId}>
                        <td style={{ fontWeight: 700 }}>{formatDate(holiday.date)}</td>
                        <td>{holiday.name}</td>
                        <td>{getTypeLabel(holiday.type)}</td>
                        <td>
                          <span className={holiday.isActive ? "badge badge-green" : "badge badge-gray"}>
                            {holiday.isActive ? "Đang áp dụng" : "Tạm tắt"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button className="icon-btn edit" onClick={() => openEditModal(holiday)} title="Sửa"><Edit2 size={16} /></button>
                            <button className="icon-btn delete" onClick={() => handleDelete(holiday)} title="Xóa"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {holidays.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center", padding: 30, color: "var(--ink-3)" }}>
                          Chưa có ngày nghỉ phát sinh nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && <HolidayModal holiday={selectedHoliday} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
    </div>
  );
}

export default HolidaysPage;