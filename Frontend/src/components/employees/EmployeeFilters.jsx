import { Search } from "lucide-react";
import "./EmployeeFilters.css";

function EmployeeFilters({ filters, onFilterChange, departments }) {
  return (
    <div className="toolbar">
      <div className="search" style={{ flex: 1, width: "auto" }}>
        <Search size={16} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
        <input
          placeholder="Tìm theo tên, mã NV, email…"
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
        />
      </div>

      <select
        className="select"
        value={filters.isActive === null ? "" : filters.isActive.toString()}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            isActive: e.target.value === "" ? null : e.target.value === "true",
          })
        }
      >
        <option value="">Tất cả trạng thái</option>
        <option value="true">Đang làm việc</option>
        <option value="false">Đã nghỉ việc</option>
      </select>
    </div>
  );
}

export default EmployeeFilters;
