import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  HelpCircle,
  Wifi,
} from "lucide-react";
import "./Sidebar.css";

function Sidebar({ user }) {
  const location = useLocation();

  return (
    <aside className="sidebar">
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
          <span>Employees</span>
        </Link>
        <a href="#" className="nav-item">
          <FileText size={20} />
          <span>Access Logs</span>
        </a>
        <a href="#" className="nav-item">
          <Wifi size={20} />
          <span>Devices</span>
        </a>
      </nav>

      <div className="sidebar-section">
        <div className="section-title">ADMINISTRATION</div>
        <a href="#" className="nav-item">
          <Settings size={20} />
          <span>Settings</span>
        </a>
        <a href="#" className="nav-item">
          <HelpCircle size={20} />
          <span>Support</span>
        </a>
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            {user?.fullName?.substring(0, 2).toUpperCase() || "AD"}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.fullName || "Admin"}</div>
            <div className="user-role">{user?.role || "Security Lead"}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
