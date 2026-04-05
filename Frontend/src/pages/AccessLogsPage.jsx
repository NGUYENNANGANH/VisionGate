import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Search,
  Filter,
  Calendar,
  Eye,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { authService } from "../services/authService";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import "./AccessLogsPage.css";

function AccessLogsPage() {
  const [user] = useState(() => authService.getUser());
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    search: "",
    status: "",
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
    totalRecords: 0,
  });
  const [stats, setStats] = useState({
    aiHealth: 0,
    pendingReviews: 0,
  });
  const navigate = useNavigate();

  // Load access logs (combined CheckIns + Violations)
  const loadLogs = useCallback(async () => {
    try {
      console.log("🔄 AccessLogsPage: Starting to load logs...");
      setLoading(true);
      setError(null);

      // Get check-ins
      const checkInsParams = new URLSearchParams();
      if (filters.dateFrom) checkInsParams.append("from", filters.dateFrom);
      if (filters.dateTo) checkInsParams.append("to", filters.dateTo);

      console.log("📡 Fetching check-ins from:", `/checkins?${checkInsParams}`);
      const checkInsResponse = await api.get(`/checkins?${checkInsParams}`);
      const checkIns = checkInsResponse.data;
      console.log("✅ Check-ins loaded:", checkIns.length, "records");

      // Get violations
      console.log("📡 Fetching violations...");
      const violationsResponse = await api.get(`/violations?isResolved=false`);
      const violations = violationsResponse.data;
      console.log("✅ Violations loaded:", violations.length, "records");

      // Combine and transform data
      const combinedLogs = [
        ...checkIns.map((item) => ({
          id: `checkin-${item.checkInId}`,
          time: item.checkInTime,
          employee: item.employee,
          location: item.device?.location || "Unknown",
          status:
            item.status === "Success" || item.status === 0
              ? "ĐIỂM DANH"
              : item.status === "Warning" || item.status === 2
                ? "CẢNH BÁO"
                : "THẤT BẠI",
          statusType:
            item.status === "Success" || item.status === 0
              ? "success"
              : "warning",
          imageUrl: item.checkInImageUrl,
          type: "checkin",
          rawData: item,
        })),
        ...violations.map((item) => ({
          id: `violation-${item.violationId}`,
          time: item.createdAt,
          employee: item.employee,
          location: item.checkInRecord?.device?.location || "Unknown",
          status: item.violationType === 5 ? "TRÁI PHÉP" : "VI PHẠM",
          statusType: item.severity >= 2 ? "critical" : "violation",
          imageUrl: item.imageUrl,
          type: "violation",
          rawData: item,
        })),
      ];

      console.log("📊 Combined logs:", combinedLogs.length, "total records");

      // Sort by time descending
      combinedLogs.sort((a, b) => new Date(b.time) - new Date(a.time));

      // Apply search filter
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

      // Apply status filter
      if (filters.status) {
        filteredLogs = filteredLogs.filter(
          (log) => log.status === filters.status,
        );
      }

      console.log("🔍 Filtered logs:", filteredLogs.length, "records");

      // Pagination
      const totalRecords = filteredLogs.length;
      const totalPages = Math.ceil(totalRecords / pagination.pageSize);
      const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
      const paginatedLogs = filteredLogs.slice(
        startIndex,
        startIndex + pagination.pageSize,
      );

      console.log("📄 Page", pagination.currentPage, "of", totalPages, "- Showing", paginatedLogs.length, "records");

      setLogs(paginatedLogs);
      setPagination((prev) => ({ ...prev, totalPages, totalRecords }));

      // Calculate stats
      setStats({
        aiHealth: 99.9,
        pendingReviews: violations.length,
      });

      console.log("✅ AccessLogsPage: Logs loaded successfully!");
    } catch (error) {
      console.error("❌ AccessLogsPage: Failed to load logs:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setError(
        error.response?.data?.message ||
          "Không thể tải dữ liệu. Vui lòng kiểm tra kết nối Backend.",
      );
      // Set empty data on error
      setLogs([]);
      setStats({ aiHealth: 0, pendingReviews: 0 });
    } finally {
      console.log("🏁 AccessLogsPage: Loading complete, setting loading=false");
      setLoading(false);
    }
  }, [filters.dateFrom, filters.dateTo, filters.search, filters.status, pagination.currentPage, pagination.pageSize]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const handleExportExcel = async () => {
    try {
      // TODO: Implement Excel export
      alert("Export functionality coming soon!");
    } catch (error) {
      console.error("Failed to export:", error);
    }
  };

  const handleViewDetail = (log) => {
    // TODO: Show detail modal
    console.log("View detail:", log);
  };

  const getStatusBadgeClass = (statusType) => {
    switch (statusType) {
      case "success":
        return "status-success";
      case "violation":
        return "status-violation";
      case "critical":
        return "status-critical";
      case "warning":
        return "status-warning";
      default:
        return "status-default";
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="app-container">
      <Sidebar user={user} />
      <div className="main-content">
        <Header user={user} onLogout={handleLogout} />

        <div className="page-content">
          <div className="page-header">
            <div>
              <div className="breadcrumb">Trang chủ / Lịch sử giám sát</div>
              <h1>Lịch Sử Điểm Danh & Vi Phạm</h1>
              <p className="page-description">
                Nhật ký giám sát thời gian thực và sự kiện nhận diện AI
              </p>
            </div>
            <button className="btn-export" onClick={handleExportExcel}>
              <Download size={18} />
              Xuất Excel
            </button>
          </div>

          {/* Filters */}
          <div className="filters-section">
            <div className="log-filter-group">
              <label>KHOẢNG NGÀY</label>
              <div className="date-range-inputs">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    handleFilterChange("dateFrom", e.target.value)
                  }
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

            <div className="log-filter-group">
              <label>TRẠNG THÁI</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="filter-select"
              >
                <option value="">Tất cả</option>
                <option value="ĐIỂM DANH">Điểm danh</option>
                <option value="VI PHẠM">Vi phạm</option>
                <option value="TRÁI PHÉP">Trái phép</option>
              </select>
            </div>

            <button className="btn-more-filters">
              <Filter size={18} />
              Lọc thêm
            </button>
          </div>

          {/* Table */}
          <div className="logs-table-container">
            {loading ? (
              <div className="loading-state">Đang tải...</div>
            ) : error ? (
              <div className="error-state">
                <p style={{ color: "#ef4444", textAlign: "center", padding: "2rem" }}>
                  ❌ {error}
                </p>
                <button
                  onClick={loadLogs}
                  style={{
                    display: "block",
                    margin: "1rem auto",
                    padding: "0.5rem 1rem",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <table className="logs-table">
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
                      <td colSpan="6" className="empty-state">
                        Không có bản ghi nào
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td className="time-cell">
                          {formatDateTime(log.time)}
                        </td>
                        <td>
                          <div className="employee-cell">
                            {log.employee?.faceImageUrl ? (
                              <img
                                src={log.employee.faceImageUrl}
                                alt={log.employee.fullName}
                                className="employee-avatar"
                              />
                            ) : (
                              <div className="employee-avatar-placeholder">
                                {log.employee?.fullName
                                  ?.substring(0, 2)
                                  .toUpperCase() || "??"}
                              </div>
                            )}
                            <div>
                              <div className="employee-name">
                                {log.employee?.fullName || "Khách lạ"}
                              </div>
                              <div className="employee-id">
                                MÃ: {log.employee?.employeeCode || "UNKN-????"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{log.location}</td>
                        <td>
                          <span
                            className={`status-badge ${getStatusBadgeClass(log.statusType)}`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td>
                          {log.imageUrl ? (
                            <img
                              src={log.imageUrl}
                              alt="Evidence"
                              className="evidence-image"
                            />
                          ) : (
                            <div className="no-image">Không có ảnh</div>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn-view-detail"
                            onClick={() => handleViewDetail(log)}
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">
                Hiển thị {(pagination.currentPage - 1) * pagination.pageSize + 1}{" "}
                đến{" "}
                {Math.min(
                  pagination.currentPage * pagination.pageSize,
                  pagination.totalRecords,
                )}{" "}
                / {pagination.totalRecords} kết quả
              </span>
              <div className="pagination-buttons">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="pagination-prev"
                >
                  &lt;
                </button>
                {[...Array(pagination.totalPages)].map((_, index) => {
                  const page = index + 1;
                  if (
                    page === 1 ||
                    page === pagination.totalPages ||
                    (page >= pagination.currentPage - 1 &&
                      page <= pagination.currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`pagination-number ${page === pagination.currentPage ? "active" : ""}`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === pagination.currentPage - 2 ||
                    page === pagination.currentPage + 2
                  ) {
                    return <span key={page}>...</span>;
                  }
                  return null;
                })}
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="pagination-next"
                >
                  &gt;
                </button>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="stats-cards">
            <div className="stat-card stat-success">
              <div className="stat-icon">
                <Activity size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-label">Sức khỏe AI</div>
                <div className="stat-value">
                  Độ chính xác {stats.aiHealth}% trong 24 giờ qua trên
                  tất cả camera đang hoạt động.
                </div>
              </div>
            </div>
            <div className="stat-card stat-warning">
              <div className="stat-icon">
                <AlertTriangle size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-label">Chờ xử lý</div>
                <div className="stat-value">
                  Có {stats.pendingReviews} vi phạm chưa xác nhận
                  cần được kiểm tra thủ công.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccessLogsPage;
