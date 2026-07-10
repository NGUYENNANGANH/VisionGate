import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authService } from "../services/authService";
import signalRService from "../services/signalRService";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import { AICameraFeed } from "../components/ui/AICameraFeed";
import { Icon, VGBadge, VGAvatar } from "../components/ui/Icon";
import "./DashboardPage.css";



function StatCard({ icon, tone, label, value, sub, trend, trendDir }) {
  const colors = { teal: 'var(--primary)', green: 'var(--green)', red: 'var(--red)', blue: 'var(--blue)' };
  const softColors = { teal: 'var(--primary-soft-2)', green: 'var(--green-soft)', red: 'var(--red-soft)', blue: 'var(--blue-soft)' };
  const tc = colors[tone];
  const tcs = softColors[tone];
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: tcs, color: tc, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={22} />
        </div>
        <div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600 }}>{label}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{sub}</div>}
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1, color: 'var(--ink)' }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function RadialGauge({ value = 92, size = 168 }) {
  const r = size / 2 - 16, c = 2 * Math.PI * r;
  const segs = [{ v: 0.42, color: '#15a35a' }, { v: 0.34, color: '#0ea39e' }, { v: 0.24, color: '#22d3ee' }];
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={13} />
        {segs.map((s, i) => {
          const len = c * s.v * (value / 100);
          const off = -acc * c * (value / 100);
          acc += s.v;
          return <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={13} strokeLinecap="round" strokeDasharray={`${len} ${c}`} strokeDashoffset={off} />;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 38, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1 }}>
            {value}<span style={{ fontSize: 18, color: 'var(--ink-3)' }}>%</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', letterSpacing: '.08em', marginTop: 4 }}>TỐT</div>
        </div>
      </div>
    </div>
  );
}

function ComplianceBar({ label, pct, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: 'var(--ink-2)', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: color }} />
      </div>
    </div>
  );
}

const EMPTY_DASHBOARD_STATS = {
  totalEmployees: 0,
  todayCheckIns: 0,
  todayViolations: 0,
  onlineDevices: 0,
  totalDevices: 0,
  ppeComplianceRate: 100,
  helmetComplianceRate: 100,
  vestComplianceRate: 100,
  shoesComplianceRate: 100,
};

const normalizeDashboardStats = (data = {}) => ({
  totalEmployees: data.totalEmployees ?? data.TotalEmployees ?? 0,
  todayCheckIns: data.todayCheckIns ?? data.TodayCheckIns ?? 0,
  todayViolations: data.todayViolations ?? data.TodayViolations ?? 0,
  onlineDevices: data.onlineDevices ?? data.OnlineDevices ?? 0,
  totalDevices: data.totalDevices ?? data.TotalDevices ?? 0,
  ppeComplianceRate: data.ppeComplianceRate ?? data.PPEComplianceRate ?? 100,
  helmetComplianceRate: data.helmetComplianceRate ?? data.HelmetComplianceRate ?? 100,
  vestComplianceRate: data.vestComplianceRate ?? data.VestComplianceRate ?? 100,
  shoesComplianceRate: data.shoesComplianceRate ?? data.ShoesComplianceRate ?? 100,
});

const isRejectedPPE = (item) => item?.status === "RejectedPPE" || item?.status === 1;

