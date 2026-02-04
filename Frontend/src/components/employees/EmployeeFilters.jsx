import { Search, Filter } from "lucide-react";
import "./EmployeeFilters.css";

function EmployeeFilters({ filters, onFilterChange, departments }) {
  return (
    <div className="employee-filters">
      <div className="search-filter">
        <Search size={18} />
        <input
          type="text"
          placeholder="Tìm kiếm theo tên, mã NV, email..."
          value={filters.search}
          onChange={(e) =>
            onFilterChange({ ...filters, search: e.target.value })
          }
        />
      </div>

      <div className="filter-group">
        <Filter size={18} />

        <select
          value={filters.departmentId || ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              departmentId: e.target.value ? parseInt(e.target.value) : null,
            })
          }
        >
          <option value="">Tất cả phòng ban</option>
          {departments.map((dept) => (
            <option key={dept.departmentId} value={dept.departmentId}>
              {dept.departmentName}
            </option>
          ))}
        </select>

        <select
          value={filters.isActive === null ? "" : filters.isActive.toString()}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              isActive:
                e.target.value === "" ? null : e.target.value === "true",
            })
          }
        >
          <option value="">Tất cả trạng thái</option>
          <option value="true">Đang làm việc</option>
          <option value="false">Đã nghỉ việc</option>
        </select>
      </div>
    </div>
  );
}

export default EmployeeFilters;
