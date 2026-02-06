import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { authService } from "../services/authService";
import signalRService from "../services/signalRService";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import StatCard from "../components/dashboard/StatCard";
import LiveFeed from "../components/dashboard/LiveFeed";
import ComplianceChart from "../components/dashboard/ComplianceChart";
import WeeklyAttendance from "../components/dashboard/WeeklyAttendance";
import "./DashboardPage.css";

function DashboardPage() {
  const [user] = useState(() => authService.getUser());
  const [stats, setStats] = useState(null);
  const [connected, setConnected] = useState(false);
  const navigate = useNavigate();

  const loadDashboardData = useCallback(async () => {
    try {
      const statsRes = await api.get("/dashboard/stats");
      setStats(statsRes.data);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      // Set default stats on error to prevent infinite loading
      setStats({
        totalEmployees: 0,
        presentToday: 0,
        violations: 0,
        onlineDevices: 0,
        totalDevices: 0,
      });
    }
  }, []);

  const showNotification = useCallback((title, data) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body: `Phát hiện ${data?.violationCount || 0} vi phạm`,
        icon: "/logo.png",
      });
    }
  }, []);

  const connectSignalR = useCallback(async () => {
    try {
      signalRService.on("ReceiveNewCheckIn", (data) => {
        console.log("New check-in:", data);
        loadDashboardData();
      });

      signalRService.on("ReceiveNewViolation", (data) => {
        console.log("New violation:", data);
        showNotification("Cảnh báo vi phạm mới!", data);
      });

      const connected = await signalRService.start();
      setConnected(connected);

      if (!connected) {
        console.warn(
          "⚠️ SignalR connection failed. Real-time updates disabled.",
        );
      }
    } catch (error) {
      console.error("SignalR connection failed:", error);
      setConnected(false);
    }
  }, [loadDashboardData, showNotification]);

  useEffect(() => {
    const initDashboard = async () => {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      await loadDashboardData();
      await connectSignalR();
    };

    initDashboard();

    return () => {
      signalRService.off("ReceiveNewCheckIn");
      signalRService.off("ReceiveNewViolation");
      // Don't stop SignalR here - let it manage its own lifecycle
    };
  }, [loadDashboardData, connectSignalR]);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <Sidebar user={user} />

      <main className="main-content">
        <Header onLogout={handleLogout} />

        {/* Stats Grid */}
        <div className="stats-grid">
          <StatCard
            icon={Users}
            label="Tổng số nhân viên"
            value={stats?.totalEmployees || "0"}
          />
          <StatCard
            icon={Users}
            label="Đang có mặt"
            value={stats?.presentToday || "0"}
          />
          <StatCard
            icon={AlertTriangle}
            label="Số vi phạm an ninh hôm nay"
            value={stats?.violations || "0"}
            highlight
          />
          <StatCard
            icon={connected ? Wifi : WifiOff}
            label="Thiết bị"
            value={`${stats?.onlineDevices || "0"}/${stats?.totalDevices || "0"}`}
          />
        </div>

        {/* Content Grid */}
        <div className="content-grid">
          <LiveFeed connected={connected} />
          <ComplianceChart />
        </div>

        <WeeklyAttendance />
      </main>
    </div>
  );
}

export default DashboardPage;
