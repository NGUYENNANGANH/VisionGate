using VisionGate.Models;

namespace VisionGate.Services.Interfaces;

public interface IDashboardService
{
    Task<object> GetDashboardStatsAsync();
    Task<IEnumerable<CheckInRecord>> GetRecentCheckInsAsync(int count = 10);
    Task<IEnumerable<Violation>> GetRecentViolationsAsync(int count = 10);
    Task<object> GetCheckInChartAsync(int days = 7);
}
