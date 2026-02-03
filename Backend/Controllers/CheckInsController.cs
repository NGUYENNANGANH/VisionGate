using Microsoft.AspNetCore.Mvc;
using VisionGate.Models;
using VisionGate.Services.Interfaces;

namespace VisionGate.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CheckInsController : ControllerBase
{
    private readonly ICheckInService _checkInService;

    public CheckInsController(ICheckInService checkInService)
    {
        _checkInService = checkInService;
    }

    // GET: api/checkins
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CheckInRecord>>> GetCheckIns(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int? employeeId = null,
        [FromQuery] CheckInStatus? status = null)
    {
        var checkIns = await _checkInService.GetCheckInsAsync(from, to, employeeId, status);
        return Ok(checkIns);
    }

    // GET: api/checkins/5
    [HttpGet("{id}")]
    public async Task<ActionResult<CheckInRecord>> GetCheckIn(int id)
    {
        var checkIn = await _checkInService.GetCheckInByIdAsync(id);

        if (checkIn == null)
            return NotFound();

        return checkIn;
    }

    // POST: api/checkins
    [HttpPost]
    public async Task<ActionResult<CheckInRecord>> CreateCheckIn(CheckInRecord checkIn)
    {
        try
        {
            var created = await _checkInService.CreateCheckInAsync(checkIn);
            return CreatedAtAction(nameof(GetCheckIn), new { id = created.CheckInId }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // GET: api/checkins/today
    [HttpGet("today")]
    public async Task<ActionResult<object>> GetTodayStats()
    {
        var stats = await _checkInService.GetTodayStatsAsync();
        return Ok(stats);
    }
}