function DashboardPage() {
  const [user] = useState(() => authService.getUser());
  const [stats, setStats] = useState(EMPTY_DASHBOARD_STATS);
  const [connected, setConnected] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const navigate = useNavigate();

  const loadDashboardData = useCallback(async () => {
    try {
      const res = await api.get("/dashboard/stats");
      setStats(normalizeDashboardStats(res.data));
    } catch {
      setStats(EMPTY_DASHBOARD_STATS);
    }
  }, []);

  const loadRecentActivity = useCallback(async () => {
    try {
      const [checkInsRes, violationsRes] = await Promise.all([
        api.get("/checkins?pageSize=20"),
        api.get("/violations?isResolved=false"),
      ]);
      const checkInItems = checkInsRes.data || [];
      const rejectedPpeDetectionIds = new Set(
        checkInItems
          .filter(isRejectedPPE)
          .map((item) => item.ppeDetection?.ppeDetectionId)
          .filter(Boolean),
      );
      const checkins = checkInItems.map(item => ({
        name: item.employee?.fullName || 'Chưa xác định',
        photo: item.employee?.faceImageUrl || null,
        loc: item.device?.location || 'Thiết bị đã xóa',
        status: isRejectedPPE(item) ? 'rejected' : ((item.ppeDetection && item.ppeDetection.overallCompliance) ? 'ok' : 'violation'),
        time: item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—',
        _raw: new Date(item.checkInTime),
      }));
      const violations = (violationsRes.data || []).filter(item => !rejectedPpeDetectionIds.has(item.ppeDetectionId)).map(item => ({
        name: item.employee?.fullName || 'Chưa xác định',
        photo: item.employee?.faceImageUrl || null,
        loc: item.deviceLocation || 'Thiết bị đã xóa',
        status: item.violationType === 5 ? 'unknown' : 'violation',
        time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—',
        _raw: new Date(item.createdAt),
      }));
      const combined = [...checkins, ...violations]
        .sort((a, b) => b._raw - a._raw)
        .slice(0, 5);
      setRecentActivity(combined);
    } catch {
      setRecentActivity([]);
    }
  }, []);

  const showNotification = useCallback((title, data) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body: `Phát hiện ${data?.violationCount || 0} vi phạm` });
    }
  }, []);

  const connectSignalR = useCallback(async () => {
    try {
      signalRService.on("ReceiveNewCheckIn", () => { loadDashboardData(); loadRecentActivity(); });
      signalRService.on("ReceiveNewViolation", (data) => { showNotification("Cảnh báo vi phạm mới!", data); loadRecentActivity(); });
      signalRService.on("connected", (msg) => { console.log("SignalR Server says:", msg); });
      const ok = await signalRService.start();
      setConnected(ok);
    } catch {
      setConnected(false);
    }
  }, [loadDashboardData, showNotification]);

  useEffect(() => {
    const init = async () => {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      await loadDashboardData();
      await loadRecentActivity();
      await connectSignalR();
    };
    init();
    return () => {
      signalRService.off("ReceiveNewCheckIn");
      signalRService.off("ReceiveNewViolation");
    };
  }, [loadDashboardData, loadRecentActivity, connectSignalR]);

  const handleLogout = () => { authService.logout(); navigate("/login"); };
  if (!user) return null;

  const statusColor = s => s === 'ok' ? 'var(--green)' : s === 'violation' || s === 'rejected' ? 'var(--amber)' : 'var(--red)';
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      const today = new Date().toISOString().split('T')[0];
      const res = await api.post('/reports/export-excel',
        {
          reportType: 'overview',
          fromDate: today,
          toDate: today,
        },
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bao-cao-an-ninh-${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Xuất báo cáo thành công!");
    } catch (err) {
      toast.error('Lỗi khi xuất báo cáo: ' + (err.response?.data?.message || err.message));
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
                <h1 className="page-title">Tổng quan an ninh</h1>
                <p className="page-sub">Giám sát thời gian thực · {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
              </div>
              <button className="btn btn-ghost" onClick={handleExport} disabled={exporting}>
                <Icon name="download" size={16} />
                {exporting ? "Đang xuất..." : "Xuất báo cáo"}
              </button>
            </div>

            {/* KPI cards */}
            <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 18 }}>
              <StatCard icon="users" tone="teal" value={stats?.totalEmployees ?? '—'} label="Nhân viên đang làm" />
              <StatCard icon="check" tone="green" value={stats?.todayCheckIns ?? '—'} label="Đang có mặt" sub="Hôm nay" />
              <StatCard icon="alert" tone="red" value={stats?.todayViolations ?? '—'} label="Vi phạm hôm nay" />
              <StatCard icon="devices" tone="blue" value={`${stats?.onlineDevices ?? 0}/${stats?.totalDevices ?? 0}`} label="Thiết bị trực tuyến" sub={connected ? 'SignalR kết nối' : 'Ngoại tuyến'} />
            </div>

            {/* Main grid */}
            <div className="grid" style={{ gridTemplateColumns: '1.55fr 1fr' }}>
              {/* Left: live feed + activity */}
              <div className="grid">
                {/* Recent activity */}
                <div className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <h3 style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 700, margin: 0 }}>Hoạt động gần đây</h3>
                    <a href="/access-logs" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary-700)' }}>Xem tất cả</a>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {recentActivity.length === 0
                    ? <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Chưa có hoạt động nào</div>
                    : recentActivity.map((a, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 0', borderBottom: i < recentActivity.length - 1 ? '1px solid var(--border-2)' : 'none' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          {a.photo
                            ? <img src={a.photo} alt={a.name} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
                            : a.status === 'unknown'
                              ? <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--surface-3)', display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }}><Icon name="user" size={18} /></div>
                              : <VGAvatar name={a.name} size={38} />
                          }
                          <span style={{ position: 'absolute', right: -1, bottom: -1, width: 13, height: 13, borderRadius: 99, border: '2px solid var(--surface)', background: statusColor(a.status), display: 'block' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{a.name}</div>
                          <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{a.loc}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <VGBadge tone={a.status === 'ok' ? 'green' : (a.status === 'violation' || a.status === 'rejected') ? 'amber' : 'red'}>
                            {a.status === 'ok' ? 'Hợp lệ' : a.status === 'rejected' ? 'Vi ph\u1EA1m PPE' : a.status === 'violation' ? 'Vi ph\u1EA1m PPE' : 'Lạ mặt'}
                          </VGBadge>
                          <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 5 }}>{a.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: compliance + system status */}
              <div className="grid">
                <div className="card" style={{ padding: 20 }}>
                  <h3 style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Tuân thủ an toàn</h3>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: 0 }}>Tỷ lệ trang bị bảo hộ lao động</p>
                  <div style={{ display: 'grid', placeItems: 'center', padding: '14px 0 18px' }}>
                    <RadialGauge value={stats?.ppeComplianceRate ?? 100} />
                  </div>
                  <div className="grid" style={{ gap: 14 }}>
                    <ComplianceBar label="Mũ bảo hộ" pct={stats?.helmetComplianceRate ?? 100} color="var(--green)" />
                    <ComplianceBar label="Áo phản quang" pct={stats?.vestComplianceRate ?? 100} color="var(--primary)" />
                    <ComplianceBar label="Giày bảo hộ" pct={stats?.shoesComplianceRate ?? 100} color="var(--cyan)" />
                  </div>
                </div>

                <div className="card" style={{ padding: 20 }}>
                  <h3 style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>Trạng thái hệ thống</h3>
                  <div className="grid" style={{ gap: 11 }}>
                    {[
                      ['Máy chủ nhận diện AI', 'green', 'Hoạt động'],
                      ['Cơ sở dữ liệu', 'green', 'Hoạt động'],
                      ['SignalR', connected ? 'green' : 'red', connected ? 'Kết nối' : 'Ngắt kết nối'],
                      [`Camera (${stats?.onlineDevices ?? 0}/${stats?.totalDevices ?? 0})`, (stats?.onlineDevices ?? 0) > 0 ? 'green' : 'red', (stats?.onlineDevices ?? 0) > 0 ? 'Online' : 'Offline'],
                    ].map(([label, tone, text], i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)' }}>
                          <span style={{ width: 8, height: 8, borderRadius: 99, background: tone === 'green' ? 'var(--green)' : 'var(--red)', display: 'inline-block', flexShrink: 0 }} />
                          {label}
                        </div>
                        <VGBadge tone={tone} dot={false}>{text}</VGBadge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
