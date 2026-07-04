import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Icon, ShieldLogo } from "../ui/Icon";
import "./Sidebar.css";

const isSystemAdmin = (role) => role === 0 || role === "SuperAdmin";
const isHR = (role) => role === 1 || role === "Admin";
const isAtLeastHR = (role) => isSystemAdmin(role) || isHR(role);

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/employees", label: "Nhân viên", icon: "users", requireHR: true },
  { to: "/attendance-reports", label: "Chấm công", icon: "calendar", requireHR: true },
  { to: "/access-logs", label: "Lịch sử", icon: "logs" },
  { to: "/devices", label: "Thiết bị", icon: "devices" },
];

const NAV_ADMIN = [
  { to: "/admin/users", label: "Tài khoản hệ thống", icon: "shield_user", adminOnly: true },
  { to: "/settings", label: "Quản lý ca làm việc", icon: "settings", requireHR: true },
];

const getInitials = (name = "") =>
  name.trim().split(/\s+/).slice(-2).map(w => w[0]).join("").toUpperCase();

const roleName = (role) =>
  role === 0 || role === "SuperAdmin" ? "Super Admin" :
  role === 1 || role === "Admin" ? "HR Admin" : "User";

function Sidebar({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const initials = getInitials(user?.fullName || "Admin");
  const role = roleName(user?.role);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "true");
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add("sidebar-collapsed");
      localStorage.setItem("sidebar_collapsed", "true");
    } else {
      document.body.classList.remove("sidebar-collapsed");
      localStorage.setItem("sidebar_collapsed", "false");
    }
  }, [isCollapsed]);

  return (
    <aside className="sidebar">
      <div className="brand" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="brand-mark"><ShieldLogo size={22} /></div>
          <div>
            <div className="brand-name">VisionGate</div>
            <div className="brand-sub">Enterprise Security</div>
          </div>
        </div>
        {!isCollapsed && (
          <button 
            style={{ background: "transparent", border: "none", color: "var(--side-ink-3)", cursor: "pointer", display: "grid", placeItems: "center", padding: 4, borderRadius: 6 }}
            onClick={() => setIsCollapsed(true)}
            onMouseEnter={e => e.currentTarget.style.background = "var(--surface-3)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            title="Thu gọn"
          >
            <Icon name="chevron-left" size={18} />
          </button>
        )}
      </div>

      {isCollapsed && (
        <button 
          style={{ background: "transparent", border: "none", color: "var(--side-ink-3)", cursor: "pointer", display: "grid", placeItems: "center", padding: 8, margin: "0 auto 10px", borderRadius: 6 }}
          onClick={() => setIsCollapsed(false)}
          onMouseEnter={e => e.currentTarget.style.background = "var(--surface-3)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          title="Mở rộng"
        >
          <Icon name="chevron-right" size={18} />
        </button>
      )}

      <nav className="sidebar-nav">
        {NAV.map(n => {
          if (n.requireHR && !isAtLeastHR(user?.role)) return null;
          return (
            <Link key={n.to} to={n.to} className={`nav-item ${location.pathname === n.to ? "active" : ""}`}>
              <Icon name={n.icon} size={18} />
              <span>{n.label}</span>
              {n.badge && <span className="nav-badge">1</span>}
            </Link>
          );
        })}

        {isAtLeastHR(user?.role) && <div className="nav-label">Quản trị</div>}

        {NAV_ADMIN.map(n => {
          if (n.adminOnly && !isSystemAdmin(user?.role)) return null;
          if (n.requireHR && !isAtLeastHR(user?.role)) return null;
          return (
            <Link key={n.to} to={n.to} className={`nav-item ${location.pathname === n.to ? "active" : ""}`}>
              <Icon name={n.icon} size={18} />
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer" style={{ position: "relative" }} ref={menuRef}>
        {showProfileMenu && (
          <div style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 12,
            width: isCollapsed ? 220 : "calc(100% - 24px)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: "8px 0",
            zIndex: 100,
            overflow: "hidden"
          }}>
            <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.fullName || "Administrator"}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
                {role}
              </div>
            </div>
            
            <div 
              style={{ padding: "8px 16px", cursor: "pointer", fontSize: 13, color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 10 }}
              onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-2)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <Icon name="user" size={15} /> Tài khoản của tôi
            </div>
            
            <div style={{ margin: "8px 0", borderBottom: "1px solid var(--border)" }}></div>
            
            <div 
              style={{ padding: "8px 16px", cursor: "pointer", fontSize: 13, color: "var(--red)", display: "flex", alignItems: "center", gap: 10 }}
              onClick={() => { if (onLogout) onLogout(); setShowProfileMenu(false); }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(224, 40, 40, 0.08)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <Icon name="logout" size={15} /> Đăng xuất
            </div>
          </div>
        )}

        <div className="user-card" onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ cursor: "pointer" }} title="Menu tài khoản">
          <div className="av">{initials}</div>
          <div className="user-info">
            <div className="nm">{user?.fullName || "Administrator"}</div>
            <div className="rl">{role}</div>
          </div>
          <div className="more-icon" style={{ color: 'var(--side-ink-3)' }}>
            <Icon name="more-vertical" size={16} />
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
