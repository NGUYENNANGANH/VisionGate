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
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        var violations = await _violationService.GetViolationsAsync(isResolved, employeeId, from, to);
        return Ok(violations);
    }
}
