using VisionGate.Models;

namespace VisionGate.Services.Interfaces;

public interface IEmployeeService
{
    Task<IEnumerable<Employee>> GetAllEmployeesAsync(bool? isActive = null, int? departmentId = null);
    Task<Employee?> GetEmployeeByIdAsync(int id);
    Task<Employee> CreateEmployeeAsync(Employee employee);
    Task<bool> UpdateEmployeeAsync(int id, Employee employee);
    Task<bool> DeleteEmployeeAsync(int id);
    Task<bool> PermanentDeleteEmployeeAsync(int id);
    Task<bool> EmployeeExistsAsync(int id);
    Task<bool> EmployeeCodeExistsAsync(string code, int? excludeId = null);
    Task<IEnumerable<EmployeeFace>> GetEmployeeFacesAsync(int employeeId);
    Task<IEnumerable<EmployeeFace>> GetActiveEmployeeFacesAsync();
    Task<EmployeeFace> AddEmployeeFaceAsync(int employeeId, string faceImageUrl, byte[] faceEmbedding, bool isPrimary = false, string? cloudinaryPublicId = null, string angle = "Front");
    Task<EmployeeFace?> DeleteEmployeeFaceAsync(int employeeId, int faceId);
}
