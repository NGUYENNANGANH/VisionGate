using Microsoft.EntityFrameworkCore;
using VisionGate.Data;
using VisionGate.Models;
using VisionGate.Repositories.Interfaces;

namespace VisionGate.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly AppDbContext _context;

    public NotificationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Notification> AddAsync(Notification notification)
    {
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();
        return notification;
    }

    public async Task UpdateAsync(Notification notification)
    {
        _context.Entry(notification).State = EntityState.Modified;
        await _context.SaveChangesAsync();
    }

    public async Task<Notification?> GetByIdAsync(int id)
    {
        return await _context.Notifications
            .Include(n => n.Employee)
            .FirstOrDefaultAsync(n => n.NotificationId == id);
    }

    public async Task<IEnumerable<Notification>> GetUnreadAsync(int? employeeId = null)
    {
        var query = _context.Notifications
            .Where(n => !n.IsRead)
            .Include(n => n.Employee)
            .Include(n => n.Violation)
            .AsQueryable();

        if (employeeId.HasValue)
            query = query.Where(n => n.EmployeeId == employeeId.Value);

        return await query
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();
    }
}
