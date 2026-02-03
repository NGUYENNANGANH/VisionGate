using VisionGate.Models;

namespace VisionGate.Services.Interfaces;

public interface IEmployeeService
{
    Task<IEnumerable<Employee>> GetAllEmployeesAsync(bool? isActive = null, int? departmentId = null);
    Task<Employee?> GetEmployeeByIdAsync(int id);
    Task<Employee> CreateEmployeeAsync(Employee employee);
    Task<bool> UpdateEmployeeAsync(int id, Employee employee);
    Task<bool> DeleteEmployeeAsync(int id);
    Task<IEnumerable<CheckInRecord>> GetEmployeeCheckInsAsync(int employeeId, DateTime? from = null, DateTime? to = null);
    Task<bool> EmployeeExistsAsync(int id);
    Task<bool> EmployeeCodeExistsAsync(string code, int? excludeId = null);
}
