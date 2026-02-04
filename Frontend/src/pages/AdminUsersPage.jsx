import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import "./AdminUsersPage.css";

function AdminUsersPage() {
  const [user] = useState(() => authService.getUser());
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    role: 1,
  });
  const navigate = useNavigate();

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/auth/users"); // Cần tạo endpoint này ở backend
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const handleAdd = () => {
    setSelectedUser(null);
    setFormData({
      username: "",
      password: "",
      fullName: "",
      email: "",
      role: 1,
    });
    setShowModal(true);
  };

  const handleEdit = (userItem) => {
    setSelectedUser(userItem);
    setFormData({
      username: userItem.username,
      password: "", // Không hiển thị password cũ
      fullName: userItem.fullName,
      email: userItem.email,
      role: userItem.role,
    });
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
        // Update (nếu cần endpoint riêng)
        alert("Chức năng cập nhật đang phát triển");
      } else {
        // Create
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

  if (!user) return null;

  return (
    <div className="admin-users-container">
      <Sidebar user={user} />

      <main className="main-content">
        <Header onLogout={handleLogout} />

        <div className="page-header">
          <div>
            <h1>Quản lý tài khoản hệ thống</h1>
            <p className="page-description">
              Tạo và quản lý tài khoản truy cập cho HR và Security
            </p>
          </div>
          <button className="btn-primary" onClick={handleAdd}>
            <Plus size={20} />
            Tạo tài khoản mới
          </button>
        </div>

        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Tên đăng nhập</th>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Lần đăng nhập cuối</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userItem) => (
                  <tr key={userItem.userId}>
                    <td className="username">{userItem.username}</td>
                    <td>{userItem.fullName}</td>
                    <td>{userItem.email}</td>
                    <td>
                      <span className={`role-badge role-${userItem.role}`}>
                        {getRoleName(userItem.role)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${userItem.isActive ? "active" : "inactive"}`}
                      >
                        {userItem.isActive ? "Hoạt động" : "Bị khóa"}
                      </span>
                    </td>
                    <td>
                      {userItem.lastLoginAt
                        ? new Date(userItem.lastLoginAt).toLocaleString("vi-VN")
                        : "Chưa đăng nhập"}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => handleEdit(userItem)}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDelete(userItem.userId)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {selectedUser ? "Cập nhật tài khoản" : "Tạo tài khoản mới"}
                </h2>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Tên đăng nhập *</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      required
                      disabled={!!selectedUser}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      Mật khẩu {selectedUser ? "(để trống nếu không đổi)" : "*"}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required={!selectedUser}
                    />
                  </div>
                  <div className="form-group">
                    <label>Họ tên *</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Vai trò *</label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          role: parseInt(e.target.value),
                        })
                      }
                    >
                      <option value={0}>Super Admin (IT)</option>
                      <option value={1}>Admin (HR)</option>
                      <option value={2}>Viewer (Security)</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="btn-primary">
                    {selectedUser ? "Cập nhật" : "Tạo tài khoản"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminUsersPage;
