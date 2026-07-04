import os

file_path = r'd:\doan\VisionGate\Backend\Services\EmployeeService.cs'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

search = """public class EmployeeService : IEmployeeService
{
    private const int MaxFacesPerEmployee = 5;
    private readonly IEmployeeRepository _employeeRepository;"""

replace = """public class EmployeeService : IEmployeeService
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
    }"""

content = content.replace(search, replace)

# also fix the duplicate using directives
content = content.replace("""using VisionGate.Models;
using VisionGate.Services.Interfaces;
using VisionGate.Repositories.Interfaces;

using VisionGate.Models;
using VisionGate.Services.Interfaces;
using VisionGate.Repositories.Interfaces;""", """using VisionGate.Models;
using VisionGate.Services.Interfaces;
using VisionGate.Repositories.Interfaces;""")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
