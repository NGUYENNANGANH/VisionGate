using Microsoft.EntityFrameworkCore;
using VisionGate.Data;
using VisionGate.Models;
using VisionGate.Helpers;
using VisionGate.Repositories.Interfaces;

namespace VisionGate.Repositories;

public class ViolationRepository : IViolationRepository
{
    private readonly AppDbContext _context;

    public ViolationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Violation>> GetAllAsync(
        bool? isResolved = null,
        int? employeeId = null,
        DateTime? from = null,
        DateTime? to = null)
    {
        var query = _context.Violations
            .Include(v => v.Employee)
            .Include(v => v.PPEDetection)
                .ThenInclude(p => p.CheckInRecord)
                    .ThenInclude(c => c.Device)
            .AsQueryable();

        if (isResolved.HasValue)
            query = query.Where(v => v.IsResolved == isResolved.Value);
        if (from.HasValue)
            query = query.Where(v => v.CreatedAt >= from.Value);

        if (to.HasValue)
            query = query.Where(v => v.CreatedAt <= to.Value);

        return await query.OrderByDescending(v => v.CreatedAt).ToListAsync();
    }

    public async Task<Violation> AddAsync(Violation violation)
    {
        _context.Violations.Add(violation);
        await _context.SaveChangesAsync();
        return violation;
    }

    public async Task<int> GetTodayCountAsync()
    {
        var today = DateTimeHelper.VietnamNow().Date;
        var tomorrow = today.AddDays(1);

        return await _context.Violations
            .CountAsync(v => v.CreatedAt >= today && v.CreatedAt < tomorrow);
    }
}
