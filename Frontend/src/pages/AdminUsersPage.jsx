import { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
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
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: "", password: "", fullName: "", email: "", role: 1,
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
    setFormData({ username: "", password: "", fullName: "", email: "", role: 1 });
    setShowModal(true);
  };

  const handleEdit = (userItem) => {
    setSelectedUser(userItem);
    setFormData({ username: userItem.username, password: "", fullName: userItem.fullName, email: userItem.email, role: userItem.role });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tài khoản này?")) return;
    try {
      await api.delete(`/auth/users/${userId}`);
      loadUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Không thể xóa tài khoản. Vui lòng thử lại.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selectedUser) {
        alert("Chức năng cập nhật đang phát triển");
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
    if (role === 0 || role === "SuperAdmin") return "Super Admin";
    if (role === 1 || role === "Admin") return "HR (Admin)";
    if (role === 2 || role === "Viewer") return "Security (Viewer)";
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
                <p className="page-sub">Tạo và quản lý tài khoản truy cập cho HR và Security</p>
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
                      <th>Lần đăng nhập cuối</th>
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
                        <td className="mono" style={{ fontSize: 12, color: userItem.lastLoginAt ? "var(--ink-2)" : "var(--ink-3)" }}>
                          {userItem.lastLoginAt ? new Date(userItem.lastLoginAt).toLocaleString("vi-VN") : "Chưa đăng nhập"}
                        </td>
                        <td>
                          <div className="row-act">
                            <button className="act-btn" onClick={() => handleEdit(userItem)} title="Sửa"><Edit size={15} /></button>
                            <button className="act-btn danger" onClick={() => handleDelete(userItem.userId)} title="Xóa"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                      <input className="input" type="password" value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!selectedUser} />
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
                        onChange={(e) => setFormData({ ...formData, role: parseInt(e.target.value) })}>
                        <option value={0}>Super Admin (IT)</option>
                        <option value={1}>Admin (HR)</option>
                        <option value={2}>Viewer (Security)</option>
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
