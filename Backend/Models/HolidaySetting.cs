namespace VisionGate.Models;

public class HolidaySetting
{
    public int HolidaySettingId { get; set; } = 1;
    public string WeeklyOffDays { get; set; } = "Saturday,Sunday";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}