import { useState, useEffect, useCallback } from "react";
import { Download, Search, Filter, Clock, Edit, Trash2 } from "lucide-react";
import { authService } from "../services/authService";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import "./AttendanceReportsPage.css";

function AttendanceReportsPage() {
  const [user] = useState(() => authService.getUser());
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    search: ""
  });

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.dateFrom) params.append("fromDate", filters.dateFrom);
      if (filters.dateTo) params.append("toDate", filters.dateTo);

      const response = await api.get(`/reports/attendance?${params}`);
      let data = response.data.data || [];
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        data = data.filter(
          (log) =>
            log.employeeName?.toLowerCase().includes(searchLower) ||
            log.employeeCode?.toLowerCase().includes(searchLower) ||
            log.department?.toLowerCase().includes(searchLower)
        );
      }
      
      setReports(data);
    } catch (err) {
      setError("Không thể tải dữ liệu báo cáo chấm công.");
    } finally {
      setLoading(false);
    }
  }, [filters.dateFrom, filters.dateTo, filters.search]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleLogout = () => {
    authService.logout();
    window.location.href = "/login";
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const getStatusBadge = (status) => {
    if (status === "On Time" || status === "Đúng giờ") return "status-on-time";
    if (status === "Missing Check-out" || status === "Thiếu Check-out") return "status-missing";
    return "status-late";
  };

  const [editModal, setEditModal] = useState({ isOpen: false, data: null });

  const handleEdit = (report) => {
    setEditModal({
      isOpen: true,
      data: {
        employeeId: report.employeeId,
        date: report.date,
        checkInTime: report.checkInTime || "",
        checkOutTime: report.checkOutTime || ""
      }
    });
  };

  const handleDelete = async (report) => {
    if (window.confirm(`Bạn có chắc muốn xóa dữ liệu điểm danh của ${report.employeeName} ngày ${report.date}?\nLưu ý: Hành động này sẽ xóa toàn bộ nhật ký quét mặt gốc của nhân viên này trong ngày hôm đó.`)) {
      try {
        await api.delete(`/reports/attendance?employeeId=${report.employeeId}&date=${report.date}`);
        alert("Xóa thành công!");
        loadReports();
      } catch (err) {
        alert("Lỗi khi xóa: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      // Create request payload
      const payload = {
        employeeId: editModal.data.employeeId,
        date: editModal.data.date,
        checkInTime: editModal.data.checkInTime || null,
        checkOutTime: editModal.data.checkOutTime || null
      };
      
      // If passing just hours/mins, ensure it format is standard TimeSpan-like string
      if (payload.checkInTime && payload.checkInTime.length === 5) payload.checkInTime += ":00";
      if (payload.checkOutTime && payload.checkOutTime.length === 5) payload.checkOutTime += ":00";

      await api.put(`/reports/attendance`, payload);
      alert("Cập nhật thành công!");
      setEditModal({ isOpen: false, data: null });
      loadReports();
    } catch (err) {
      alert("Lỗi khi cập nhật: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="app-container">
      <Sidebar user={user} />
      <div className="main-content">
        <Header user={user} onLogout={handleLogout} />

        <div className="page-content">
          <div className="page-header">
            <div>
              <div className="breadcrumb">Trang chủ / Báo cáo điểm danh</div>
              <h1>Báo Cáo Điểm Danh (Daily FILO)</h1>
              <p className="page-description">
                Tổng hợp thời gian ra/vào và thống kê số phút đi muộn/về sớm. Mọi lượt Check-in/Check-out trong ngày được gộp làm 1 dòng/người.
              </p>
            </div>
            <button className="btn-export" onClick={() => alert("Tính năng xuất Excel chưa sẵn sàng!")}>
              <Download size={18} />
              Xuất Excel
            </button>
          </div>

          <div className="filters-section">
            <div className="log-filter-group">
              <label>KHOẢNG NGÀY</label>
              <div className="date-range-inputs">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                  className="filter-input"
                />
                <span>đến</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  className="filter-input"
                />
              </div>
            </div>

            <div className="log-filter-group">
              <label>TÌM NHÂN VIÊN</label>
              <div className="search-input">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Tên, mã NV hoặc phòng ban"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="logs-table-container">
            {loading ? (
              <div className="loading-state">Đang tải...</div>
            ) : error ? (
              <div className="error-state">{error}</div>
            ) : (
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>NGÀY</th>
                    <th>ID / MÃ NV</th>
                    <th>LẦN QUÉT ĐẦU (CHECK-IN)</th>
                    <th>LẦN QUÉT CUỐI (CHECK-OUT)</th>
                    <th>ĐI MUỘN</th>
                    <th>VỀ SỚM</th>
                    <th>TRẠNG THÁI</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="empty-state">Không có bản ghi nào</td>
                    </tr>
                  ) : (
                    reports.map((report, idx) => (
                      <tr key={idx}>
                        <td className="time-cell">{report.date}</td>
                        <td>
                          <div className="employee-name">{report.employeeName}</div>
                          <div className="employee-id">{report.employeeCode}</div>
                        </td>
                        <td><Clock style={{marginRight: '6px', verticalAlign: 'middle'}} size={14} />{report.checkInTime}</td>
                        <td>{report.checkOutTime ? <span><Clock style={{marginRight: '6px', verticalAlign: 'middle'}} size={14} />{report.checkOutTime}</span> : <span style={{color: '#9ca3af'}}>-</span>}</td>
                        <td style={{ color: report.lateMinutes > 0 ? '#ef4444' : 'inherit' }}>
                          {report.lateMinutes > 0 ? `${report.lateMinutes} phút` : '-'}
                        </td>
                        <td style={{ color: report.earlyLeaveMinutes > 0 ? '#f59e0b' : 'inherit' }}>
                          {report.earlyLeaveMinutes > 0 ? `${report.earlyLeaveMinutes} phút` : '-'}
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusBadge(report.status)}`}>
                            {report.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleEdit(report)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }} title="Sửa">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDelete(report)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Xóa">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.2rem', color: '#111827' }}>Sửa giờ điểm danh</h3>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '16px' }}>
              Ngày: <strong>{editModal.data.date}</strong>
            </p>
            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Check-in (Giờ vào)</label>
                <input 
                  type="time" 
                  step="1"
                  value={editModal.data.checkInTime} 
                  onChange={e => setEditModal({...editModal, data: {...editModal.data, checkInTime: e.target.value}})} 
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>Check-out (Giờ ra)</label>
                <input 
                  type="time" 
                  step="1"
                  value={editModal.data.checkOutTime} 
                  onChange={e => setEditModal({...editModal, data: {...editModal.data, checkOutTime: e.target.value}})} 
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setEditModal({ isOpen: false, data: null })} style={{ padding: '8px 16px', border: '1px solid #d1d5db', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" style={{ padding: '8px 16px', border: 'none', background: '#3b82f6', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default AttendanceReportsPage;
