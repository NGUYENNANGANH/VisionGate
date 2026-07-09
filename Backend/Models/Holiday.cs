namespace VisionGate.Models;

public class Holiday
{
    public int HolidayId { get; set; }
    public DateTime Date { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "Holiday";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
