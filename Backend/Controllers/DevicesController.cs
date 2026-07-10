using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VisionGate.Models;
using VisionGate.Services.Interfaces;

namespace VisionGate.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DevicesController : ControllerBase
{
    private readonly IDeviceService _deviceService;

    public DevicesController(IDeviceService deviceService)
    {
        _deviceService = deviceService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Device>>> GetDevices()
    {
        var devices = await _deviceService.GetAllDevicesAsync();
        return Ok(devices);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Device>> GetDevice(int id)
    {
        var device = await _deviceService.GetDeviceByIdAsync(id);
        return device == null ? NotFound() : device;
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<ActionResult<Device>> CreateDevice(Device device)
    {
        try
        {
            var created = await _deviceService.CreateDeviceAsync(device);
            return CreatedAtAction(nameof(GetDevice), new { id = created.DeviceId }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpdateDevice(int id, Device device)
    {
        try
        {
            var updated = await _deviceService.UpdateDeviceAsync(id, device);
            if (!updated)
                return NotFound();

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id}/active")]
    public async Task<IActionResult> SetDeviceActive(int id, SetDeviceActiveRequest request)
    {
        var device = await _deviceService.GetDeviceByIdAsync(id);
        if (device == null)
            return NotFound();

        device.IsActive = request.IsActive;
        var updated = await _deviceService.UpdateDeviceAsync(id, device);
        if (!updated)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> DeleteDevice(int id)
    {
        try
        {
            var deleted = await _deviceService.DeleteDeviceAsync(id);
            if (!deleted)
                return NotFound();

            return NoContent();
        }
        catch
        {
            return BadRequest(new { message = "Khong the xoa thiet bi do co du lieu lien quan." });
        }
    }
}

public record SetDeviceActiveRequest(bool IsActive);
