using VisionGate.Models;
using VisionGate.Services.Interfaces;
using VisionGate.Repositories.Interfaces;

namespace VisionGate.Services;

public class DashboardService : IDashboardService
{
    private readonly IEmployeeRepository _employeeRepository;
    private readonly ICheckInRepository _checkInRepository;
    private readonly IViolationRepository _violationRepository;
    private readonly IDeviceRepository _deviceRepository;

    public DashboardService(
        IEmployeeRepository employeeRepository,
        ICheckInRepository checkInRepository,
        IViolationRepository violationRepository,
        IDeviceRepository deviceRepository)
    {
        _employeeRepository = employeeRepository;
        _checkInRepository = checkInRepository;
        _violationRepository = violationRepository;
        _deviceRepository = deviceRepository;
    }

    public async Task<object> GetDashboardStatsAsync()
    {
        var totalEmployees = (await _employeeRepository.GetAllAsync(isActive: true)).Count();
        var todayCheckIns = await _checkInRepository.GetTodayCountAsync();
        var todayViolations = await _violationRepository.GetTodayCountAsync();
        var onlineDevices = await _deviceRepository.GetOnlineCountAsync();
         var allDevices = await _deviceRepository.GetAllAsync(); 

        var ppeCompliance = todayCheckIns > 0
            ? await _checkInRepository.GetTodayWithPPECountAsync() * 100.0 / todayCheckIns
            : 0;

        return new
        {
            TotalEmployees = totalEmployees,
            TodayCheckIns = todayCheckIns,
            TodayViolations = todayViolations,
            OnlineDevices = onlineDevices,
            TotalDevices = allDevices.Count(),
            PPEComplianceRate = Math.Round(ppeCompliance, 2)
        };
    }

    public async Task<IEnumerable<CheckInRecord>> GetRecentCheckInsAsync(int count = 10)
    {
        var allCheckIns = await _checkInRepository.GetAllAsync();
        return allCheckIns.Take(count);
    }

    public async Task<IEnumerable<Violation>> GetRecentViolationsAsync(int count = 10)
    {
        var unresolvedViolations = await _violationRepository.GetAllAsync(isResolved: false);
        return unresolvedViolations.Take(count);
    }

    public async Task<object> GetCheckInChartAsync(int days = 7)
    {
        var startDate = DateTime.UtcNow.Date.AddDays(-days);
        var allCheckIns = await _checkInRepository.GetAllAsync(from: startDate);

        var data = allCheckIns
            .GroupBy(c => c.CheckInTime.Date)
            .Select(g => new
            {
                Date = g.Key,
                Total = g.Count(),
                WithPPE = g.Count(c => c.HasPPE),
                WithoutPPE = g.Count(c => !c.HasPPE)
            })
            .OrderBy(x => x.Date)
            .ToList();

        return data;
    }
}
