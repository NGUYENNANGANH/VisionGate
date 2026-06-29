using VisionGate.Models;

namespace VisionGate.Repositories.Interfaces;

public interface IEmployeeRepository
{
    Task<IEnumerable<Employee>> GetAllAsync(bool? isActive = null, int? departmentId = null);
    Task<Employee?> GetByIdAsync(int id);
    Task<Employee?> GetByCodeAsync(string employeeCode);
    Task<Employee> AddAsync(Employee employee);
    Task UpdateAsync(Employee employee);
    Task DeleteAsync(int id);
    Task<bool> ExistsAsync(int id);
    Task<bool> CodeExistsAsync(string code, int? excludeId = null);
    Task<IEnumerable<EmployeeFace>> GetFacesByEmployeeIdAsync(int employeeId);
    Task<IEnumerable<EmployeeFace>> GetActiveEmployeeFacesAsync();
    Task<EmployeeFace?> GetFaceByIdAsync(int employeeId, int faceId);
    Task<EmployeeFace> AddFaceAsync(EmployeeFace face);
    Task UpdateFaceAsync(EmployeeFace face);
    Task DeleteFaceAsync(EmployeeFace face);
}
