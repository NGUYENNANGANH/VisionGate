import { useState, useEffect, useCallback } from "react";
import { Download, Search, Clock, Edit, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
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

  const getStatusBadgeClass = (status) => {
    if (status === "On Time" || status === "Đúng giờ") return "badge badge-green";
    if (status === "Missing Check-out" || status === "Thiếu Check-out") return "badge badge-amber";
    return "badge badge-red";
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
        toast.success("Xóa thành công!");
        loadReports();
      } catch (err) {
        toast.error("Lỗi khi xóa: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        employeeId: editModal.data.employeeId,
        date: editModal.data.date,
        checkInTime: editModal.data.checkInTime || null,
        checkOutTime: editModal.data.checkOutTime || null
      };
      if (payload.checkInTime && payload.checkInTime.length === 5) payload.checkInTime += ":00";
      if (payload.checkOutTime && payload.checkOutTime.length === 5) payload.checkOutTime += ":00";

      await api.put(`/reports/attendance`, payload);
      toast.success("Cập nhật thành công!");
      setEditModal({ isOpen: false, data: null });
      loadReports();
    } catch (err) {
      toast.error("Lỗi khi cập nhật: " + (err.response?.data?.message || err.message));
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const res = await api.post('/reports/export-excel',
        {
          reportType: 'attendance',
          fromDate: filters.dateFrom || null,
          toDate: filters.dateTo || null,
          searchText: filters.search || null
        },
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bao-cao-diem-danh.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Lỗi khi xuất Excel: ' + (err.response?.data?.message || err.message));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="main">
        <Header onLogout={handleLogout} />

        <div className="page">
          <div className="page-inner fade-in">
            <div className="page-head">
              <div>
                <h1 className="page-title">Báo cáo điểm danh</h1>
                <p className="page-sub">
                  Tổng hợp thời gian ra/vào và thống kê số phút đi muộn/về sớm. Mọi lượt Check-in/Check-out trong ngày được gộp làm 1 dòng/người.
                </p>
              </div>
              <button className="btn btn-green" onClick={handleExportExcel} disabled={exporting}>
                <Download size={16} />
                {exporting ? 'Đang xuất...' : 'Xuất Excel'}
              </button>
            </div>

            {/* Filters */}
            <div className="card filter-section">
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>KHOẢNG NGÀY</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="date"
                      className="input"
                      style={{ width: 160 }}
                      value={filters.dateFrom}
                      onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                    />
                    <span style={{ color: "var(--ink-3)", fontSize: 13 }}>đến</span>
                    <input
                      type="date"
                      className="input"
                      style={{ width: 160 }}
                      value={filters.dateTo}
                      onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                    />
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}>
                  <label>TÌM NHÂN VIÊN</label>
                  <div className="search" style={{ width: "100%" }}>
                    <Search size={15} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
                    <input
                      type="text"
                      placeholder="Tên, mã NV hoặc phòng ban"
                      value={filters.search}
                      onChange={(e) => handleFilterChange("search", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="tbl-wrap" style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>Đang tải...</div>
            ) : error ? (
              <div className="tbl-wrap" style={{ padding: 40, textAlign: "center", color: "var(--red)" }}>{error}</div>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>NGÀY</th>
                      <th>ID / MÃ NV</th>
                      <th>LẦN QUÉT ĐẦU (CHECK-IN)</th>
                      <th>LẦN QUÉT CUỐI (CHECK-OUT)</th>
                      <th>ĐI MUỘN</th>
                      <th>VỀ SỚM</th>
                      <th>TRẠNG THÁI</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: "center", padding: "32px", color: "var(--ink-3)" }}>Không có bản ghi nào</td>
                      </tr>
                    ) : (
                      reports.map((report, idx) => (
                        <tr key={idx}>
                          <td className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>{report.date}</td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{report.employeeName}</div>
                            <div className="mono" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{report.employeeCode}</div>
                          </td>
                          <td className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>
                            {report.checkInTime
                              ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Clock size={13} />{report.checkInTime}</span>
                              : <span style={{ color: "var(--ink-4)" }}>—</span>}
                          </td>
                          <td className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>
                            {report.checkOutTime
                              ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Clock size={13} />{report.checkOutTime}</span>
                              : <span style={{ color: "var(--ink-4)" }}>—</span>}
                          </td>
                          <td className="mono" style={{ fontSize: 13, color: report.lateMinutes > 0 ? "var(--red)" : "var(--ink-3)" }}>
                            {report.lateMinutes > 0 ? `${report.lateMinutes} phút` : "—"}
                          </td>
                          <td className="mono" style={{ fontSize: 13, color: report.earlyLeaveMinutes > 0 ? "var(--amber)" : "var(--ink-3)" }}>
                            {report.earlyLeaveMinutes > 0 ? `${report.earlyLeaveMinutes} phút` : "—"}
                          </td>
                          <td>
                            <span className={getStatusBadgeClass(report.status)}>
                              <span className="bdot" />{report.status}
                            </span>
                          </td>
                          <td>
                            <div className="row-act">
                              <button className="act-btn" onClick={() => handleEdit(report)} title="Sửa"><Edit size={15} /></button>
                              <button className="act-btn danger" onClick={() => handleDelete(report)} title="Xóa"><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(13,21,38,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setEditModal({ isOpen: false, data: null })}>
          <div style={{ background: "var(--surface)", padding: "32px 28px", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-lg)", width: 420, maxWidth: "calc(100vw - 32px)" }}
            onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 6, fontFamily: "var(--display)", fontSize: 18, color: "var(--ink)" }}>Sửa giờ điểm danh</h3>
            <p style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 24 }}>
              Ngày: <strong style={{ color: "var(--ink-2)" }}>{editModal.data.date}</strong>
            </p>
            <form onSubmit={handleSaveEdit}>
              <div className="field">
                <label>CHECK-IN (GIỜ VÀO)</label>
                <input type="time" step="1" className="input"
                  value={editModal.data.checkInTime}
                  onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, checkInTime: e.target.value } })}
                />
              </div>
              <div className="field">
                <label>CHECK-OUT (GIỜ RA)</label>
                <input type="time" step="1" className="input"
                  value={editModal.data.checkOutTime}
                  onChange={e => setEditModal({ ...editModal, data: { ...editModal.data, checkOutTime: e.target.value } })}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditModal({ isOpen: false, data: null })}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendanceReportsPage;
