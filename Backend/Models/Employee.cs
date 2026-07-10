namespace VisionGate.Models;

public class Employee
{
    public int EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? FaceImageUrl { get; set; }
    [System.Text.Json.Serialization.JsonIgnore] public byte[]? FaceEmbedding { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime StartDate { get; set; } = DateTime.UtcNow.Date;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public int ShiftId { get; set; } = 1;
    public ShiftConfig? ShiftConfig { get; set; }
    [System.Text.Json.Serialization.JsonIgnore] public ICollection<CheckInRecord> CheckInRecords { get; set; } = new List<CheckInRecord>();
    [System.Text.Json.Serialization.JsonIgnore] public ICollection<Violation> Violations { get; set; } = new List<Violation>();
    [System.Text.Json.Serialization.JsonIgnore] public ICollection<EmployeeFace> EmployeeFaces { get; set; } = new List<EmployeeFace>();
}
