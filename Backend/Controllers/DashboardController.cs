using Microsoft.AspNetCore.Mvc;
using VisionGate.Models;
using VisionGate.Services.Interfaces;

namespace VisionGate.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    // GET: api/dashboard/stats
    [HttpGet("stats")]
    public async Task<ActionResult<object>> GetDashboardStats()
    {
        var stats = await _dashboardService.GetDashboardStatsAsync();
        return Ok(stats);
    }

    // GET: api/dashboard/recent-checkins
    [HttpGet("recent-checkins")]
    public async Task<ActionResult<IEnumerable<CheckInRecord>>> GetRecentCheckIns([FromQuery] int count = 10)
    {
        var checkIns = await _dashboardService.GetRecentCheckInsAsync(count);
        return Ok(checkIns);
    }

    // GET: api/dashboard/recent-violations
    [HttpGet("recent-violations")]
    public async Task<ActionResult<IEnumerable<Violation>>> GetRecentViolations([FromQuery] int count = 10)
    {
        var violations = await _dashboardService.GetRecentViolationsAsync(count);
        return Ok(violations);
    }

    // GET: api/dashboard/checkin-chart
    [HttpGet("checkin-chart")]
    public async Task<ActionResult<object>> GetCheckInChart([FromQuery] int days = 7)
    {
        var chart = await _dashboardService.GetCheckInChartAsync(days);
        return Ok(chart);
    }
}
