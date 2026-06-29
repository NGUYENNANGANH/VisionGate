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


public class Violation
{
    public int ViolationId { get; set; }
    public int EmployeeId { get; set; }
    public int? PPEDetectionId { get; set; }
    public ViolationType ViolationType { get; set; }
    public bool IsResolved { get; set; } = false;
    public DateTime? ResolvedAt { get; set; }
    public int? ResolvedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Employee? Employee { get; set; }
    public PPEDetection? PPEDetection { get; set; }
    public User? ResolvedByUser { get; set; }
}
