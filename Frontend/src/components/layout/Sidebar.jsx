import { Link, useLocation, useNavigate } from "react-router-dom";
import { Icon, ShieldLogo } from "../ui/Icon";
import "./Sidebar.css";

const isSystemAdmin = (role) => role === 0 || role === "SuperAdmin";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/employees", label: "Nhân viên", icon: "users" },
  { to: "/attendance-reports", label: "Chấm công", icon: "calendar" },
  { to: "/access-logs", label: "Lịch sử", icon: "logs" },
  { to: "/devices", label: "Thiết bị", icon: "devices" },
];

const NAV_ADMIN = [
  { to: "/admin/users", label: "Tài khoản hệ thống", icon: "shield_user", adminOnly: true },
  { to: "/settings", label: "Cài đặt", icon: "settings" },
];

const getInitials = (name = "") =>
  name.trim().split(/\s+/).slice(-2).map(w => w[0]).join("").toUpperCase();

const roleName = (role) =>
  role === 0 || role === "SuperAdmin" ? "Super Admin" :
  role === 1 || role === "Admin" ? "HR Admin" : "User";

function Sidebar({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const initials = getInitials(user?.fullName || "Admin");
  const role = roleName(user?.role);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><ShieldLogo size={22} /></div>
        <div>
          <div className="brand-name">VisionGate</div>
          <div className="brand-sub">Enterprise Security</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(n => (
          <Link key={n.to} to={n.to} className={`nav-item ${location.pathname === n.to ? "active" : ""}`}>
            <Icon name={n.icon} size={18} />
            <span>{n.label}</span>
            {n.badge && <span className="nav-badge">1</span>}
          </Link>
        ))}

        <div className="nav-label">Quản trị</div>

        {NAV_ADMIN.map(n => {
          if (n.adminOnly && !isSystemAdmin(user?.role)) return null;
          return (
            <Link key={n.to} to={n.to} className={`nav-item ${location.pathname === n.to ? "active" : ""}`}>
              <Icon name={n.icon} size={18} />
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card" onClick={() => navigate('/profile')} style={{ cursor: "pointer" }} title="Tài khoản của tôi">
          <div className="av">{initials}</div>
          <div className="user-info">
            <div className="nm">{user?.fullName || "Administrator"}</div>
            <div className="rl">{role}</div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); if (onLogout) onLogout(); }} 
            title="Đăng xuất" 
            style={{ 
              background: 'transparent', border: 'none', padding: '6px', margin: '-6px -2px -6px 0',
              color: 'var(--side-ink-3)', cursor: 'pointer'
            }}
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
