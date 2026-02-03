namespace VisionGate.DTOs;

public class AttendanceReportRequest
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int? EmployeeId { get; set; }
    public int? DepartmentId { get; set; }
}

public class ViolationReportRequest
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int? EmployeeId { get; set; }
    public int? DepartmentId { get; set; }
    public int? Severity { get; set; }
    public bool? IsResolved { get; set; }
}

public class ExportExcelRequest
{
    public string ReportType { get; set; } = string.Empty; // "attendance" or "violations"
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int? EmployeeId { get; set; }
    public int? DepartmentId { get; set; }
}
