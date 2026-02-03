using VisionGate.Models;

namespace VisionGate.Repositories.Interfaces;

public interface IDepartmentRepository
{
    Task<IEnumerable<Department>> GetAllActiveAsync();
    Task<Department?> GetByIdAsync(int id);
    Task<Department> AddAsync(Department department);
    Task UpdateAsync(Department department);
    Task<bool> ExistsAsync(int id);
}
