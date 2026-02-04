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
            .Include(e => e.Department)
            .AsQueryable();

        if (isActive.HasValue)
            query = query.Where(e => e.IsActive == isActive.Value);

        if (departmentId.HasValue)
            query = query.Where(e => e.DepartmentId == departmentId.Value);

        return await query
            .OrderBy(e => e.EmployeeCode)
            .Select(e => new Employee
            {
                EmployeeId = e.EmployeeId,
                EmployeeCode = e.EmployeeCode,
                FullName = e.FullName,
                Email = e.Email,
                PhoneNumber = e.PhoneNumber,
                DepartmentId = e.DepartmentId,
                Position = e.Position,
                FaceImageUrl = e.FaceImageUrl,
                TelegramUserId = e.TelegramUserId,
                IsActive = e.IsActive,
                StartDate = e.StartDate,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt,
                // Chỉ load thông tin cơ bản của Department, KHÔNG load Employees của Department
                Department = e.Department == null ? null : new Department
                {
                    DepartmentId = e.Department.DepartmentId,
                    DepartmentCode = e.Department.DepartmentCode,
                    DepartmentName = e.Department.DepartmentName,
                    Description = e.Department.Description,
                    IsActive = e.Department.IsActive
                }
            })
            .ToListAsync();
    }

    public async Task<Employee?> GetByIdAsync(int id)
    {
        return await _context.Employees
            .AsNoTracking()
            .Include(e => e.Department)
            .Select(e => new Employee
            {
                EmployeeId = e.EmployeeId,
                EmployeeCode = e.EmployeeCode,
                FullName = e.FullName,
                Email = e.Email,
                PhoneNumber = e.PhoneNumber,
                DepartmentId = e.DepartmentId,
                Position = e.Position,
                FaceImageUrl = e.FaceImageUrl,
                TelegramUserId = e.TelegramUserId,
                IsActive = e.IsActive,
                StartDate = e.StartDate,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt,
                Department = e.Department == null ? null : new Department
                {
                    DepartmentId = e.Department.DepartmentId,
                    DepartmentCode = e.Department.DepartmentCode,
                    DepartmentName = e.Department.DepartmentName,
                    Description = e.Department.Description,
                    IsActive = e.Department.IsActive
                }
            })
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
        _context.Entry(employee).State = EntityState.Modified;
        await _context.SaveChangesAsync();
    }

    public async Task<bool> ExistsAsync(int id)
    {
        return await _context.Employees.AnyAsync(e => e.EmployeeId == id);
    }

    public async Task DeleteAsync(int id)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee != null)
        {
            _context.Employees.Remove(employee);
            await _context.SaveChangesAsync();
        }
    }

  public async Task<bool> CodeExistsAsync(string employeeCode, int? excludeId = null)
    {
        var query = _context.Employees.Where(e => e.EmployeeCode == employeeCode);
        
        if (excludeId.HasValue)
            query = query.Where(e => e.EmployeeId != excludeId.Value);
        
        return await query.AnyAsync();
    }

   
    public async Task<IEnumerable<CheckInRecord>> GetCheckInsAsync(int employeeId, DateTime? from, DateTime? to)
    {
        var query = _context.CheckInRecords
            .AsNoTracking()
            .Where(c => c.EmployeeId == employeeId);

        if (from.HasValue)
            query = query.Where(c => c.CheckInTime >= from.Value);

        if (to.HasValue)
            query = query.Where(c => c.CheckInTime <= to.Value);

        return await query.OrderByDescending(c => c.CheckInTime).ToListAsync();
    }
}