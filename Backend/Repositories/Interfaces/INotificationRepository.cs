using VisionGate.Models;

namespace VisionGate.Repositories.Interfaces;

public interface INotificationRepository
{
    Task<Notification> AddAsync(Notification notification);
    Task UpdateAsync(Notification notification);
    Task<Notification?> GetByIdAsync(int id);
    Task<IEnumerable<Notification>> GetUnreadAsync(int? employeeId = null);
}
