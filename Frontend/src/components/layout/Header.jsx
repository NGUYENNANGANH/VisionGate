import { Bell, Search, Settings, LogOut } from "lucide-react";
import "./Header.css";

function Header({ onLogout }) {
  return (
    <header className="dashboard-header">
      <div className="header-left">
        <h1>VisionGate</h1>
      </div>
      <div className="header-right">
        <div className="search-box">
          <Search size={18} />
          <input type="text" placeholder="Quick search..." />
        </div>
        <button className="icon-btn">
          <Bell size={20} />
          <span className="badge">3</span>
        </button>
        <button className="icon-btn">
          <Settings size={20} />
        </button>
        <button className="icon-btn" onClick={onLogout}>
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}

export default Header;
