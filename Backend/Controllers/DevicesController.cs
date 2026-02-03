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

    // GET: api/devices
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Device>>> GetDevices()
    {
        var devices = await _deviceService.GetAllDevicesAsync();
        return Ok(devices);
    }

    // GET: api/devices/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Device>> GetDevice(int id)
    {
        var device = await _deviceService.GetDeviceByIdAsync(id);

        if (device == null)
            return NotFound();

        return device;
    }

    // POST: api/devices
    [HttpPost]
    public async Task<ActionResult<Device>> CreateDevice(Device device)
    {
        var created = await _deviceService.CreateDeviceAsync(device);
        return CreatedAtAction(nameof(GetDevice), new { id = created.DeviceId }, created);
    }

    // PUT: api/devices/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDevice(int id, Device device)
    {
        var updated = await _deviceService.UpdateDeviceAsync(id, device);
        if (!updated)
            return NotFound();

        return NoContent();
    }

    // PUT: api/devices/5/heartbeat
    [HttpPut("{id}/heartbeat")]
    public async Task<IActionResult> UpdateHeartbeat(int id)
    {
        var updated = await _deviceService.UpdateHeartbeatAsync(id);
        if (!updated)
            return NotFound();

        return NoContent();
    }
}
