namespace VisionGate.DTOs;

public class AIProcessRequest
{
    public int EmployeeId { get; set; }
    public int? DeviceId { get; set; }
    public string CheckInImageUrl { get; set; } = string.Empty;
    public decimal FaceConfidence { get; set; }
    
    // PPE Detection Results from AI
    public bool HasHelmet { get; set; }
    public bool HasGloves { get; set; }
    public bool HasSafetyVest { get; set; }
    public bool HasSafetyBoots { get; set; }
    public bool HasMask { get; set; }
    public decimal PPEConfidenceScore { get; set; }
    public string? DetectionData { get; set; }
}

public class AIProcessResponse
{
    public int CheckInId { get; set; }
    public int? PPEDetectionId { get; set; }
    public bool HasPPE { get; set; }
    public bool HasViolations { get; set; }
    public List<int> ViolationIds { get; set; } = new List<int>();
    public string Message { get; set; } = string.Empty;
}
