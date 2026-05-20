using Microsoft.AspNetCore.Mvc;
using VisionGate.Models;
using VisionGate.Services.Interfaces;
using System.Text.Json;
using System.Text;

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

    private async Task<byte[]?> GetFaceEmbeddingAsync(string imageUrl)
    {
        var client = _httpClientFactory.CreateClient();
        var pyServiceUrl = "http://127.0.0.1:5000/api/encode";
        var payload = new { url = imageUrl };
        var jsonContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var response = await client.PostAsync(pyServiceUrl, jsonContent);
        if (response.IsSuccessStatusCode)
        {
            var responseString = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseString);
            var root = doc.RootElement;
            
            if (root.GetProperty("Success").GetBoolean())
            {
                var vectorArray = root.GetProperty("Embedding").EnumerateArray().Select(e => e.GetSingle()).ToArray();
                var byteArray = new byte[vectorArray.Length * sizeof(float)];
                Buffer.BlockCopy(vectorArray, 0, byteArray, 0, byteArray.Length);
                return byteArray;
            }
            else
            {
                var message = root.GetProperty("Message").GetString();
                throw new Exception(message);
            }
        }
        throw new Exception($"Không thể kết nối đến AI Service. HTTP {response.StatusCode}");
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
            // Kiểm tra ảnh bằng AI TRƯỚC KHI tạo nhân viên vào DB
            if (!string.IsNullOrEmpty(employee.FaceImageUrl))
            {
                try
                {
                    employee.FaceEmbedding = await GetFaceEmbeddingAsync(employee.FaceImageUrl);
                }
                catch (Exception ex)
                {
                    return BadRequest(new { message = $"Ảnh khuôn mặt không hợp lệ: {ex.Message}" });
                }
            }

            var created = await _employeeService.CreateEmployeeAsync(employee);
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
            var existing = await _employeeService.GetEmployeeByIdAsync(id);
            if (existing == null)
                return NotFound();

            // Kiểm tra xem user có đổi ảnh không
            if (employee.FaceImageUrl != existing.FaceImageUrl)
            {
                if (!string.IsNullOrEmpty(employee.FaceImageUrl))
                {
                    try
                    {
                        employee.FaceEmbedding = await GetFaceEmbeddingAsync(employee.FaceImageUrl);
                    }
                    catch (Exception ex)
                    {
                        return BadRequest(new { message = $"Ảnh khuôn mặt mới không hợp lệ: {ex.Message}" });
                    }
                }
                else
                {
                    employee.FaceEmbedding = null;
                }
            }
            else
            {
                // URL ảnh không đổi -> giữ nguyên embedding cũ
                employee.FaceEmbedding = existing.FaceEmbedding;
            }

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

    // POST: api/employees/5/re-encode
    // Force tạo lại embedding từ ảnh hiện tại (dùng khi migrate model)
    [HttpPost("{id}/re-encode")]
    public async Task<IActionResult> ReEncodeFace(int id)
    {
        var existing = await _employeeService.GetEmployeeByIdAsync(id);
        if (existing == null)
            return NotFound();

        if (string.IsNullOrEmpty(existing.FaceImageUrl))
            return BadRequest(new { message = "Nhân viên chưa có ảnh khuôn mặt." });

        try
        {
            existing.FaceEmbedding = await GetFaceEmbeddingAsync(existing.FaceImageUrl);
            var updated = await _employeeService.UpdateEmployeeAsync(id, existing);
            if (!updated)
                return StatusCode(500, new { message = "Không thể cập nhật embedding." });

            return Ok(new { message = $"Re-encode thành công cho nhân viên #{id}.", dim = existing.FaceEmbedding?.Length / sizeof(float) });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Lỗi encode khuôn mặt: {ex.Message}" });
        }
    }

    // POST: api/employees/re-encode-all
    // Force tạo lại embedding cho TẤT CẢ nhân viên
    [HttpPost("re-encode-all")]
    public async Task<IActionResult> ReEncodeAll()
    {
        var employees = await _employeeService.GetAllEmployeesAsync(null, null);
        int success = 0, fail = 0;
        var errors = new List<string>();

        foreach (var emp in employees)
        {
            if (string.IsNullOrEmpty(emp.FaceImageUrl))
            {
                fail++;
                continue;
            }

            try
            {
                emp.FaceEmbedding = await GetFaceEmbeddingAsync(emp.FaceImageUrl);
                await _employeeService.UpdateEmployeeAsync(emp.EmployeeId, emp);
                success++;
            }
            catch (Exception ex)
            {
                fail++;
                errors.Add($"ID {emp.EmployeeId}: {ex.Message}");
            }
        }

        return Ok(new { success, fail, errors });
    }
}
