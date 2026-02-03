using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VisionGate.Models;
using VisionGate.Services.Interfaces;

namespace VisionGate.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin,Admin")]
public class SettingsController : ControllerBase
{
    private readonly ISettingService _settingService;

    public SettingsController(ISettingService settingService)
    {
        _settingService = settingService;
    }

    // GET: api/settings
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Setting>>> GetSettings()
    {
        var settings = await _settingService.GetAllSettingsAsync();
        return Ok(settings);
    }

    // GET: api/settings/TelegramBotToken
    [HttpGet("{key}")]
    public async Task<ActionResult<Setting>> GetSetting(string key)
    {
        var setting = await _settingService.GetSettingByKeyAsync(key);
        
        if (setting == null)
            return NotFound(new { message = $"Setting with key '{key}' not found" });

        return Ok(setting);
    }

    // PUT: api/settings/TelegramBotToken
    [HttpPut("{key}")]
    public async Task<ActionResult<Setting>> UpdateSetting(string key, [FromBody] UpdateSettingRequest request)
    {
        try
        {
            var setting = await _settingService.UpdateSettingAsync(key, request.Value);
            return Ok(setting);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // POST: api/settings
    [HttpPost]
    public async Task<ActionResult<Setting>> CreateSetting([FromBody] Setting setting)
    {
        try
        {
            var created = await _settingService.CreateSettingAsync(setting);
            return CreatedAtAction(nameof(GetSetting), new { key = created.Key }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

public class UpdateSettingRequest
{
    public string Value { get; set; } = string.Empty;
}
