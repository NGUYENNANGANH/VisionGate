import { useLocation } from "react-router-dom";
import { Icon } from "../ui/Icon";
import ConnectionStatus from "../common/ConnectionStatus";
import "./Header.css";

const CRUMBS = {
  "/dashboard": "Dashboard",
  "/employees": "Quản lý nhân viên",
  "/attendance-reports": "Báo cáo điểm danh",
  "/access-logs": "Lịch sử",
  "/devices": "Quản lý thiết bị",
  "/admin/users": "Tài khoản hệ thống",
  "/settings": "Cài đặt hệ thống",
};

function Header({ onLogout }) {
  const location = useLocation();
  const crumb = CRUMBS[location.pathname] || "VisionGate";

  return (
    <header className="topbar">
      <div className="crumb">
        <span>VisionGate</span>
        <Icon name="chevright" size={14} />
        <b>{crumb}</b>
      </div>

      <div style={{ flex: 1 }} />

      <ConnectionStatus />

      <button className="icon-btn" title="Thông báo">
        <Icon name="bell" size={18} />
        <span className="dot" />
      </button>

    </header>
  );
}

export default Header;
