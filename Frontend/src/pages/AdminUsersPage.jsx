import { useState, useEffect } from "react";
import { Plus, Edit, Lock, Unlock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import "./AdminUsersPage.css";

const getAvatarStyle = (name) => {
  const hue = (name || "").split("").reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
  return `linear-gradient(135deg, hsl(${hue} 55% 55%), hsl(${hue + 30} 60% 45%))`;
};

const getInitials = (name) => {
  if (!name) return "??";
  const words = name.trim().split(/\s+/);
  return words.slice(-2).map((w) => w[0]).join("").toUpperCase();
};

function AdminUsersPage() {
  const [user] = useState(() => authService.getUser());
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "", password: "", fullName: "", email: "", role: "Admin",
  });
  const navigate = useNavigate();

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/auth/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleLogout = () => { authService.logout(); navigate("/login"); };

  const handleAdd = () => {
    setSelectedUser(null);
    setFormData({ username: "", password: "", fullName: "", email: "", role: "Admin" });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleEdit = (userItem) => {
    setSelectedUser(userItem);
    setFormData({ username: userItem.username, password: "", fullName: userItem.fullName, email: userItem.email, role: userItem.role });
    setShowModal(true);
  };

  const doToggleActive = async () => {
    if (!confirmTarget) return;
    const nextActive = !confirmTarget.isActive;
    const action = nextActive ? "mở khóa" : "khóa";
    try {
      setConfirmLoading(true);
      await api.put(`/auth/users/${confirmTarget.userId}/active`, { isActive: nextActive });
      setConfirmTarget(null);
      loadUsers();
    } catch (error) {
      console.error("Failed to toggle user status:", error);
      alert(error.response?.data?.message || `Không thể ${action} tài khoản. Vui lòng thử lại.`);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selectedUser) {
        const payload = {
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          ...(formData.password ? { password: formData.password } : {}),
        };
        await api.put(`/auth/users/${selectedUser.userId}`, payload);
      } else {
        await api.post("/auth/users", formData);
      }
      setShowModal(false);
      loadUsers();
    } catch (error) {
      console.error("Failed to save user:", error);
      alert(error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const getRoleName = (role) => {
    if (role === 0 || role === "SuperAdmin") return "Quản trị hệ thống";
    if (role === 1 || role === "Admin") return "Quản lý nhân sự";
    if (role === 2 || role === "Viewer") return "Giám sát an ninh";
    return role;
  };

  const getRoleBadgeClass = (role) => {
    if (role === 0 || role === "SuperAdmin") return "badge badge-teal";
    if (role === 1 || role === "Admin") return "badge badge-blue";
    return "badge badge-gray";
  };

  if (!user) return null;

  return (
    <div className="dashboard-container">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="main">
        <Header onLogout={handleLogout} />
        <div className="page">
          <div className="page-inner fade-in">
            <div className="page-head">
              <div>
                <h1 className="page-title">Quản lý tài khoản hệ thống</h1>
              </div>
              <button className="btn btn-primary" onClick={handleAdd}>
                <Plus size={20} /> Tạo tài khoản mới
              </button>
            </div>

            {loading ? (
              <div className="tbl-wrap" style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>Đang tải...</div>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Tên đăng nhập</th>
                      <th>Email</th>
                      <th>Vai trò</th>
                      <th>Trạng thái</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((userItem) => (
                      <tr key={userItem.userId}>
                        <td>
                          <div className="cell-name">
                            <div className="avatar-init" style={{ width: 36, height: 36, fontSize: 13, background: getAvatarStyle(userItem.username) }}>
                              {getInitials(userItem.fullName || userItem.username)}
                            </div>
                            <div>
                              <div className="nm">{userItem.username}</div>
                              <div className="sub">{userItem.fullName}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13, color: "var(--ink-2)" }}>{userItem.email}</td>
                        <td>
                          <span className={getRoleBadgeClass(userItem.role)}>{getRoleName(userItem.role)}</span>
                        </td>
                        <td>
                          {userItem.isActive
                            ? <span className="badge badge-green"><span className="bdot" />Hoạt động</span>
                            : <span className="badge badge-red"><span className="bdot" />Bị khóa</span>}
                        </td>
                        <td>
                          <div className="row-act">
                            {user.userId === userItem.userId ? (
                              <>
                                <button className="act-btn" disabled title="Không thể tự sửa quyền của chính mình ở đây (Vào Hồ sơ cá nhân)" style={{ opacity: .35, cursor: "not-allowed" }}><Edit size={15} /></button>
                                <button className="act-btn" disabled title="Không thể khóa tài khoản đang đăng nhập" style={{ opacity: .35, cursor: "not-allowed" }}><Lock size={15} /></button>
                              </>
                            ) : (
                              <>
                                <button className="act-btn" onClick={() => handleEdit(userItem)} title="Sửa"><Edit size={15} /></button>
                                {userItem.isActive ? (
                                  <button className="act-btn danger" onClick={() => setConfirmTarget(userItem)} title="Khóa tài khoản"><Lock size={15} /></button>
                                ) : (
                                  <button className="act-btn" onClick={() => setConfirmTarget(userItem)} title="Mở khóa tài khoản" style={{ color: "var(--green)" }}><Unlock size={15} /></button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {confirmTarget && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(13,21,38,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
                onClick={() => !confirmLoading && setConfirmTarget(null)}>
                <div style={{ background: "var(--surface)", padding: "28px 26px", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-lg)", width: 420, maxWidth: "calc(100vw - 32px)" }}
                  onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", flexShrink: 0,
                      background: confirmTarget.isActive ? "var(--red-soft)" : "var(--green-soft)",
                      color: confirmTarget.isActive ? "var(--red)" : "var(--green)" }}>
                      {confirmTarget.isActive ? <Lock size={22} /> : <Unlock size={22} />}
                    </div>
                    <h2 style={{ margin: 0, fontFamily: "var(--display)", fontSize: 19, color: "var(--ink)" }}>
                      {confirmTarget.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                    </h2>
                  </div>
                  <p style={{ margin: "0 0 24px", fontSize: 14, lineHeight: 1.6, color: "var(--ink-2)" }}>
                    {confirmTarget.isActive
                      ? <>Tài khoản <b>{confirmTarget.username}</b> ({confirmTarget.fullName}) sẽ không thể đăng nhập cho đến khi được mở khóa. Dữ liệu và lịch sử vẫn được giữ nguyên.</>
                      : <>Tài khoản <b>{confirmTarget.username}</b> ({confirmTarget.fullName}) sẽ có thể đăng nhập trở lại.</>}
                  </p>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setConfirmTarget(null)} disabled={confirmLoading}>Hủy</button>
                    <button type="button" className={confirmTarget.isActive ? "btn btn-primary" : "btn btn-green"} onClick={doToggleActive} disabled={confirmLoading}
                      style={confirmTarget.isActive ? { background: "var(--red)", boxShadow: "0 8px 20px -8px rgba(226,59,84,.5)" } : undefined}>
                      {confirmLoading ? "Đang xử lý…" : (confirmTarget.isActive ? "Khóa tài khoản" : "Mở khóa")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(13,21,38,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
                onClick={() => setShowModal(false)}>
                <div style={{ background: "var(--surface)", padding: "32px 28px", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-lg)", width: 460, maxWidth: "calc(100vw - 32px)" }}
                  onClick={(e) => e.stopPropagation()}>
                  <h2 style={{ margin: "0 0 24px", fontFamily: "var(--display)", fontSize: 20, color: "var(--ink)" }}>
                    {selectedUser ? "Cập nhật tài khoản" : "Tạo tài khoản mới"}
                  </h2>
                  <form onSubmit={handleSave}>
                    <div className="field">
                      <label>TÊN ĐĂNG NHẬP *</label>
                      <input className="input" type="text" value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        required disabled={!!selectedUser} />
                    </div>
                    <div className="field">
                      <label>MẬT KHẨU {selectedUser ? "(để trống nếu không đổi)" : "*"}</label>
                      <div className="input-icon">
                        <Icon name="lock" size={17} />
                        <input className="input login-pass-input" type={showPassword ? "text" : "password"} value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required={!selectedUser} style={{ paddingLeft: 40 }} />
                        <button type="button" className="login-pass-toggle" onClick={() => setShowPassword(s => !s)}>
                          <Icon name={showPassword ? "eye_off" : "eye"} size={17} />
                        </button>
                      </div>
                    </div>
                    <div className="field">
                      <label>HỌ TÊN *</label>
                      <input className="input" type="text" value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
                    </div>
                    <div className="field">
                      <label>EMAIL *</label>
                      <input className="input" type="email" value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                    </div>
                    <div className="field">
                      <label>VAI TRÒ *</label>
                      <select className="input" value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                        <option value="SuperAdmin">Super Admin (IT)</option>
                        <option value="Admin">Admin (HR)</option>
                        <option value="Viewer">Viewer (Security)</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                      <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                      <button type="submit" className="btn btn-primary">
                        {selectedUser ? "Cập nhật" : "Tạo tài khoản"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminUsersPage;
