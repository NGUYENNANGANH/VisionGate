using VisionGate.Models;

namespace VisionGate.Services.Interfaces;

public interface INotificationService
{
    Task<Notification> CreateNotificationAsync(NotificationType type, string title, string message, int? employeeId = null, int? violationId = null, Priority priority = Priority.Normal);
    Task<bool> SendTelegramNotificationAsync(int notificationId);
    Task<IEnumerable<Notification>> GetUnreadNotificationsAsync(int? employeeId = null);
    Task<bool> MarkAsReadAsync(int notificationId);
}
