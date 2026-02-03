using VisionGate.Models;
using VisionGate.Services.Interfaces;
using VisionGate.Repositories.Interfaces;

namespace VisionGate.Services;

public class EmployeeService : IEmployeeService
{
    private readonly IEmployeeRepository _employeeRepository;

    public EmployeeService(IEmployeeRepository employeeRepository)
    {
        _employeeRepository = employeeRepository;
    }

    public async Task<IEnumerable<Employee>> GetAllEmployeesAsync(bool? isActive = null, int? departmentId = null)
    {
        return await _employeeRepository.GetAllAsync(isActive, departmentId);
    }

    public async Task<Employee?> GetEmployeeByIdAsync(int id)
    {
        return await _employeeRepository.GetByIdAsync(id);
    }

    public async Task<Employee> CreateEmployeeAsync(Employee employee)
    {
        // Validate employee code uniqueness
        if (await EmployeeCodeExistsAsync(employee.EmployeeCode))
            throw new InvalidOperationException($"Employee code '{employee.EmployeeCode}' already exists.");

        employee.CreatedAt = DateTime.UtcNow;
        employee.IsActive = true;

        return await _employeeRepository.AddAsync(employee);
    }

    public async Task<bool> UpdateEmployeeAsync(int id, Employee employee)
    {
        if (id != employee.EmployeeId)
            return false;

        // Validate employee code uniqueness (excluding current employee)
        if (await EmployeeCodeExistsAsync(employee.EmployeeCode, id))
            throw new InvalidOperationException($"Employee code '{employee.EmployeeCode}' already exists.");

        if (!await EmployeeExistsAsync(id))
            return false;

        employee.UpdatedAt = DateTime.UtcNow;
        await _employeeRepository.UpdateAsync(employee);
        return true;
    }

    public async Task<bool> DeleteEmployeeAsync(int id)
    {
        var employee = await _employeeRepository.GetByIdAsync(id);
        if (employee == null)
            return false;

        // Soft delete
        employee.IsActive = false;
        employee.UpdatedAt = DateTime.UtcNow;
        await _employeeRepository.UpdateAsync(employee);

        return true;
    }

    public async Task<IEnumerable<CheckInRecord>> GetEmployeeCheckInsAsync(int employeeId, DateTime? from = null, DateTime? to = null)
    {
        return await _employeeRepository.GetCheckInsAsync(employeeId, from, to);
    }

    public async Task<bool> EmployeeExistsAsync(int id)
    {
        return await _employeeRepository.ExistsAsync(id);
    }

    public async Task<bool> EmployeeCodeExistsAsync(string code, int? excludeId = null)
    {
        return await _employeeRepository.CodeExistsAsync(code, excludeId);
    }
}
