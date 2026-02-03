namespace VisionGate.Models;

public class Employee
{
    public int EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public int? DepartmentId { get; set; }
    public string? Position { get; set; }
    public string? FaceImageUrl { get; set; }
    public byte[]? FaceEmbedding { get; set; }
    public string? TelegramUserId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Department? Department { get; set; }
    public ICollection<CheckInRecord> CheckInRecords { get; set; } = new List<CheckInRecord>();
    public ICollection<PPEDetection> PPEDetections { get; set; } = new List<PPEDetection>();
    public ICollection<Violation> Violations { get; set; } = new List<Violation>();
    public ICollection<AttendanceReport> AttendanceReports { get; set; } = new List<AttendanceReport>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
