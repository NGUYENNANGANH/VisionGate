namespace VisionGate.Services.Interfaces;

public interface IDashboardService
{
    Task<object> GetDashboardStatsAsync();
}
