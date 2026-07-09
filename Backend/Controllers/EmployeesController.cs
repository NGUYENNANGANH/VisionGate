using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VisionGate.DTOs;
using VisionGate.Models;
using VisionGate.Services.Interfaces;
using System.Text.Json;
using System.Text;

namespace VisionGate.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin,Admin")]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _employeeService;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IHttpClientFactory _httpClientFactory;

    public EmployeesController(
        IEmployeeService employeeService,
        ICloudinaryService cloudinaryService,
        IHttpClientFactory httpClientFactory)
    {
        _employeeService = employeeService;
        _cloudinaryService = cloudinaryService;
        _httpClientFactory = httpClientFactory;
    }
    private async Task<byte[]?> GetFaceEmbeddingAsync(string imageUrl)
    {
        var client = _httpClientFactory.CreateClient();
        var pyServiceUrl = "http://127.0.0.1:8000/api/encode";
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

    private string? ExtractPublicIdFromUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;
        try
        {
            var uri = new Uri(url);
            var segments = uri.Segments;
            var uploadIndex = Array.FindIndex(segments, s => s.TrimEnd('/') == "upload");
            if (uploadIndex >= 0 && segments.Length > uploadIndex + 1)
            {
                var startIndex = uploadIndex + 1;
                if (segments[startIndex].StartsWith("v") && segments[startIndex].Length > 1 && char.IsDigit(segments[startIndex][1]))
                {
                    startIndex++;
                }
                var publicIdWithExt = string.Join("", segments.Skip(startIndex));
                var lastDot = publicIdWithExt.LastIndexOf('.');
                return lastDot > 0 ? publicIdWithExt.Substring(0, lastDot) : publicIdWithExt;
            }
        }
        catch { }
        return null;
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
                    var publicId = ExtractPublicIdFromUrl(employee.FaceImageUrl);
                    if (!string.IsNullOrEmpty(publicId))
                    {
                        await _cloudinaryService.DeleteImageAsync(publicId);
                    }
                    return BadRequest(new { message = $"Ảnh khuôn mặt không hợp lệ: {ex.Message}" });
                }
            }

            var created = await _employeeService.CreateEmployeeAsync(employee);
            if (!string.IsNullOrEmpty(created.FaceImageUrl) && created.FaceEmbedding != null)
            {
                await _employeeService.AddEmployeeFaceAsync(
                    created.EmployeeId,
                    created.FaceImageUrl,
                    created.FaceEmbedding,
                    isPrimary: true);
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
            var existing = await _employeeService.GetEmployeeByIdAsync(id);
            if (existing == null)
                return NotFound();

            // Kiểm tra xem user có đổi ảnh không
            var faceImageChanged = employee.FaceImageUrl != existing.FaceImageUrl;
            if (faceImageChanged)
            {
                if (!string.IsNullOrEmpty(employee.FaceImageUrl))
                {
                    try
                    {
                        employee.FaceEmbedding = await GetFaceEmbeddingAsync(employee.FaceImageUrl);
                    }
                    catch (Exception ex)
                    {
                        var publicId = ExtractPublicIdFromUrl(employee.FaceImageUrl);
                        if (!string.IsNullOrEmpty(publicId))
                        {
                            await _cloudinaryService.DeleteImageAsync(publicId);
                        }
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

            if (faceImageChanged && !string.IsNullOrEmpty(employee.FaceImageUrl) && employee.FaceEmbedding != null)
            {
                await _employeeService.AddEmployeeFaceAsync(
                    id,
                    employee.FaceImageUrl,
                    employee.FaceEmbedding,
                    isPrimary: true);
            }

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

    // DELETE: api/employees/5/permanent
    [HttpDelete("{id}/permanent")]
    public async Task<IActionResult> PermanentDeleteEmployee(int id)
    {
        try
        {
            var deleted = await _employeeService.PermanentDeleteEmployeeAsync(id);
            if (!deleted)
                return NotFound();

            return NoContent();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Không thể xóa nhân viên vì đã có dữ liệu lịch sử liên quan." });
        }
    }
    // GET: api/employees/registered-faces
    [HttpGet("registered-faces")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<RegisteredFaceDto>>> GetRegisteredFaces()
    {
        var faces = await _employeeService.GetActiveEmployeeFacesAsync();
        return Ok(faces.Select(face => new RegisteredFaceDto
        {
            FaceId = face.Id,
            EmployeeId = face.EmployeeId,
            FullName = face.Employee?.FullName ?? string.Empty,
            FaceEmbedding = face.FaceEmbedding
        }));
    }

    // GET: api/employees/5/faces
    [HttpGet("{id}/faces")]
    public async Task<ActionResult<IEnumerable<EmployeeFaceDto>>> GetEmployeeFaces(int id)
    {
        if (!await _employeeService.EmployeeExistsAsync(id))
            return NotFound();

        var faces = await _employeeService.GetEmployeeFacesAsync(id);
        return Ok(faces.Select(ToFaceDto));
    }

    // POST: api/employees/5/faces
    [HttpPost("{id}/faces")]
    public async Task<ActionResult<EmployeeFaceDto>> AddEmployeeFace(int id, CreateEmployeeFaceRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FaceImageUrl))
            return BadRequest(new { message = "Face image URL is required." });

        if (!await _employeeService.EmployeeExistsAsync(id))
            return NotFound();

        try
        {
            var embedding = await GetFaceEmbeddingAsync(request.FaceImageUrl);
            if (embedding == null)
            {
                if (!string.IsNullOrEmpty(request.CloudinaryPublicId))
                {
                    await _cloudinaryService.DeleteImageAsync(request.CloudinaryPublicId);
                }
                else
                {
                    var publicId = ExtractPublicIdFromUrl(request.FaceImageUrl);
                    if (!string.IsNullOrEmpty(publicId)) await _cloudinaryService.DeleteImageAsync(publicId);
                }
                return BadRequest(new { message = "Cannot extract face embedding." });
            }

            var face = await _employeeService.AddEmployeeFaceAsync(
                id,
                request.FaceImageUrl,
                embedding,
                request.IsPrimary,
                request.CloudinaryPublicId,
                request.Angle);
            return CreatedAtAction(nameof(GetEmployeeFaces), new { id }, ToFaceDto(face));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            if (!string.IsNullOrEmpty(request.CloudinaryPublicId))
            {
                await _cloudinaryService.DeleteImageAsync(request.CloudinaryPublicId);
            }
            else
            {
                var publicId = ExtractPublicIdFromUrl(request.FaceImageUrl);
                if (!string.IsNullOrEmpty(publicId)) await _cloudinaryService.DeleteImageAsync(publicId);
            }
            return BadRequest(new { message = $"Ảnh khuôn mặt không hợp lệ: {ex.Message}" });
        }
    }

    // DELETE: api/employees/5/faces/10
    [HttpDelete("{id}/faces/{faceId}")]
    public async Task<IActionResult> DeleteEmployeeFace(int id, int faceId)
    {
        var deletedFace = await _employeeService.DeleteEmployeeFaceAsync(id, faceId);
        if (deletedFace == null)
            return NotFound();

        await _cloudinaryService.DeleteImageAsync(deletedFace.CloudinaryPublicId);

        return NoContent();
    }

    private static EmployeeFaceDto ToFaceDto(EmployeeFace face)
    {
        return new EmployeeFaceDto
        {
            Id = face.Id,
            EmployeeId = face.EmployeeId,
            FaceImageUrl = face.FaceImageUrl,
            CloudinaryPublicId = face.CloudinaryPublicId,
            IsPrimary = face.IsPrimary,
            Angle = face.Angle,
            CreatedAt = face.CreatedAt
        };
    }
}
