using Microsoft.EntityFrameworkCore;
using VisionGate.Data;
using VisionGate.Models;
using VisionGate.Repositories.Interfaces;

namespace VisionGate.Repositories;

public class CheckInRepository : ICheckInRepository
{
    private readonly AppDbContext _context;

    public CheckInRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<CheckInRecord>> GetAllAsync(
        DateTime? from = null,
        DateTime? to = null,
        int? employeeId = null)
    {
        var query = _context.CheckInRecords
            .Include(c => c.Employee)
            .Include(c => c.Device)
            .Include(c => c.PPEDetection)
            .AsNoTracking() // Improve performance
            .AsQueryable();

        if (from.HasValue)
            query = query.Where(c => c.CheckInTime >= from.Value);

        if (to.HasValue)
            query = query.Where(c => c.CheckInTime <= to.Value);

        if (employeeId.HasValue)
            query = query.Where(c => c.EmployeeId == employeeId.Value);


        // Limit to most recent 100 records to prevent timeout
        // Frontend should use date filters for larger datasets
        return await query
            .OrderByDescending(c => c.CheckInTime)
            .Take(100)
            .ToListAsync();
    }

    public async Task<CheckInRecord> AddAsync(CheckInRecord checkIn)
    {
        _context.CheckInRecords.Add(checkIn);
        await _context.SaveChangesAsync();
        return checkIn;
    }

    public async Task<int> GetTodayCountAsync()
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        return await _context.CheckInRecords
            .Where(c => c.CheckInTime >= today && c.CheckInTime < tomorrow)
            .Select(c => c.EmployeeId)
            .Distinct()
            .CountAsync();
    }

}
