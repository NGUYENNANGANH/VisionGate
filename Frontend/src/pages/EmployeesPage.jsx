import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { authService } from "../services/authService";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import EmployeeTable from "../components/employees/EmployeeTable";
import EmployeeModal from "../components/employees/EmployeeModal";
import EmployeeFilters from "../components/employees/EmployeeFilters";
import "./EmployeesPage.css";

function EmployeesPage() {
  const [user] = useState(() => authService.getUser());
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
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
      if (filters.departmentId)
        params.append("departmentId", filters.departmentId);
      if (filters.isActive !== null)
        params.append("isActive", filters.isActive);

      const response = await api.get(`/employees?${params}`);
      let data = response.data;

      // Filter by search
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
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadDepartments = useCallback(async () => {
    try {
      const response = await api.get("/departments");
      setDepartments(response.data);
    } catch (error) {
      console.error("Failed to load departments:", error);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

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

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa nhân viên này?")) {
      return;
    }

    try {
      await api.delete(`/employees/${id}`);
      loadEmployees();
    } catch (error) {
      console.error("Failed to delete employee:", error);
      alert("Không thể xóa nhân viên. Vui lòng thử lại.");
    }
  };

  const handleSave = async (employeeData) => {
    try {
      if (selectedEmployee) {
        // Update
        await api.put(`/employees/${selectedEmployee.employeeId}`, {
          ...employeeData,
          employeeId: selectedEmployee.employeeId,
        });
      } else {
        // Create
        await api.post("/employees", employeeData);
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
      <Sidebar user={user} />

      <main className="main-content">
        <Header onLogout={handleLogout} />

        <div className="page-header">
          <div>
            <h1>Quản lý nhân viên</h1>
            <p className="page-description">
              Quản lý thông tin nhân viên và phân quyền truy cập
            </p>
          </div>
          <button className="btn-primary" onClick={handleAdd}>
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
        />

        {showModal && (
          <EmployeeModal
            employee={selectedEmployee}
            departments={departments}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
          />
        )}
      </main>
    </div>
  );
}

export default EmployeesPage;
