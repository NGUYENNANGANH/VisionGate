import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Search, Calendar, Activity, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { authService } from "../services/authService";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import "./AccessLogsPage.css";

const getAvatarStyle = (name) => {
  const hue = (name || "").split("").reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
  return `linear-gradient(135deg, hsl(${hue} 55% 55%), hsl(${hue + 30} 60% 45%))`;
};

const getInitials = (name) => {
  if (!name) return "??";
  const words = name.trim().split(/\s+/);
  return words.slice(-2).map((w) => w[0]).join("").toUpperCase();
};

function AccessLogsPage() {
  const [user] = useState(() => authService.getUser());
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: "", dateTo: "", search: "", status: "",
  });
  const [pagination, setPagination] = useState({
    currentPage: 1, pageSize: 10, totalPages: 1, totalRecords: 0,
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const navigate = useNavigate();

  const loadLogs = useCallback(async () => {
    try {
      console.log("🔄 AccessLogsPage: Starting to load logs...");
      setLoading(true);
      setError(null);

      const checkInsParams = new URLSearchParams();
      if (filters.dateFrom) checkInsParams.append("from", filters.dateFrom);
      if (filters.dateTo) checkInsParams.append("to", filters.dateTo);

      const checkInsResponse = await api.get(`/checkins?${checkInsParams}`);
      const checkIns = checkInsResponse.data;

      const violationsParams = new URLSearchParams();
      violationsParams.append("isResolved", "false");
      if (filters.dateFrom) violationsParams.append("from", filters.dateFrom);
      if (filters.dateTo) violationsParams.append("to", filters.dateTo);

      const violationsResponse = await api.get(`/violations?${violationsParams}`);
      const violations = violationsResponse.data;

      const combinedLogs = [
        ...checkIns.map((item) => ({
          id: `checkin-${item.checkInId}`,
          time: item.checkInTime,
          employee: item.employee,
          location: item.device?.location || "Thiết bị đã xóa",
          status: (item.ppeDetection && item.ppeDetection.overallCompliance) ? "ĐIỂM DANH" : "CẢNH BÁO",
          statusType: (item.ppeDetection && item.ppeDetection.overallCompliance) ? "success" : "warning",
          imageUrl: item.checkInImageUrl,
          type: "checkin",
          rawData: item,
        })),
        ...violations.map((item) => ({
          id: `violation-${item.violationId}`,
          time: item.createdAt,
          employee: item.employee,
          location: item.checkInRecord?.device?.location || "Thiết bị đã xóa",
          status: item.violationType === 5 ? "TRÁI PHÉP" : "VI PHẠM",
          statusType: item.severity >= 2 ? "critical" : "violation",
          imageUrl: item.imageUrl,
          type: "violation",
          rawData: item,
        })),
      ];

      combinedLogs.sort((a, b) => new Date(b.time) - new Date(a.time));

      let filteredLogs = combinedLogs;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredLogs = combinedLogs.filter(
          (log) =>
            log.employee?.fullName?.toLowerCase().includes(searchLower) ||
            log.employee?.employeeCode?.toLowerCase().includes(searchLower) ||
            log.location.toLowerCase().includes(searchLower),
        );
      }
      if (filters.status) {
        filteredLogs = filteredLogs.filter((log) => log.status === filters.status);
      }

      const totalRecords = filteredLogs.length;
      const totalPages = Math.ceil(totalRecords / pagination.pageSize);
      const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
      const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pagination.pageSize);

      setLogs(paginatedLogs);
      setPagination((prev) => ({ ...prev, totalPages, totalRecords }));
    } catch (error) {
      console.error("❌ AccessLogsPage: Failed to load logs:", error);
      setError(error.response?.data?.message || "Không thể tải dữ liệu. Vui lòng kiểm tra kết nối Backend.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters.dateFrom, filters.dateTo, filters.search, filters.status, pagination.currentPage, pagination.pageSize]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleLogout = () => { authService.logout(); navigate("/login"); };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const res = await api.post('/reports/export-excel',
        {
          reportType: 'access-logs',
          fromDate: filters.dateFrom || null,
          toDate: filters.dateTo || null,
          searchText: filters.search || null,
          status: filters.status || null
        },
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lich-su-diem-danh-va-vi-pham.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Xuất báo cáo thành công!");
    } catch (error) {
      console.error("Failed to export:", error);
      toast.error('Lỗi khi xuất Excel: ' + (error.response?.data?.message || error.message));
    } finally {
      setExporting(false);
    }
  };

  const handleViewDetail = (log) => {
    setSelectedLog(log);
  };

  const getStatusBadgeClass = (statusType) => {
    switch (statusType) {
      case "success": return "badge badge-green";
      case "warning": return "badge badge-amber";
      case "violation": return "badge badge-amber";
      case "critical": return "badge badge-red";
      default: return "badge badge-gray";
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      time: date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      date: date.toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" }),
    };
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
                <h1 className="page-title">Lịch sử điểm danh và vi phạm</h1>
              </div>
              <button className="btn btn-green" onClick={handleExportExcel} disabled={exporting}>
                <Download size={16} /> {exporting ? 'Đang xuất...' : 'Xuất Excel'}
              </button>
            </div>

            {/* Filters */}
            <div className="toolbar" style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Calendar size={15} style={{ color: "var(--ink-3)" }} />
                <input type="date" className="input" style={{ width: 150 }}
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)} />
                <span style={{ color: "var(--ink-3)", fontSize: 13 }}>đến</span>
                <input type="date" className="input" style={{ width: 150 }}
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)} />
              </div>
              <div className="search" style={{ flex: 1, minWidth: 220, width: "auto" }}>
                <Search size={15} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
                <input type="text" placeholder="Tên, mã NV hoặc vị trí"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)} />
              </div>
              <select className="select" value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}>
                <option value="">Tất cả trạng thái</option>
                <option value="ĐIỂM DANH">Điểm danh</option>
                <option value="VI PHẠM">Vi phạm</option>
                <option value="TRÁI PHÉP">Trái phép</option>
              </select>
            </div>

            {/* Table */}
            {loading ? (
              <div className="tbl-wrap" style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>Đang tải...</div>
            ) : error ? (
              <div className="tbl-wrap" style={{ padding: 40, textAlign: "center", color: "var(--red)" }}>
                <p>{error}</p>
                <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={loadLogs}>Thử lại</button>
              </div>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>THỜI GIAN</th>
                      <th>NHÂN VIÊN</th>
                      <th>VỊ TRÍ</th>
                      <th>TRẠNG THÁI</th>
                      <th>HÌNH ẢNH</th>
                      <th>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--ink-3)" }}>Không có bản ghi nào</td>
                      </tr>
                    ) : (
                      logs.map((log) => {
                        const dt = formatDateTime(log.time);
                        const name = log.employee?.fullName;
                        return (
                          <tr key={log.id}>
                            <td>
                              <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{dt.time}</div>
                              <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{dt.date}</div>
                            </td>
                            <td>
                              <div className="cell-name">
                                {name ? (
                                  <div className="avatar-init" style={{ width: 34, height: 34, fontSize: 12, background: getAvatarStyle(name) }}>
                                    {getInitials(name)}
                                  </div>
                                ) : (
                                  <div className="avatar-init" style={{ width: 34, height: 34, fontSize: 12, background: "var(--surface-3)", color: "var(--ink-3)" }}>??</div>
                                )}
                                <div>
                                  <div className="nm">{name || "Khách lạ"}</div>
                                  <div className="sub">{log.employee?.employeeCode || "UNKN-????"}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--ink-2)", fontSize: 13.5 }}>
                                {log.location}
                              </div>
                            </td>
                            <td>
                              <span className={getStatusBadgeClass(log.statusType)}>
                                <span className="bdot" />{log.status}
                              </span>
                            </td>
                            <td>
                              {log.imageUrl ? (
                                <div style={{ width: 46, height: 38, borderRadius: 6, overflow: "hidden", background: "#0e1420", border: "1px solid rgba(255,255,255,.08)" }}>
                                  <img src={log.imageUrl} alt="Evidence"
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </div>
                              ) : (
                                <div style={{ width: 46, height: 38, borderRadius: 6, background: "#0e1420", border: "1px solid rgba(255,255,255,.08)", display: "grid", placeItems: "center" }}>
                                  <span style={{ fontSize: 10, color: "rgba(255,255,255,.25)", fontFamily: "var(--mono)" }}>N/A</span>
                                </div>
                              )}
                            </td>
                            <td>
                              <a style={{ fontSize: 13, fontWeight: 700, color: "var(--primary-700)", display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                                onClick={() => handleViewDetail(log)}>
                                Chi tiết ›
                              </a>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <span className="pagination-info">
                  Hiển thị {(pagination.currentPage - 1) * pagination.pageSize + 1} đến{" "}
                  {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalRecords)} / {pagination.totalRecords} kết quả
                </span>
                <div className="pagination-buttons">
                  <button onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1} className="pagination-prev">&lt;</button>
                  {[...Array(pagination.totalPages)].map((_, index) => {
                    const page = index + 1;
                    if (page === 1 || page === pagination.totalPages ||
                      (page >= pagination.currentPage - 1 && page <= pagination.currentPage + 1)) {
                      return (
                        <button key={page} onClick={() => handlePageChange(page)}
                          className={`pagination-number ${page === pagination.currentPage ? "active" : ""}`}>
                          {page}
                        </button>
                      );
                    } else if (page === pagination.currentPage - 2 || page === pagination.currentPage + 2) {
                      return <span key={page}>...</span>;
                    }
                    return null;
                  })}
                  <button onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages} className="pagination-next">&gt;</button>
                </div>
              </div>
            )}


          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(13,21,38,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setSelectedLog(null)}>
          <div style={{ background: "var(--surface)", padding: "32px 28px", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-lg)", width: 480, maxWidth: "calc(100vw - 32px)", overflowY: "auto", maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 16, fontFamily: "var(--display)", fontSize: 18, color: "var(--ink)" }}>
              Chi tiết {selectedLog.type === "checkin" ? "điểm danh" : "vi phạm"}
            </h3>
            
            <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
              {selectedLog.imageUrl ? (
                <div style={{ width: 140, height: 220, borderRadius: 8, overflow: "hidden", background: "#0e1420", border: "1px solid rgba(255,255,255,.08)", flexShrink: 0 }}>
                  <img src={selectedLog.imageUrl} alt="Evidence" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
              ) : (
                <div style={{ width: 140, height: 140, borderRadius: 8, background: "#0e1420", border: "1px solid rgba(255,255,255,.08)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,.25)" }}>Không có ảnh</span>
                </div>
              )}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}>Nhân viên</div>
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>{selectedLog.employee?.fullName || "Khách lạ"}</div>
                  <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{selectedLog.employee?.employeeCode || "N/A"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}>Trạng thái</div>
                  <span className={getStatusBadgeClass(selectedLog.statusType)} style={{ padding: "4px 8px", fontSize: 12 }}>
                    <span className="bdot" />{selectedLog.status}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={{ background: "var(--surface-2)", padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}>Thời gian</div>
                <div className="mono" style={{ fontSize: 14, color: "var(--ink)" }}>{formatDateTime(selectedLog.time).time}</div>
                <div className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{formatDateTime(selectedLog.time).date}</div>
              </div>
              <div style={{ background: "var(--surface-2)", padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}>Vị trí / Thiết bị</div>
                <div style={{ fontSize: 14, color: "var(--ink)" }}>{selectedLog.location}</div>
              </div>
            </div>

            {selectedLog.type === "violation" && selectedLog.rawData && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>Mô tả vi phạm</div>
                <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: 12, borderRadius: 8, color: "var(--red)", fontSize: 14, lineHeight: 1.5 }}>
                  {selectedLog.rawData.description || "Phát hiện hành vi bất thường."}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setSelectedLog(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccessLogsPage;
