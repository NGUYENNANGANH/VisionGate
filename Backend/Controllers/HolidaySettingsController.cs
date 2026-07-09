using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VisionGate.Data;
using VisionGate.Models;

namespace VisionGate.Controllers;

[ApiController]
[Route("api/holiday-settings")]
[Authorize(Roles = "SuperAdmin,Admin")]
public class HolidaySettingsController : ControllerBase
{
    private static readonly HashSet<string> ValidDays = new(StringComparer.OrdinalIgnoreCase) { "Saturday", "Sunday" };
    private readonly AppDbContext _context;

    public HolidaySettingsController(AppDbContext context)
    {
        _context = context;
    }

    public record HolidaySettingsRequest(List<string> WeeklyOffDays);

    [HttpGet]
    public async Task<IActionResult> GetSettings()
    {
        var setting = await GetOrCreateSettingsAsync();
        return Ok(new
        {
            setting.HolidaySettingId,
            WeeklyOffDays = SplitDays(setting.WeeklyOffDays),
            setting.UpdatedAt
        });
    }

    [HttpPut]
    public async Task<IActionResult> UpdateSettings([FromBody] HolidaySettingsRequest request)
    {
        var requestedDays = (request?.WeeklyOffDays ?? new List<string>())
            .Where(day => !string.IsNullOrWhiteSpace(day))
            .Select(day => day.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (requestedDays.Any(day => !ValidDays.Contains(day)))
            return BadRequest(new { message = "Ng\u00E0y ngh\u1EC9 h\u1EB1ng tu\u1EA7n kh\u00F4ng h\u1EE3p l\u1EC7." });

        var setting = await GetOrCreateSettingsAsync();
        setting.WeeklyOffDays = string.Join(',', requestedDays);
        setting.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            setting.HolidaySettingId,
            WeeklyOffDays = SplitDays(setting.WeeklyOffDays),
            setting.UpdatedAt
        });
    }

    private async Task<HolidaySetting> GetOrCreateSettingsAsync()
    {
        var setting = await _context.HolidaySettings.FirstOrDefaultAsync(s => s.HolidaySettingId == 1);
        if (setting != null)
            return setting;

        setting = new HolidaySetting
        {
            HolidaySettingId = 1,
            WeeklyOffDays = "Saturday,Sunday",
            UpdatedAt = DateTime.UtcNow
        };

        _context.HolidaySettings.Add(setting);
        await _context.SaveChangesAsync();
        return setting;
    }

    private static List<string> SplitDays(string days) => days
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .ToList();
}