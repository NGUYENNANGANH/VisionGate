import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import api from "../../services/api";
import { uploadService } from "../../services/uploadService";
import "./EmployeeModal.css";

const ANGLES = [
  { id: "Front", label: "Trực diện" },
  { id: "Left", label: "Mặt trái" },
  { id: "Right", label: "Mặt phải" },
  { id: "Up", label: "Nhìn lên" },
  { id: "Down", label: "Nhìn xuống" },
];

function EmployeeModal({ employee, onClose, onSave }) {
  const [formData, setFormData] = useState({
    employeeCode: "",
    fullName: "",
    email: "",
    phoneNumber: "",
    departmentId: null,
    shiftId: 1,
    faceImageUrl: "",
    isActive: true,
    startDate: new Date().toISOString().split("T")[0],
  });
  const [faces, setFaces] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [facesLoading, setFacesLoading] = useState(false);
  const [uploadingAngle, setUploadingAngle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const facesRef = useRef([]);

  const loadFaces = async (employeeId) => {
    setFacesLoading(true);
    try {
      const response = await api.get(`/employees/${employeeId}/faces`);
      setFaces(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách ảnh nhận diện.");
    } finally {
      setFacesLoading(false);
    }
  };

  const getLocalDateString = (dateString) => {
    const d = dateString ? new Date(dateString) : new Date();
    if (isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];
  };

  useEffect(() => {
    api.get("/shiftconfigs").then(res => setShifts(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (employee) {
      setFormData({
        employeeCode: employee.employeeCode || "",
        fullName: employee.fullName || "",
        email: employee.email || "",
        phoneNumber: employee.phoneNumber || "",
        departmentId: employee.departmentId || null,
        shiftId: employee.shiftId || 1,
        faceImageUrl: employee.faceImageUrl || "",
        isActive: employee.isActive !== false,
        startDate: getLocalDateString(employee.startDate),
      });
      loadFaces(employee.employeeId);
    } else {
      setFaces([]);
      setFormData((prev) => ({
        ...prev,
        faceImageUrl: "",
        shiftId: 1,
        isActive: true,
        startDate: getLocalDateString(),
      }));
    }
  }, [employee]);

  useEffect(() => {
    facesRef.current = faces;
  }, [faces]);

  useEffect(() => {
    return () => {
      facesRef.current.forEach((face) => {
        if (face.previewUrl && face.isPending) {
          URL.revokeObjectURL(face.previewUrl);
        }
      });
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const upsertFace = (face) => {
    setFaces((currentFaces) => {
      const existingFace = currentFaces.find((item) => item.angle === face.angle);
      if (existingFace?.previewUrl && existingFace.isPending) {
        URL.revokeObjectURL(existingFace.previewUrl);
      }
      const withoutSameAngle = currentFaces.filter((item) => item.angle !== face.angle);
      return [...withoutSameAngle, face];
    });

    if (face.angle === "Front") {
      setFormData((prev) => ({
        ...prev,
        faceImageUrl: face.faceImageUrl || face.previewUrl || "",
      }));
    }
  };

  const handleAngleFaceUpload = async (e, angle) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setUploadingAngle(angle);
    setError("");

    try {
      if (employee) {
        const uploaded = await uploadService.uploadImageWithMetadata(
          file,
          `employees/${employee.employeeCode || employee.employeeId}`,
        );
        const response = await api.post(`/employees/${employee.employeeId}/faces`, {
          faceImageUrl: uploaded.url,
          cloudinaryPublicId: uploaded.publicId || null,
          isPrimary: angle === "Front",
          angle,
        });
        upsertFace(response.data);
      } else {
        const previewUrl = URL.createObjectURL(file);
        upsertFace({
          id: `pending-${angle}`,
          employeeId: 0,
          faceImageUrl: "",
          cloudinaryPublicId: null,
          file,
          previewUrl,
          isPrimary: angle === "Front",
          angle,
          isPending: true,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Không thêm được ảnh nhận diện.");
    } finally {
      setUploadingAngle("");
      e.target.value = "";
    }
  };

  const handleDeleteFace = async (face) => {
    setError("");

    if (!employee || face.isPending) {
      if (face.previewUrl && face.isPending) {
        URL.revokeObjectURL(face.previewUrl);
      }
      setFaces((currentFaces) => currentFaces.filter((item) => item.angle !== face.angle));
      if (face.angle === "Front") {
        setFormData((prev) => ({ ...prev, faceImageUrl: "" }));
      }
      return;
    }

    try {
      await api.delete(`/employees/${employee.employeeId}/faces/${face.id}`);
      await loadFaces(employee.employeeId);
    } catch (err) {
      setError(err.response?.data?.message || "Không xóa được ảnh nhận diện.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const frontFace = faces.find((face) => face.angle === "Front");
      const dataToSend = {
        ...formData,
        faceImageUrl: frontFace?.faceImageUrl || "",
        departmentId: formData.departmentId
          ? parseInt(formData.departmentId)
          : null,
        shiftId: parseInt(formData.shiftId) || 1,
        newFaces: !employee ? faces : undefined,
      };
      await onSave(dataToSend);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{employee ? "Chỉnh sửa thông tin nhân viên" : "Thêm nhân viên mới"}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}

            <div className="form-grid">
              <div className="form-group full-width">
                <div className="face-manager">
                  <div className="face-manager-head">
                    <label>Ảnh nhận diện theo góc</label>
                    <span>{faces.length}/5 ảnh</span>
                  </div>

                  {facesLoading ? (
                    <div className="face-empty">Đang tải ảnh...</div>
                  ) : (
                    <div className="face-grid-angles">
                      {ANGLES.map((angleObj) => {
                        const faceForAngle = faces.find((face) => face.angle === angleObj.id);
                        const isUploading = uploadingAngle === angleObj.id;

                        return (
                          <div className="face-angle-card" key={angleObj.id}>
                            <div className="face-angle-label">{angleObj.label}</div>
                            {faceForAngle ? (
                              <div className="face-item">
                                <img src={faceForAngle.faceImageUrl || faceForAngle.previewUrl} alt={angleObj.label} />
                                {angleObj.id === "Front" && <span className="face-primary">Chính</span>}
                                <button
                                  type="button"
                                  className="face-delete"
                                  onClick={() => handleDeleteFace(faceForAngle)}
                                  title="Xóa ảnh"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="face-upload-box">
                                <label className="face-upload-label">
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    onChange={(event) => handleAngleFaceUpload(event, angleObj.id)}
                                    style={{ display: "none" }}
                                    disabled={Boolean(uploadingAngle)}
                                  />
                                  <Plus size={16} />
                                  <span>{isUploading ? "Đang tải..." : "Thêm ảnh"}</span>
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                  disabled={!!employee}
                  title={employee ? "Không thể thay đổi mã nhân viên sau khi tạo" : ""}
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
                <label>Ngày bắt đầu làm việc</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Ca làm việc mặc định *</label>
                <select
                  name="shiftId"
                  value={formData.shiftId}
                  onChange={handleChange}
                  required
                >
                  {shifts.map(shift => (
                    <option key={shift.shiftId} value={shift.shiftId}>
                      {shift.shiftName} ({shift.startTime.substring(0, 5)} - {shift.endTime.substring(0, 5)})
                    </option>
                  ))}
                </select>
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
            <button type="submit" className="btn-primary" disabled={loading || Boolean(uploadingAngle)}>
              {loading ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmployeeModal;
