using Microsoft.EntityFrameworkCore;
using VisionGate.Data;
using VisionGate.DTOs;
using VisionGate.Models;
using VisionGate.Services.Interfaces;

namespace VisionGate.Services;

public class ReportService : IReportService
{
    private readonly AppDbContext _context;

    public ReportService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<object> GetAttendanceReportAsync(AttendanceReportRequest request)
    {
        var query = _context.CheckInRecords
            .Include(c => c.Employee)
            .ThenInclude(e => e.Department)
            .AsQueryable();

        if (request.FromDate.HasValue)
            query = query.Where(c => c.CheckInTime >= request.FromDate.Value);

        if (request.ToDate.HasValue)
            query = query.Where(c => c.CheckInTime <= request.ToDate.Value);

        if (request.EmployeeId.HasValue)
            query = query.Where(c => c.EmployeeId == request.EmployeeId.Value);

        if (request.DepartmentId.HasValue)
            query = query.Where(c => c.Employee.DepartmentId == request.DepartmentId.Value);

        var checkIns = await query
            .OrderByDescending(c => c.CheckInTime)
            .ToListAsync();

        var grouped = checkIns
            .GroupBy(c => new { c.EmployeeId, Date = DateOnly.FromDateTime(c.CheckInTime) })
            .Select(g => new
            {
                EmployeeId = g.Key.EmployeeId,
                EmployeeName = g.First().Employee.FullName,
                EmployeeCode = g.First().Employee.EmployeeCode,
                Department = g.First().Employee.Department?.DepartmentName,
                Date = g.Key.Date,
                CheckInTime = g.Min(c => TimeOnly.FromDateTime(c.CheckInTime)),
                CheckOutTime = g.Max(c => TimeOnly.FromDateTime(c.CheckInTime)),
                TotalCheckIns = g.Count(),
                HasViolations = g.Any(c => c.Violations.Any())
            })
            .OrderByDescending(x => x.Date)
            .ThenBy(x => x.EmployeeName);

        return new
        {
            TotalRecords = grouped.Count(),
            FromDate = request.FromDate,
            ToDate = request.ToDate,
            Data = grouped
        };
    }

    public async Task<object> GetViolationReportAsync(ViolationReportRequest request)
    {
        var query = _context.Violations
            .Include(v => v.Employee)
            .ThenInclude(e => e.Department)
            .Include(v => v.CheckInRecord)
            .Include(v => v.PPEDetection)
            .AsQueryable();

        if (request.FromDate.HasValue)
            query = query.Where(v => v.CreatedAt >= request.FromDate.Value);

        if (request.ToDate.HasValue)
            query = query.Where(v => v.CreatedAt <= request.ToDate.Value);

        if (request.EmployeeId.HasValue)
            query = query.Where(v => v.EmployeeId == request.EmployeeId.Value);

        if (request.DepartmentId.HasValue)
            query = query.Where(v => v.Employee.DepartmentId == request.DepartmentId.Value);

        if (request.Severity.HasValue)
            query = query.Where(v => (int)v.Severity == request.Severity.Value);

        if (request.IsResolved.HasValue)
            query = query.Where(v => v.IsResolved == request.IsResolved.Value);

        var violations = await query
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => new
            {
                v.ViolationId,
                v.EmployeeId,
                EmployeeName = v.Employee.FullName,
                EmployeeCode = v.Employee.EmployeeCode,
                Department = v.Employee.Department != null ? v.Employee.Department.DepartmentName : null,
                v.ViolationType,
                v.Severity,
                v.Description,
                v.ImageUrl,
                v.IsResolved,
                v.ResolvedAt,
                v.NotificationSent,
                v.CreatedAt
            })
            .ToListAsync();

        var summary = new
        {
            Total = violations.Count,
            Resolved = violations.Count(v => v.IsResolved),
            Pending = violations.Count(v => !v.IsResolved),
            Critical = violations.Count(v => v.Severity == Severity.Critical),
            High = violations.Count(v => v.Severity == Severity.High),
            Medium = violations.Count(v => v.Severity == Severity.Medium),
            Low = violations.Count(v => v.Severity == Severity.Low)
        };

        return new
        {
            Summary = summary,
            FromDate = request.FromDate,
            ToDate = request.ToDate,
            Data = violations
        };
    }

    public async Task<byte[]> ExportToExcelAsync(ExportExcelRequest request)
    {
        // TODO: Implement Excel export using EPPlus or ClosedXML
        // For now, return empty byte array
        await Task.CompletedTask;
        
        throw new NotImplementedException("Excel export feature requires EPPlus or ClosedXML package");
    }

    public async Task<object> GetEmployeeHistoryAsync(int employeeId, DateTime? from, DateTime? to)
    {
        var employee = await _context.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

        if (employee == null)
            throw new KeyNotFoundException($"Employee with ID {employeeId} not found");

        var checkInsQuery = _context.CheckInRecords
            .Where(c => c.EmployeeId == employeeId);

        var violationsQuery = _context.Violations
            .Where(v => v.EmployeeId == employeeId);

        if (from.HasValue)
        {
            checkInsQuery = checkInsQuery.Where(c => c.CheckInTime >= from.Value);
            violationsQuery = violationsQuery.Where(v => v.CreatedAt >= from.Value);
        }

        if (to.HasValue)
        {
            checkInsQuery = checkInsQuery.Where(c => c.CheckInTime <= to.Value);
            violationsQuery = violationsQuery.Where(v => v.CreatedAt <= to.Value);
        }

        var checkIns = await checkInsQuery
            .OrderByDescending(c => c.CheckInTime)
            .Take(100)
            .ToListAsync();

        var violations = await violationsQuery
            .OrderByDescending(v => v.CreatedAt)
            .Take(50)
            .ToListAsync();

        return new
        {
            Employee = new
            {
                employee.EmployeeId,
                employee.EmployeeCode,
                employee.FullName,
                employee.Email,
                employee.Position,
                Department = employee.Department?.DepartmentName,
                employee.IsActive
            },
            CheckInHistory = new
            {
                Total = checkIns.Count,
                Data = checkIns
            },
            ViolationHistory = new
            {
                Total = violations.Count,
                Data = violations
            },
            FromDate = from,
            ToDate = to
        };
    }
}
