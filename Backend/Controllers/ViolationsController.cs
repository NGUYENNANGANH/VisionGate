using Microsoft.AspNetCore.Mvc;
using VisionGate.Models;
using VisionGate.Services.Interfaces;

namespace VisionGate.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ViolationsController : ControllerBase
{
    private readonly IViolationService _violationService;

    public ViolationsController(IViolationService violationService)
    {
        _violationService = violationService;
    }

    // GET: api/violations
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Violation>>> GetViolations(
        [FromQuery] bool? isResolved = null,
        [FromQuery] int? employeeId = null,
        [FromQuery] Severity? severity = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        var violations = await _violationService.GetViolationsAsync(isResolved, employeeId, severity, from, to);
        return Ok(violations);
    }

    // GET: api/violations/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Violation>> GetViolation(int id)
    {
        var violation = await _violationService.GetViolationByIdAsync(id);

        if (violation == null)
            return NotFound();

        return violation;
    }

    // POST: api/violations
    [HttpPost]
    public async Task<ActionResult<Violation>> CreateViolation(Violation violation)
    {
        var created = await _violationService.CreateViolationAsync(violation);
        return CreatedAtAction(nameof(GetViolation), new { id = created.ViolationId }, created);
    }

    // PUT: api/violations/5/resolve
    [HttpPut("{id}/resolve")]
    public async Task<IActionResult> ResolveViolation(int id, [FromBody] int resolvedBy)
    {
        var resolved = await _violationService.ResolveViolationAsync(id, resolvedBy);
        if (!resolved)
            return NotFound();

        return NoContent();
    }

    // GET: api/violations/stats
    [HttpGet("stats")]
    public async Task<ActionResult<object>> GetViolationStats(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        var stats = await _violationService.GetViolationStatsAsync(from, to);
        return Ok(stats);
    }
}
