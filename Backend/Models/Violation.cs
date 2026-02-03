namespace VisionGate.Models;

public enum ViolationType
{
    MissingHelmet,
    MissingGloves,
    MissingSafetyVest,
    MissingSafetyBoots,
    MissingMask,
    UnauthorizedAccess,
    Other
}

public enum Severity
{
    Low,
    Medium,
    High,
    Critical
}

public class Violation
{
    public int ViolationId { get; set; }
    public int EmployeeId { get; set; }
    public int? CheckInId { get; set; }
    public int? PPEDetectionId { get; set; }
    public ViolationType ViolationType { get; set; }
    public Severity Severity { get; set; } = Severity.Medium;
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public bool IsResolved { get; set; } = false;
    public DateTime? ResolvedAt { get; set; }
    public int? ResolvedBy { get; set; }
    public bool NotificationSent { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Employee Employee { get; set; } = null!;
    public CheckInRecord? CheckInRecord { get; set; }
    public PPEDetection? PPEDetection { get; set; }
    public User? ResolvedByUser { get; set; }
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
