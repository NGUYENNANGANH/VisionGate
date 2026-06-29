import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AlertTriangle, Plus } from "lucide-react";
import { authService } from "../services/authService";
import api from "../services/api";
import { uploadService } from "../services/uploadService";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import EmployeeTable from "../components/employees/EmployeeTable";
import EmployeeModal from "../components/employees/EmployeeModal";
import EmployeeFilters from "../components/employees/EmployeeFilters";
import "./EmployeesPage.css";

function EmployeesPage() {
  const [user] = useState(() => authService.getUser());
  const [employees, setEmployees] = useState([]);
  const [departments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    departmentId: null,
    isActive: null,
  });
  const navigate = useNavigate();

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.departmentId) {
        params.append("departmentId", filters.departmentId);
      }
      if (filters.isActive !== null) {
        params.append("isActive", filters.isActive);
      }

      const response = await api.get(`/employees?${params}`);
      let data = response.data;

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        data = data.filter(
          (emp) =>
            emp.fullName.toLowerCase().includes(searchLower) ||
            emp.employeeCode.toLowerCase().includes(searchLower) ||
            emp.email?.toLowerCase().includes(searchLower),
        );
      }

      setEmployees(data);
    } catch (error) {
      console.error("Failed to load employees:", error);
      toast.error("Không thể tải danh sách nhân viên.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const handleAdd = () => {
    setSelectedEmployee(null);
    setShowModal(true);
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    const employee = employees.find((emp) => emp.employeeId === id);
    setConfirmAction({
      type: "inactive",
      id,
      title: "Ghi nhận nghỉ việc",
      message: `Chuyển ${employee?.fullName || "nhân viên này"} sang trạng thái đã nghỉ?`,
      confirmText: "Ghi nghỉ việc",
      danger: false,
    });
  };

  const markEmployeeInactive = async (id) => {
    try {
      await api.delete(`/employees/${id}`);
      setEmployees((currentEmployees) =>
        currentEmployees.map((employee) =>
          employee.employeeId === id ? { ...employee, isActive: false } : employee,
        ),
      );
      toast.success("Đã cập nhật trạng thái nghỉ việc.");
    } catch (error) {
      console.error("Failed to mark employee as inactive:", error);
      toast.error("Không thể cập nhật trạng thái nghỉ việc. Vui lòng thử lại.");
    }
  };

  const handlePermanentDelete = (id) => {
    const employee = employees.find((emp) => emp.employeeId === id);
    setConfirmAction({
      type: "delete",
      id,
      title: "Xóa nhân viên",
      message: `Xóa hẳn ${employee?.fullName || "nhân viên này"} khỏi hệ thống? Hành động này không thể hoàn tác.`,
      confirmText: "Xóa",
      danger: true,
    });
  };

  const deleteEmployeePermanently = async (id) => {
    try {
      await api.delete(`/employees/${id}/permanent`);
      setEmployees((currentEmployees) =>
        currentEmployees.filter((employee) => employee.employeeId !== id),
      );
      toast.success("Đã xóa nhân viên khỏi hệ thống.");
    } catch (error) {
      console.error("Failed to permanently delete employee:", error);
      const message =
        error.response?.data?.message ||
        (error.response?.status === 404
          ? "Không tìm thấy API xóa hẳn. Hãy khởi động lại backend rồi thử lại."
          : null) ||
        "Không thể xóa nhân viên. Vui lòng thử lại.";
      toast.error(message);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    const action = confirmAction;
    setConfirmAction(null);

    if (action.type === "inactive") {
      await markEmployeeInactive(action.id);
      return;
    }

    await deleteEmployeePermanently(action.id);
  };

  const handleSave = async (employeeData) => {
    try {
      if (selectedEmployee) {
        await api.put(`/employees/${selectedEmployee.employeeId}`, {
          ...employeeData,
          employeeId: selectedEmployee.employeeId,
        });
      } else {
        const { newFaces, ...restData } = employeeData;
        const frontFace = newFaces?.find((face) => face.angle === "Front" && face.file);

        if (!frontFace) {
          throw new Error("Vui lòng chọn ảnh trực diện trước khi lưu.");
        }

        const uploadedFaces = [];
        for (const face of newFaces || []) {
          if (!face.file) continue;

          const uploaded = await uploadService.uploadImageWithMetadata(
            face.file,
            `employees/${restData.employeeCode || "new"}`,
          );

          uploadedFaces.push({
            angle: face.angle,
            isPrimary: face.angle === "Front",
            faceImageUrl: uploaded.url,
            cloudinaryPublicId: uploaded.publicId || null,
          });
        }

        const uploadedFrontFace = uploadedFaces.find((face) => face.angle === "Front");
        const response = await api.post("/employees", {
          ...restData,
          faceImageUrl: uploadedFrontFace?.faceImageUrl || "",
        });
        const newEmployeeId = response.data.employeeId;

        for (const face of uploadedFaces) {
          try {
            await api.post(`/employees/${newEmployeeId}/faces`, {
              faceImageUrl: face.faceImageUrl,
              cloudinaryPublicId: face.cloudinaryPublicId,
              isPrimary: face.isPrimary,
              angle: face.angle,
            });
          } catch (err) {
            console.error(`Failed to save angle image ${face.angle}:`, err);
            toast.error(`Không thể lưu ảnh góc ${face.angle}`);
          }
        }
      }

      setShowModal(false);
      loadEmployees();
    } catch (error) {
      console.error("Failed to save employee:", error);
      throw error;
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <Sidebar user={user} onLogout={handleLogout} />

      <div className="main">
        <Header onLogout={handleLogout} />

        <div className="page">
          <div className="page-inner fade-in">
            <div className="page-head">
              <div>
                <h1 className="page-title">Quản lý nhân viên</h1>
                <p className="page-sub">
                  Quản lý thông tin nhân viên và phân quyền truy cập
                </p>
              </div>
              <button className="btn btn-primary" onClick={handleAdd}>
                <Plus size={20} />
                Thêm nhân viên
              </button>
            </div>

            <EmployeeFilters
              filters={filters}
              onFilterChange={setFilters}
              departments={departments}
            />

            <EmployeeTable
              employees={employees}
              departments={departments}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPermanentDelete={handlePermanentDelete}
            />

            {showModal && (
              <EmployeeModal
                employee={selectedEmployee}
                departments={departments}
                onClose={() => setShowModal(false)}
                onSave={handleSave}
              />
            )}

            {confirmAction && (
              <div className="confirm-backdrop" role="presentation">
                <div
                  className="confirm-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="confirm-title"
                >
                  <div className={`confirm-icon ${confirmAction.danger ? "danger" : ""}`}>
                    <AlertTriangle size={22} />
                  </div>
                  <div className="confirm-copy">
                    <h2 id="confirm-title">{confirmAction.title}</h2>
                    <p>{confirmAction.message}</p>
                  </div>
                  <div className="confirm-actions">
                    <button className="btn-ghost" onClick={() => setConfirmAction(null)}>
                      Hủy
                    </button>
                    <button
                      className={confirmAction.danger ? "btn-danger" : "btn-primary"}
                      onClick={handleConfirmAction}
                    >
                      {confirmAction.confirmText}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeesPage;
