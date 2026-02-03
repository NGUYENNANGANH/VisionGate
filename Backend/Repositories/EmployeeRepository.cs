using Microsoft.EntityFrameworkCore;
using VisionGate.Data;
using VisionGate.Models;
using VisionGate.Repositories.Interfaces;

namespace VisionGate.Repositories;

public class EmployeeRepository : IEmployeeRepository
{
    private readonly AppDbContext _context;

    public EmployeeRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Employee>> GetAllAsync(bool? isActive = null, int? departmentId = null)
    {
        var query = _context.Employees.Include(e => e.Department).AsQueryable();

        if (isActive.HasValue)
            query = query.Where(e => e.IsActive == isActive.Value);

        if (departmentId.HasValue)
            query = query.Where(e => e.DepartmentId == departmentId.Value);

        return await query.OrderBy(e => e.EmployeeCode).ToListAsync();
    }

    public async Task<Employee?> GetByIdAsync(int id)
    {
        return await _context.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.EmployeeId == id);
    }

    public async Task<Employee?> GetByCodeAsync(string employeeCode)
    {
        return await _context.Employees
            .FirstOrDefaultAsync(e => e.EmployeeCode == employeeCode);
    }

    public async Task<Employee> AddAsync(Employee employee)
    {
        _context.Employees.Add(employee);
        await _context.SaveChangesAsync();
        return employee;
    }

    public async Task UpdateAsync(Employee employee)
    {
        _context.Entry(employee).State = EntityState.Modified;
        await _context.SaveChangesAsync();
    }

    public async Task<bool> ExistsAsync(int id)
    {
        return await _context.Employees.AnyAsync(e => e.EmployeeId == id);
    }

    public async Task<bool> CodeExistsAsync(string code, int? excludeId = null)
    {
        var query = _context.Employees.Where(e => e.EmployeeCode == code);
        
        if (excludeId.HasValue)
            query = query.Where(e => e.EmployeeId != excludeId.Value);

        return await query.AnyAsync();
    }

    public async Task<IEnumerable<CheckInRecord>> GetCheckInsAsync(int employeeId, DateTime? from = null, DateTime? to = null)
    {
        var query = _context.CheckInRecords
            .Where(c => c.EmployeeId == employeeId)
            .Include(c => c.Device)
            .Include(c => c.PPEDetection)
            .AsQueryable();

        if (from.HasValue)
            query = query.Where(c => c.CheckInTime >= from.Value);

        if (to.HasValue)
            query = query.Where(c => c.CheckInTime <= to.Value);

        return await query.OrderByDescending(c => c.CheckInTime).ToListAsync();
    }
}
