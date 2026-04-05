import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  HelpCircle,
  Wifi,
  ShieldAlert, // Icon Users & Roles
  UserCog,
  Calendar,
} from "lucide-react";
import "./Sidebar.css";

// Helper check quyền
const isSystemAdmin = (role) => {
  return role === 0 || role === "SuperAdmin";
};

function Sidebar({ user }) {
  const location = useLocation();

  return (
    <aside className="sidebar">
      {/* ...Header... */}
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">🛡️</div>
          <div>
            <div className="logo-title">VisionGate</div>
            <div className="logo-subtitle">Enterprise Security</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <Link
          to="/dashboard"
          className={`nav-item ${location.pathname === "/dashboard" ? "active" : ""}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/employees"
          className={`nav-item ${location.pathname === "/employees" ? "active" : ""}`}
        >
          <Users size={20} />
          <span>Employees</span> {/* Nhân viên */}
        </Link>
        <Link
          to="/attendance-reports"
          className={`nav-item ${location.pathname === "/attendance-reports" ? "active" : ""}`}
        >
          <Calendar size={20} />
          <span>Attendance</span>
        </Link>
        <Link
          to="/access-logs"
          className={`nav-item ${location.pathname === "/access-logs" ? "active" : ""}`}
        >
          <FileText size={20} />
          <span>Access Logs</span>
        </Link>
        <Link
          to="/devices"
          className={`nav-item ${location.pathname === "/devices" ? "active" : ""}`}
        >
          <Wifi size={20} />
          <span>Devices</span>
        </Link>
        {isSystemAdmin(user?.role) && (
          <Link
            to="/admin/users"
            className={`nav-item ${location.pathname === "/admin/users" ? "active" : ""}`}
          >
            <UserCog size={20} />
            {/* Dùng icon UserCog hợp hơn ShieldAlert cho quản lý User */}
            <span>System Users</span>
          </Link>
        )}
      </nav>

      <div className="sidebar-section">
        <div className="section-title">ADMINISTRATION</div>

        {/* Đã chuyển Users & Roles lên trên, ở đây chỉ còn Settings */}
        <Link
          to="/settings"
          className={`nav-item ${location.pathname === "/settings" ? "active" : ""}`}
        >
          <Settings size={20} />
          <span>Settings</span>
        </Link>
        <a href="#" className="nav-item">
          <HelpCircle size={20} />
          <span>Support</span>
        </a>
      </div>

      {/* ...Footer... */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            {user?.fullName?.substring(0, 2).toUpperCase() || "AD"}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.fullName || "Admin"}</div>
            <div className="user-role">
              {typeof user?.role === "number"
                ? user.role === 0
                  ? "Super Admin"
                  : "User"
                : user?.role}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
