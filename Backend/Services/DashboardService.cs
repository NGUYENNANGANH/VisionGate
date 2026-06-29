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
        
        var allDevices = await _deviceRepository.GetAllAsync();
        var onlineDevices = allDevices.Count(); 
        
        var ppeCompliance = 100.0; 

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
}
