import { Edit, Trash2, User } from "lucide-react";
import "./EmployeeTable.css";

function EmployeeTable({ employees, departments, loading, onEdit, onDelete }) {
  const getDepartmentName = (deptId) => {
    const dept = departments.find((d) => d.departmentId === deptId);
    return dept?.departmentName || "N/A";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  if (loading) {
    return (
      <div className="employee-table-loading">
        <div className="spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="employee-table-empty">
        <User size={48} />
        <p>Không có nhân viên nào</p>
      </div>
    );
  }

  return (
    <div className="employee-table-container">
      <table className="employee-table">
        <thead>
          <tr>
            <th>Mã NV</th>
            <th>Họ tên</th>
            <th>Email</th>
            <th>Số điện thoại</th>
            <th>Phòng ban</th>
            <th>Chức vụ</th>
            <th>Ngày vào làm</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.employeeId}>
              <td className="employee-code">{employee.employeeCode}</td>
              <td className="employee-name">
                <div className="name-cell">
                  <div className="avatar">
                    {employee.faceImageUrl ? (
                      <img
                        src={employee.faceImageUrl}
                        alt={employee.fullName}
                      />
                    ) : (
                      employee.fullName.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  {employee.fullName}
                </div>
              </td>
              <td>{employee.email || "N/A"}</td>
              <td>{employee.phoneNumber || "N/A"}</td>
              <td>{getDepartmentName(employee.departmentId)}</td>
              <td>{employee.position || "N/A"}</td>
              <td>{formatDate(employee.startDate)}</td>
              <td>
                <span
                  className={`status-badge ${employee.isActive ? "active" : "inactive"}`}
                >
                  {employee.isActive ? "Đang làm" : "Đã nghỉ"}
                </span>
              </td>
              <td>
                <div className="action-buttons">
                  <button
                    className="btn-icon btn-edit"
                    onClick={() => onEdit(employee)}
                    title="Chỉnh sửa"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="btn-icon btn-delete"
                    onClick={() => onDelete(employee.employeeId)}
                    title="Xóa"
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
  );
}

export default EmployeeTable;
