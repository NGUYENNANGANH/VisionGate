using VisionGate.Models;
using VisionGate.Services.Interfaces;
using VisionGate.Repositories.Interfaces;

namespace VisionGate.Services;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _notificationRepository;
    // TODO: Inject Telegram Bot service when implemented

    public NotificationService(INotificationRepository notificationRepository)
    {
        _notificationRepository = notificationRepository;
    }

    public async Task<Notification> CreateNotificationAsync(
        NotificationType type,
        string title,
        string message,
        int? employeeId = null,
        int? violationId = null,
        Priority priority = Priority.Normal)
    {
        var notification = new Notification
        {
            Type = type,
            Title = title,
            Message = message,
            EmployeeId = employeeId,
            ViolationId = violationId,
            Priority = priority,
            CreatedAt = DateTime.UtcNow
        };

        var created = await _notificationRepository.AddAsync(notification);

        // Auto-send high priority notifications
        if (priority >= Priority.High)
        {
            await SendTelegramNotificationAsync(created.NotificationId);
        }

        return created;
    }

    public async Task<bool> SendTelegramNotificationAsync(int notificationId)
    {
        var notification = await _notificationRepository.GetByIdAsync(notificationId);

        if (notification == null)
            return false;

        // TODO: Implement actual Telegram sending logic
        // For now, just mark as sent
        notification.IsSentTelegram = true;
        notification.SentAt = DateTime.UtcNow;
        notification.TelegramMessageId = $"MOCK_{notificationId}_{DateTime.UtcNow.Ticks}";

        await _notificationRepository.UpdateAsync(notification);
        return true;
    }

    public async Task<IEnumerable<Notification>> GetUnreadNotificationsAsync(int? employeeId = null)
    {
        return await _notificationRepository.GetUnreadAsync(employeeId);
    }

    public async Task<bool> MarkAsReadAsync(int notificationId)
    {
        var notification = await _notificationRepository.GetByIdAsync(notificationId);
        if (notification == null)
            return false;

        notification.IsRead = true;
        await _notificationRepository.UpdateAsync(notification);
        return true;
    }
}
