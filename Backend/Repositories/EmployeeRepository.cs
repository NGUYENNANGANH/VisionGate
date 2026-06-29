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
        var query = _context.Employees
            .AsNoTracking()
            .AsSplitQuery()
            .AsQueryable();

        if (isActive.HasValue)
            query = query.Where(e => e.IsActive == isActive.Value);

        if (departmentId.HasValue)
        {
            // query = query.Where(e => e.DepartmentId == departmentId.Value);
        }

        return await query
            .OrderBy(e => e.EmployeeCode)
            .ToListAsync();
    }

    public async Task<Employee?> GetByIdAsync(int id)
    {
        return await _context.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.EmployeeId == id);
    }

    public async Task<Employee?> GetByCodeAsync(string employeeCode)
    {
        return await _context.Employees
            .AsNoTracking()
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
        var existing = _context.Employees.Local.FirstOrDefault(e => e.EmployeeId == employee.EmployeeId);
        if (existing != null && existing != employee)
        {
            _context.Entry(existing).State = EntityState.Detached;
        }
        _context.Entry(employee).State = EntityState.Modified;
        await _context.SaveChangesAsync();
    }

    public async Task<bool> ExistsAsync(int id)
    {
        return await _context.Employees.AnyAsync(e => e.EmployeeId == id);
    }

    public async Task DeleteAsync(int id)
    {
        var checkInIds = await _context.CheckInRecords
            .Where(c => c.EmployeeId == id)
            .Select(c => c.CheckInId)
            .ToListAsync();

        var ppeDetectionIds = await _context.PPEDetections
            .Where(p => p.CheckInId.HasValue && checkInIds.Contains(p.CheckInId.Value))
            .Select(p => p.PPEDetectionId)
            .ToListAsync();

        await _context.Violations
            .Where(v => v.EmployeeId == id || (v.PPEDetectionId.HasValue && ppeDetectionIds.Contains(v.PPEDetectionId.Value)))
            .ExecuteDeleteAsync();

        await _context.PPEDetections
            .Where(p => ppeDetectionIds.Contains(p.PPEDetectionId))
            .ExecuteDeleteAsync();

        await _context.CheckInRecords
            .Where(c => c.EmployeeId == id)
            .ExecuteDeleteAsync();

        await _context.EmployeeFaces
            .Where(f => f.EmployeeId == id)
            .ExecuteDeleteAsync();

        await _context.Employees
            .Where(e => e.EmployeeId == id)
            .ExecuteDeleteAsync();
    }

  public async Task<bool> CodeExistsAsync(string employeeCode, int? excludeId = null)
    {
        var query = _context.Employees.Where(e => e.EmployeeCode == employeeCode);
        
        if (excludeId.HasValue)
            query = query.Where(e => e.EmployeeId != excludeId.Value);
        
        return await query.AnyAsync();
    }

    public async Task<IEnumerable<EmployeeFace>> GetFacesByEmployeeIdAsync(int employeeId)
    {
        return await _context.EmployeeFaces
            .AsNoTracking()
            .Where(f => f.EmployeeId == employeeId)
            .OrderByDescending(f => f.IsPrimary)
            .ThenByDescending(f => f.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<EmployeeFace>> GetActiveEmployeeFacesAsync()
    {
        return await _context.EmployeeFaces
            .AsNoTracking()
            .Include(f => f.Employee)
            .Where(f => f.Employee != null && f.Employee.IsActive)
            .OrderBy(f => f.EmployeeId)
            .ThenByDescending(f => f.IsPrimary)
            .ToListAsync();
    }

    public async Task<EmployeeFace?> GetFaceByIdAsync(int employeeId, int faceId)
    {
        return await _context.EmployeeFaces
            .FirstOrDefaultAsync(f => f.EmployeeId == employeeId && f.Id == faceId);
    }

    public async Task<EmployeeFace> AddFaceAsync(EmployeeFace face)
    {
        _context.EmployeeFaces.Add(face);
        await _context.SaveChangesAsync();
        return face;
    }

    public async Task UpdateFaceAsync(EmployeeFace face)
    {
        var existing = _context.EmployeeFaces.Local.FirstOrDefault(f => f.Id == face.Id);
        if (existing != null && existing != face)
        {
            _context.Entry(existing).State = EntityState.Detached;
        }
        _context.Entry(face).State = EntityState.Modified;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteFaceAsync(EmployeeFace face)
    {
        _context.EmployeeFaces.Remove(face);
        await _context.SaveChangesAsync();
    }
}
