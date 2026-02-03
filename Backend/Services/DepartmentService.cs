using VisionGate.Models;
using VisionGate.Services.Interfaces;
using VisionGate.Repositories.Interfaces;

namespace VisionGate.Services;

public class DepartmentService : IDepartmentService
{
    private readonly IDepartmentRepository _departmentRepository;

    public DepartmentService(IDepartmentRepository departmentRepository)
    {
        _departmentRepository = departmentRepository;
    }

    public async Task<IEnumerable<Department>> GetAllDepartmentsAsync()
    {
        return await _departmentRepository.GetAllActiveAsync();
    }

    public async Task<Department?> GetDepartmentByIdAsync(int id)
    {
        return await _departmentRepository.GetByIdAsync(id);
    }

    public async Task<Department> CreateDepartmentAsync(Department department)
    {
        department.CreatedAt = DateTime.UtcNow;
        department.IsActive = true;

        return await _departmentRepository.AddAsync(department);
    }

    public async Task<bool> UpdateDepartmentAsync(int id, Department department)
    {
        if (id != department.DepartmentId)
            return false;

        if (!await _departmentRepository.ExistsAsync(id))
            return false;

        await _departmentRepository.UpdateAsync(department);
        return true;
    }

    public async Task<bool> DeleteDepartmentAsync(int id)
    {
        var department = await _departmentRepository.GetByIdAsync(id);
        if (department == null)
            return false;

        // Soft delete
        department.IsActive = false;
        await _departmentRepository.UpdateAsync(department);

        return true;
    }
}
