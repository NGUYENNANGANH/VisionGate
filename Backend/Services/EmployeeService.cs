using VisionGate.Models;
using VisionGate.Services.Interfaces;
using VisionGate.Repositories.Interfaces;

namespace VisionGate.Services;

public class EmployeeService : IEmployeeService
{
    private const int MaxFacesPerEmployee = 5;
    private readonly IEmployeeRepository _employeeRepository;
    private readonly ICloudinaryService _cloudinaryService;

    public EmployeeService(IEmployeeRepository employeeRepository, ICloudinaryService cloudinaryService)
    {
        _employeeRepository = employeeRepository;
        _cloudinaryService = cloudinaryService;
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
        await _employeeRepository.UpdateAsync(employee);

        return true;
    }

    public async Task<bool> PermanentDeleteEmployeeAsync(int id)
    {
        if (!await EmployeeExistsAsync(id))
            return false;

        await _employeeRepository.DeleteAsync(id);
        return true;
    }

    public async Task<bool> EmployeeExistsAsync(int id)
    {
        return await _employeeRepository.ExistsAsync(id);
    }

    public async Task<bool> EmployeeCodeExistsAsync(string code, int? excludeId = null)
    {
        return await _employeeRepository.CodeExistsAsync(code, excludeId);
    }

    public async Task<IEnumerable<EmployeeFace>> GetEmployeeFacesAsync(int employeeId)
    {
        return await _employeeRepository.GetFacesByEmployeeIdAsync(employeeId);
    }

    public async Task<IEnumerable<EmployeeFace>> GetActiveEmployeeFacesAsync()
    {
        return await _employeeRepository.GetActiveEmployeeFacesAsync();
    }

    public async Task<EmployeeFace> AddEmployeeFaceAsync(int employeeId, string faceImageUrl, byte[] faceEmbedding, bool isPrimary = false, string? cloudinaryPublicId = null, string angle = "Front")
    {
        var employee = await _employeeRepository.GetByIdAsync(employeeId);
        if (employee == null)
            throw new InvalidOperationException("Employee not found.");

        var existingFaces = (await _employeeRepository.GetFacesByEmployeeIdAsync(employeeId)).ToList();
        
        var shouldBePrimary = isPrimary || existingFaces.Count == 0;
        if (shouldBePrimary)
        {
            foreach (var existingFace in existingFaces.Where(f => f.IsPrimary))
            {
                existingFace.IsPrimary = false;
                await _employeeRepository.UpdateFaceAsync(existingFace);
            }
        }

        var existingFaceWithAngle = existingFaces.FirstOrDefault(f => f.Angle == angle);
        EmployeeFace createdOrUpdated;

        if (existingFaceWithAngle != null)
        {
            // Delete old image from Cloudinary
            if (!string.IsNullOrEmpty(existingFaceWithAngle.CloudinaryPublicId))
            {
                await _cloudinaryService.DeleteImageAsync(existingFaceWithAngle.CloudinaryPublicId);
            }

            existingFaceWithAngle.FaceImageUrl = faceImageUrl;
            existingFaceWithAngle.FaceEmbedding = faceEmbedding;
            existingFaceWithAngle.CloudinaryPublicId = cloudinaryPublicId;
            existingFaceWithAngle.IsPrimary = shouldBePrimary;
            await _employeeRepository.UpdateFaceAsync(existingFaceWithAngle);
            createdOrUpdated = existingFaceWithAngle;
        }
        else
        {
            if (existingFaces.Count >= MaxFacesPerEmployee)
                throw new InvalidOperationException($"Each employee can have up to {MaxFacesPerEmployee} face images.");

            var face = new EmployeeFace
            {
                EmployeeId = employeeId,
                FaceImageUrl = faceImageUrl,
                CloudinaryPublicId = cloudinaryPublicId,
                FaceEmbedding = faceEmbedding,
                IsPrimary = shouldBePrimary,
                Angle = angle,
                CreatedAt = DateTime.UtcNow
            };

            createdOrUpdated = await _employeeRepository.AddFaceAsync(face);
        }

        if (shouldBePrimary || string.IsNullOrEmpty(employee.FaceImageUrl))
        {
            employee.FaceImageUrl = faceImageUrl;
            employee.FaceEmbedding = faceEmbedding;
            await _employeeRepository.UpdateAsync(employee);
        }

        return createdOrUpdated;
    }

    public async Task<EmployeeFace?> DeleteEmployeeFaceAsync(int employeeId, int faceId)
    {
        var face = await _employeeRepository.GetFaceByIdAsync(employeeId, faceId);
        if (face == null)
            return null;

        var wasPrimary = face.IsPrimary;
        await _employeeRepository.DeleteFaceAsync(face);

        if (!wasPrimary)
            return face;

        var employee = await _employeeRepository.GetByIdAsync(employeeId);
        if (employee == null)
            return face;

        var remainingFaces = (await _employeeRepository.GetFacesByEmployeeIdAsync(employeeId)).ToList();
        var nextPrimary = remainingFaces.FirstOrDefault();
        if (nextPrimary == null)
        {
            employee.FaceImageUrl = null;
            employee.FaceEmbedding = null;
            await _employeeRepository.UpdateAsync(employee);
            return face;
        }

        nextPrimary.IsPrimary = true;
        await _employeeRepository.UpdateFaceAsync(nextPrimary);

        employee.FaceImageUrl = nextPrimary.FaceImageUrl;
        employee.FaceEmbedding = nextPrimary.FaceEmbedding;
        await _employeeRepository.UpdateAsync(employee);

        return face;
    }
}
