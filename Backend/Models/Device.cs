namespace VisionGate.Models;

public enum DeviceStatus
{
    Online,
    Offline,
    Maintenance
}

public class Device
{
    public int DeviceId { get; set; }
    public string DeviceName { get; set; } = string.Empty;
    public string DeviceCode { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public string? MacAddress { get; set; }
    public DeviceStatus Status { get; set; } = DeviceStatus.Offline;
    public DateTime? LastHeartbeat { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public ICollection<CheckInRecord> CheckInRecords { get; set; } = new List<CheckInRecord>();
}
