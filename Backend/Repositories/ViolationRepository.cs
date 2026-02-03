using Microsoft.EntityFrameworkCore;
using VisionGate.Data;
using VisionGate.Models;
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
        Severity? severity = null,
        DateTime? from = null,
        DateTime? to = null)
    {
        var query = _context.Violations
            .Include(v => v.Employee)
            .Include(v => v.PPEDetection)
            .AsQueryable();

        if (isResolved.HasValue)
            query = query.Where(v => v.IsResolved == isResolved.Value);

        if (employeeId.HasValue)
            query = query.Where(v => v.EmployeeId == employeeId.Value);

        if (severity.HasValue)
            query = query.Where(v => v.Severity == severity.Value);

        if (from.HasValue)
            query = query.Where(v => v.CreatedAt >= from.Value);

        if (to.HasValue)
            query = query.Where(v => v.CreatedAt <= to.Value);

        return await query.OrderByDescending(v => v.CreatedAt).ToListAsync();
    }

    public async Task<Violation?> GetByIdAsync(int id)
    {
        return await _context.Violations
            .Include(v => v.Employee)
            .Include(v => v.PPEDetection)
            .Include(v => v.CheckInRecord)
            .FirstOrDefaultAsync(v => v.ViolationId == id);
    }

    public async Task<Violation> AddAsync(Violation violation)
    {
        _context.Violations.Add(violation);
        await _context.SaveChangesAsync();
        return violation;
    }

    public async Task UpdateAsync(Violation violation)
    {
        _context.Entry(violation).State = EntityState.Modified;
        await _context.SaveChangesAsync();
    }

    public async Task<int> GetTodayCountAsync()
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        return await _context.Violations
            .CountAsync(v => v.CreatedAt >= today && v.CreatedAt < tomorrow);
    }

    public async Task<int> GetTotalCountAsync(DateTime? from = null, DateTime? to = null)
    {
        var query = _context.Violations.AsQueryable();

        if (from.HasValue)
            query = query.Where(v => v.CreatedAt >= from.Value);

        if (to.HasValue)
            query = query.Where(v => v.CreatedAt <= to.Value);

        return await query.CountAsync();
    }

    public async Task<int> GetResolvedCountAsync(DateTime? from = null, DateTime? to = null)
    {
        var query = _context.Violations.Where(v => v.IsResolved);

        if (from.HasValue)
            query = query.Where(v => v.CreatedAt >= from.Value);

        if (to.HasValue)
            query = query.Where(v => v.CreatedAt <= to.Value);

        return await query.CountAsync();
    }

    public async Task<Dictionary<string, int>> GetCountByTypeAsync(DateTime? from = null, DateTime? to = null)
    {
        var query = _context.Violations.AsQueryable();

        if (from.HasValue)
            query = query.Where(v => v.CreatedAt >= from.Value);

        if (to.HasValue)
            query = query.Where(v => v.CreatedAt <= to.Value);

        var result = await query
            .GroupBy(v => v.ViolationType)
            .Select(g => new { Type = g.Key.ToString(), Count = g.Count() })
            .ToListAsync();

        return result.ToDictionary(x => x.Type, x => x.Count);
    }

    public async Task<Dictionary<string, int>> GetCountBySeverityAsync(DateTime? from = null, DateTime? to = null)
    {
        var query = _context.Violations.AsQueryable();

        if (from.HasValue)
            query = query.Where(v => v.CreatedAt >= from.Value);

        if (to.HasValue)
            query = query.Where(v => v.CreatedAt <= to.Value);

        var result = await query
            .GroupBy(v => v.Severity)
            .Select(g => new { Severity = g.Key.ToString(), Count = g.Count() })
            .ToListAsync();

        return result.ToDictionary(x => x.Severity, x => x.Count);
    }
}
