namespace VisionGate.Models;

public enum SettingDataType
{
    String,
    Integer,
    Boolean,
    JSON
}

public class Setting
{
    public int SettingId { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public SettingDataType DataType { get; set; } = SettingDataType.String;
    public string? Description { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
