namespace VisionGate.Models;

public enum GateDirection
{
    In = 0,
    Out = 1
}

public class Device
{
    public int DeviceId { get; set; }
    public string DeviceName { get; set; } = string.Empty;
    public string DeviceCode { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public string? RtspUsername { get; set; }
    public string? RtspPassword { get; set; }
    public int RtspPort { get; set; } = 554;
    public GateDirection GateDirection { get; set; } = GateDirection.In;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [System.Text.Json.Serialization.JsonIgnore] public ICollection<CheckInRecord> CheckInRecords { get; set; } = new List<CheckInRecord>();
}
