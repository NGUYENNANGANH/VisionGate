import { Edit, Trash2 } from "lucide-react";
import "./EmployeeTable.css";

const getAvatarStyle = (name) => {
  const hue = (name || "").split("").reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
  return `linear-gradient(135deg, hsl(${hue} 55% 55%), hsl(${hue + 30} 60% 45%))`;
};

const getInitials = (name) => {
  if (!name) return "??";
  const words = name.trim().split(/\s+/);
  const last2 = words.slice(-2);
  return last2.map((w) => w[0]).join("").toUpperCase();
};

function EmployeeTable({ employees, departments, loading, onEdit, onDelete }) {
  const getDeptName = (deptId) => {
    const dept = departments.find((d) => d.departmentId === deptId);
    return dept?.departmentName || "N/A";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  if (loading)
    return (
      <div className="tbl-wrap" style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>
        Đang tải dữ liệu...
      </div>
    );

  if (employees.length === 0)
    return (
      <div className="tbl-wrap" style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>
        Không có nhân viên nào
      </div>
    );

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Mã NV</th>
            <th>Họ tên</th>
            <th>Liên hệ</th>
            <th>Ngày vào làm</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => {
            const hue = (emp.fullName || "").split("").reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
            return (
              <tr key={emp.employeeId}>
                <td className="id-cell">{emp.employeeCode}</td>
                <td>
                  <div className="cell-name">
                    {emp.faceImageUrl ? (
                      <img
                        src={emp.faceImageUrl}
                        alt={emp.fullName}
                        style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        className="avatar-init"
                        style={{ width: 38, height: 38, fontSize: 14, background: getAvatarStyle(emp.fullName) }}
                      >
                        {getInitials(emp.fullName)}
                      </div>
                    )}
                    <div>
                      <div className="nm">{emp.fullName}</div>
                      <div className="sub">{emp.position || "Nhân viên"}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{emp.email || "—"}</div>
                  <div className="mono" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                    {emp.phoneNumber || "—"}
                  </div>
                </td>
                <td className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>
                  {formatDate(emp.startDate)}
                </td>
                <td>
                  {emp.isActive ? (
                    <span className="badge badge-green">
                      <span className="bdot" />
                      Đang làm
                    </span>
                  ) : (
                    <span className="badge badge-red">
                      <span className="bdot" />
                      Đã nghỉ
                    </span>
                  )}
                </td>
                <td>
                  <div className="row-act">
                    <button className="act-btn" onClick={() => onEdit(emp)} title="Sửa">
                      <Edit size={15} />
                    </button>
                    <button className="act-btn danger" onClick={() => onDelete(emp.employeeId)} title="Xóa">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default EmployeeTable;
