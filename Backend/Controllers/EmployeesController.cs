using Microsoft.AspNetCore.Mvc;
using VisionGate.Models;
using VisionGate.Services.Interfaces;
using System.Text.Json;
using System.Text;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Linq.Expressions;

namespace VisionGate.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _employeeService;
    private readonly IHttpClientFactory _httpClientFactory;

    public EmployeesController(IEmployeeService employeeService, IHttpClientFactory httpClientFactory)
    {
        _employeeService = employeeService;
        _httpClientFactory = httpClientFactory;
    }

    // GET: api/employees
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Employee>>> GetEmployees(
        [FromQuery] bool? isActive = null,
        [FromQuery] int? departmentId = null)
    {
        var employees = await _employeeService.GetAllEmployeesAsync(isActive, departmentId);
        return Ok(employees);
    }

    // GET: api/employees/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Employee>> GetEmployee(int id)
    {
        var employee = await _employeeService.GetEmployeeByIdAsync(id);

        if (employee == null)
            return NotFound();

        return employee;
    }

    // POST: api/employees
    [HttpPost]
    public async Task<ActionResult<Employee>> CreateEmployee(Employee employee)
    {
        try
        {
            var created = await _employeeService.CreateEmployeeAsync(employee);
            if (!string.IsNullOrEmpty(created.FaceImageUrl))
            {
                try
                {
                    var client = _httpClientFactory.CreateClient();
                    var pyServiceUrl = "http://127.0.0.1:5000/api/encode";
                    
                    var payload = new {url = created.FaceImageUrl};
                    var jsonContent = new StringContent(
                        JsonSerializer.Serialize(payload),
                        Encoding.UTF8,
                        "application/json");
                    var response = await client.PostAsync(pyServiceUrl, jsonContent);
                    if (response.IsSuccessStatusCode)
                    {
                        var responseString = await response.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(responseString);
                        var root = doc.RootElement;
                        if(root.GetProperty("Success").GetBoolean())
                        {
                            // lay mang 
                            var vectorArray = root.GetProperty("Embedding")
                            .EnumerateArray()
                            .Select(e => e.GetSingle())
                            .ToArray(); 

                            // chuyen float sang byte
                            var byteArray = new byte[vectorArray.Length * sizeof(float)];
                            Buffer.BlockCopy(vectorArray, 0, byteArray, 0, byteArray.Length);
                            created.FaceEmbedding = byteArray;

                            // cao nhat FaceEmbedding vao Database
                            created.FaceEmbedding = byteArray;
                            await _employeeService.UpdateEmployeeAsync(created.EmployeeId, created);

                            Console.WriteLine("Face embedding updated for employee ID: " + created.EmployeeId);
                        }
                        else
                        {
                            var message = root.GetProperty("Message").GetString();
                            Console.WriteLine("Python service error: " + message);
                            
                        }
                   }

                }
                catch(Exception ex)
                {
                    Console.WriteLine("Exception while calling Python service: " + ex.Message);
                }
            }
            return CreatedAtAction(nameof(GetEmployee), new { id = created.EmployeeId }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // PUT: api/employees/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEmployee(int id, Employee employee)
    {
        try
        {
            var updated = await _employeeService.UpdateEmployeeAsync(id, employee);
            if (!updated)
                return NotFound();

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // DELETE: api/employees/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEmployee(int id)
    {
        var deleted = await _employeeService.DeleteEmployeeAsync(id);
        if (!deleted)
            return NotFound();

        return NoContent();
    }

    // GET: api/employees/5/checkins
    [HttpGet("{id}/checkins")]
    public async Task<ActionResult<IEnumerable<CheckInRecord>>> GetEmployeeCheckIns(
        int id,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        var checkIns = await _employeeService.GetEmployeeCheckInsAsync(id, from, to);
        return Ok(checkIns);
    }
}
