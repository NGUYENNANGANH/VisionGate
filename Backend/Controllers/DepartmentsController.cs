using Microsoft.AspNetCore.Mvc;
using VisionGate.Models;
using VisionGate.Services.Interfaces;

namespace VisionGate.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DepartmentsController : ControllerBase
{
    private readonly IDepartmentService _departmentService;

    public DepartmentsController(IDepartmentService departmentService)
    {
        _departmentService = departmentService;
    }

    // GET: api/departments
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Department>>> GetDepartments()
    {
        var departments = await _departmentService.GetAllDepartmentsAsync();
        return Ok(departments);
    }

    // GET: api/departments/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Department>> GetDepartment(int id)
    {
        var department = await _departmentService.GetDepartmentByIdAsync(id);

        if (department == null)
            return NotFound();

        return department;
    }

    // POST: api/departments
    [HttpPost]
    public async Task<ActionResult<Department>> CreateDepartment(Department department)
    {
        var created = await _departmentService.CreateDepartmentAsync(department);
        return CreatedAtAction(nameof(GetDepartment), new { id = created.DepartmentId }, created);
    }

    // PUT: api/departments/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDepartment(int id, Department department)
    {
        var updated = await _departmentService.UpdateDepartmentAsync(id, department);
        if (!updated)
            return NotFound();

        return NoContent();
    }

    // DELETE: api/departments/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDepartment(int id)
    {
        var deleted = await _departmentService.DeleteDepartmentAsync(id);
        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
