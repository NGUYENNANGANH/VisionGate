using VisionGate.Models;

namespace VisionGate.Services.Interfaces;

public interface IDepartmentService
{
    Task<IEnumerable<Department>> GetAllDepartmentsAsync();
    Task<Department?> GetDepartmentByIdAsync(int id);
    Task<Department> CreateDepartmentAsync(Department department);
    Task<bool> UpdateDepartmentAsync(int id, Department department);
    Task<bool> DeleteDepartmentAsync(int id);
}
