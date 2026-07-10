namespace VisionGate.Models;

public class PPEDetection
{
    public int PPEDetectionId { get; set; }
    public int? CheckInId { get; set; }
    public bool HasHelmet { get; set; }
    public bool HasGloves { get; set; }
    public bool HasSafetyVest { get; set; }
    public bool HasSafetyBoots { get; set; }
    public bool HasMask { get; set; }
    public bool OverallCompliance { get; set; }
    public decimal ConfidenceScore { get; set; }
    public string? DetectionData { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [System.Text.Json.Serialization.JsonIgnore] public CheckInRecord? CheckInRecord { get; set; }
    [System.Text.Json.Serialization.JsonIgnore] public ICollection<Violation> Violations { get; set; } = new List<Violation>();
}
