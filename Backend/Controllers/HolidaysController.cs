using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VisionGate.Data;
using VisionGate.Models;

namespace VisionGate.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin,Admin")]
public class HolidaysController : ControllerBase
{
    private readonly AppDbContext _context;

    public HolidaysController(AppDbContext context)
    {
        _context = context;
    }

    public record HolidayRequest(DateTime Date, string Name, string Type, bool IsActive);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Holiday>>> GetHolidays(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] bool? isActive = null)
    {
        var query = _context.Holidays.AsNoTracking().AsQueryable();

        if (from.HasValue)
            query = query.Where(h => h.Date >= from.Value.Date);

        if (to.HasValue)
            query = query.Where(h => h.Date <= to.Value.Date);

        if (isActive.HasValue)
            query = query.Where(h => h.IsActive == isActive.Value);

        return Ok(await query.OrderByDescending(h => h.Date).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Holiday>> GetHoliday(int id)
    {
        var holiday = await _context.Holidays.AsNoTracking().FirstOrDefaultAsync(h => h.HolidayId == id);
        return holiday == null ? NotFound() : Ok(holiday);
    }

    [HttpPost]
    public async Task<ActionResult<Holiday>> CreateHoliday([FromBody] HolidayRequest request)
    {
        var date = request.Date.Date;
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "T\u00EAn ng\u00E0y ngh\u1EC9 l\u00E0 b\u1EAFt bu\u1ED9c." });

        if (await _context.Holidays.AnyAsync(h => h.Date == date))
            return Conflict(new { message = "Ng\u00E0y n\u00E0y \u0111\u00E3 t\u1ED3n t\u1EA1i trong l\u1ECBch ngh\u1EC9." });

        var holiday = new Holiday
        {
            Date = date,
            Name = request.Name.Trim(),
            Type = string.IsNullOrWhiteSpace(request.Type) ? "Holiday" : request.Type.Trim(),
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _context.Holidays.Add(holiday);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetHoliday), new { id = holiday.HolidayId }, holiday);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateHoliday(int id, [FromBody] HolidayRequest request)
    {
        var holiday = await _context.Holidays.FindAsync(id);
        if (holiday == null)
            return NotFound();

        var date = request.Date.Date;
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "T\u00EAn ng\u00E0y ngh\u1EC9 l\u00E0 b\u1EAFt bu\u1ED9c." });

        if (await _context.Holidays.AnyAsync(h => h.HolidayId != id && h.Date == date))
            return Conflict(new { message = "Ng\u00E0y n\u00E0y \u0111\u00E3 t\u1ED3n t\u1EA1i trong l\u1ECBch ngh\u1EC9." });

        holiday.Date = date;
        holiday.Name = request.Name.Trim();
        holiday.Type = string.IsNullOrWhiteSpace(request.Type) ? "Holiday" : request.Type.Trim();
        holiday.IsActive = request.IsActive;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteHoliday(int id)
    {
        var holiday = await _context.Holidays.FindAsync(id);
        if (holiday == null)
            return NotFound();

        _context.Holidays.Remove(holiday);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
