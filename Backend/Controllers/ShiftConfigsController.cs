using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VisionGate.Data;
using VisionGate.Models;

namespace VisionGate.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ShiftConfigsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ShiftConfigsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ShiftConfig>>> GetShiftConfigs()
    {
        return await _context.ShiftConfigs.OrderBy(s => s.ShiftId).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ShiftConfig>> GetShiftConfig(int id)
    {
        var shiftConfig = await _context.ShiftConfigs.FindAsync(id);

        if (shiftConfig == null)
        {
            return NotFound(new { message = "Không tìm thấy cấu hình ca làm việc." });
        }

        return shiftConfig;
    }

    public class CreateOrUpdateShiftConfigDto
    {
        public string ShiftName { get; set; } = string.Empty;
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
    }

    [HttpPost]
    public async Task<ActionResult<ShiftConfig>> PostShiftConfig([FromBody] CreateOrUpdateShiftConfigDto dto)
    {
        if (!TimeOnly.TryParse(dto.StartTime, out var startTime) || !TimeOnly.TryParse(dto.EndTime, out var endTime))
        {
            return BadRequest(new { message = "Giờ bắt đầu hoặc giờ kết thúc không hợp lệ." });
        }

        var shiftConfig = new ShiftConfig
        {
            ShiftName = string.IsNullOrWhiteSpace(dto.ShiftName) ? "Ca mới" : dto.ShiftName,
            StartTime = startTime,
            EndTime = endTime,
            IsActive = true
        };

        _context.ShiftConfigs.Add(shiftConfig);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetShiftConfig), new { id = shiftConfig.ShiftId }, shiftConfig);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutShiftConfig(int id, [FromBody] CreateOrUpdateShiftConfigDto dto)
    {
        var shiftConfig = await _context.ShiftConfigs.FindAsync(id);
        if (shiftConfig == null)
        {
            return NotFound(new { message = "Không tìm thấy cấu hình ca làm việc." });
        }

        if (!string.IsNullOrWhiteSpace(dto.ShiftName))
        {
            shiftConfig.ShiftName = dto.ShiftName;
        }

        if (TimeOnly.TryParse(dto.StartTime, out var startTime))
        {
            shiftConfig.StartTime = startTime;
        }
        else
        {
            return BadRequest(new { message = "Giờ bắt đầu không hợp lệ." });
        }

        if (TimeOnly.TryParse(dto.EndTime, out var endTime))
        {
            shiftConfig.EndTime = endTime;
        }
        else
        {
            return BadRequest(new { message = "Giờ kết thúc không hợp lệ." });
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!ShiftConfigExists(id))
            {
                return NotFound();
            }
            else
            {
                throw;
            }
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteShiftConfig(int id)
    {
        var shiftConfig = await _context.ShiftConfigs.Include(s => s.Employees).FirstOrDefaultAsync(s => s.ShiftId == id);
        
        if (shiftConfig == null)
        {
            return NotFound(new { message = "Không tìm thấy cấu hình ca làm việc." });
        }

        if (id == 1)
        {
            return BadRequest(new { message = "Không thể xóa ca làm việc mặc định." });
        }

        if (shiftConfig.Employees.Any())
        {
            return BadRequest(new { message = "Không thể xóa ca làm việc vì đang có nhân viên sử dụng." });
        }

        _context.ShiftConfigs.Remove(shiftConfig);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id}/assign")]
    public async Task<IActionResult> AssignEmployees(int id, [FromBody] List<int> employeeIds)
    {
        var shiftConfig = await _context.ShiftConfigs.FindAsync(id);
        if (shiftConfig == null)
        {
            return NotFound(new { message = "Không tìm thấy cấu hình ca làm việc." });
        }

        // Lấy tất cả nhân viên đang thuộc ca này
        var currentEmployees = await _context.Employees.Where(e => e.ShiftId == id).ToListAsync();
        
        // Những nhân viên bị bỏ tích (có trong ca hiện tại nhưng không có trong list truyền lên)
        // -> chuyển về Ca 1 (Mặc định)
        foreach (var emp in currentEmployees)
        {
            if (!employeeIds.Contains(emp.EmployeeId))
            {
                emp.ShiftId = 1;
            }
        }

        // Những nhân viên được tích (có trong list truyền lên)
        if (employeeIds.Any())
        {
            var newEmployees = await _context.Employees.Where(e => employeeIds.Contains(e.EmployeeId)).ToListAsync();
            foreach (var emp in newEmployees)
            {
                emp.ShiftId = id;
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Gán ca làm việc thành công!" });
    }

    private bool ShiftConfigExists(int id)
    {
        return _context.ShiftConfigs.Any(e => e.ShiftId == id);
    }
}
