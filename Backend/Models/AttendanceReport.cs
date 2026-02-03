namespace VisionGate.Models;

public enum AttendanceStatus
{
    Present,
    Absent,
    Late,
    Early
}

public class AttendanceReport
{
    public int ReportId { get; set; }
    public int EmployeeId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly? CheckInTime { get; set; }
    public TimeOnly? CheckOutTime { get; set; }
    public decimal? TotalHours { get; set; }
    public AttendanceStatus Status { get; set; } = AttendanceStatus.Absent;
    public bool HasViolations { get; set; } = false;
    public string? Notes { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Employee Employee { get; set; } = null!;
}
