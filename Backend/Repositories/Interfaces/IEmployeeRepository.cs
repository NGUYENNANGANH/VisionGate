using VisionGate.Models;

namespace VisionGate.Repositories.Interfaces;

public interface IEmployeeRepository
{
    Task<IEnumerable<Employee>> GetAllAsync(bool? isActive = null, int? departmentId = null);
    Task<Employee?> GetByIdAsync(int id);
    Task<Employee?> GetByCodeAsync(string employeeCode);
    Task<Employee> AddAsync(Employee employee);
    Task UpdateAsync(Employee employee);
    Task<bool> ExistsAsync(int id);
    Task<bool> CodeExistsAsync(string code, int? excludeId = null);
    Task<IEnumerable<CheckInRecord>> GetCheckInsAsync(int employeeId, DateTime? from = null, DateTime? to = null);
}
