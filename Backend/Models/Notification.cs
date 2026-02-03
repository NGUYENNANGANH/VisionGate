namespace VisionGate.Models;

public enum NotificationType
{
    Violation,
    CheckIn,
    System,
    Alert
}

public enum Priority
{
    Low,
    Normal,
    High,
    Urgent
}

public class Notification
{
    public int NotificationId { get; set; }
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int? EmployeeId { get; set; }
    public int? ViolationId { get; set; }
    public Priority Priority { get; set; } = Priority.Normal;
    public bool IsSentTelegram { get; set; } = false;
    public string? TelegramMessageId { get; set; }
    public DateTime? SentAt { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Employee? Employee { get; set; }
    public Violation? Violation { get; set; }
}
