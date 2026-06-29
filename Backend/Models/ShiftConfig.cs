namespace VisionGate.Models;

public class ShiftConfig
{
    public int ShiftId { get; set; }
    public string ShiftName { get; set; } = string.Empty;
    public TimeOnly StartTime { get; set; } = new TimeOnly(8, 0);
    public TimeOnly EndTime { get; set; } = new TimeOnly(17, 0);
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
}
