namespace VisionGate.Models;

public enum CheckInStatus
{
    Success,
    Failed,
    Warning
}

public class CheckInRecord
{
    public int CheckInId { get; set; }
    public int EmployeeId { get; set; }
    public int? DeviceId { get; set; }
    public DateTime CheckInTime { get; set; } = DateTime.UtcNow;
    public string? CheckInImageUrl { get; set; }
    public decimal FaceConfidence { get; set; }
    public bool HasPPE { get; set; }
    public int? PPEDetectionId { get; set; }
    public CheckInStatus Status { get; set; } = CheckInStatus.Success;
    public bool IsOfflineSync { get; set; } = false;
    public DateTime? SyncedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Employee Employee { get; set; } = null!;
    public Device? Device { get; set; }
    public PPEDetection? PPEDetection { get; set; }
    public ICollection<Violation> Violations { get; set; } = new List<Violation>();
}
