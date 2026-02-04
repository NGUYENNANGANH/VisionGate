import { useState, useEffect } from "react";
import { X } from "lucide-react";
import ImageUpload from "../common/ImageUpload";
import "./EmployeeModal.css";

function EmployeeModal({ employee, departments, onClose, onSave }) {
  const [formData, setFormData] = useState({
    employeeCode: "",
    fullName: "",
    email: "",
    phoneNumber: "",
    departmentId: null,
    position: "",
    faceImageUrl: "",
    telegramUserId: "",
    isActive: true,
    startDate: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (employee) {
      setFormData({
        employeeCode: employee.employeeCode || "",
        fullName: employee.fullName || "",
        email: employee.email || "",
        phoneNumber: employee.phoneNumber || "",
        departmentId: employee.departmentId || null,
        position: employee.position || "",
        faceImageUrl: employee.faceImageUrl || "",
        telegramUserId: employee.telegramUserId || "",
        isActive: employee.isActive !== false,
        startDate: employee.startDate
          ? new Date(employee.startDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      });
    }
  }, [employee]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (url) => {
    setFormData((prev) => ({
      ...prev,
      faceImageUrl: url,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const dataToSend = {
        ...formData,
        departmentId: formData.departmentId
          ? parseInt(formData.departmentId)
          : null,
      };
      await onSave(dataToSend);
    } catch (err) {
      setError(err.response?.data?.error || "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{employee ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}

            <div className="form-grid">
              {/* Image Upload - THÊM MỚI */}
              <div className="form-group full-width">
                <ImageUpload
                  value={formData.faceImageUrl}
                  onChange={handleImageChange}
                  label="Ảnh khuôn mặt"
                />
              </div>

              <div className="form-group">
                <label>Mã nhân viên *</label>
                <input
                  type="text"
                  name="employeeCode"
                  value={formData.employeeCode}
                  onChange={handleChange}
                  required
                  placeholder="VD: EMP001"
                />
              </div>

              <div className="form-group">
                <label>Họ tên *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                />
              </div>

              <div className="form-group">
                <label>Số điện thoại</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="0912345678"
                />
              </div>

              <div className="form-group">
                <label>Phòng ban</label>
                <select
                  name="departmentId"
                  value={formData.departmentId || ""}
                  onChange={handleChange}
                >
                  <option value="">Chọn phòng ban</option>
                  {departments.map((dept) => (
                    <option key={dept.departmentId} value={dept.departmentId}>
                      {dept.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Chức vụ</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="Nhân viên"
                />
              </div>

              <div className="form-group">
                <label>Ngày bắt đầu làm việc</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Telegram User ID</label>
                <input
                  type="text"
                  name="telegramUserId"
                  value={formData.telegramUserId}
                  onChange={handleChange}
                  placeholder="123456789"
                />
              </div>

              <div className="form-group full-width">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                  />
                  <span>Đang làm việc</span>
                </label>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmployeeModal;
