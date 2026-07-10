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
    private readonly IPPEDetectionRepository _ppeDetectionRepository;

    public DashboardService(
        IEmployeeRepository employeeRepository,
        ICheckInRepository checkInRepository,
        IViolationRepository violationRepository,
        IDeviceRepository deviceRepository,
        IPPEDetectionRepository ppeDetectionRepository)
    {
        _employeeRepository = employeeRepository;
        _checkInRepository = checkInRepository;
        _violationRepository = violationRepository;
        _deviceRepository = deviceRepository;
        _ppeDetectionRepository = ppeDetectionRepository;
    }

    public async Task<object> GetDashboardStatsAsync()
    {
        var totalEmployees = (await _employeeRepository.GetAllAsync(isActive: true)).Count();
        var todayCheckIns = await _checkInRepository.GetCurrentlyPresentCountAsync();
        var todayViolations = await _violationRepository.GetTodayCountAsync();
        
        var allDevices = await _deviceRepository.GetAllAsync();
        var onlineDevices = allDevices.Count(d => d.IsActive); 
        
        var ppeDetections = (await _ppeDetectionRepository.GetAllAsync()).ToList();
        var totalPPE = ppeDetections.Count;
        
        var ppeCompliance = totalPPE > 0 ? (ppeDetections.Count(p => p.OverallCompliance) * 100.0 / totalPPE) : 100.0;
        var helmetCompliance = totalPPE > 0 ? (ppeDetections.Count(p => p.HasHelmet) * 100.0 / totalPPE) : 100.0;
        var vestCompliance = totalPPE > 0 ? (ppeDetections.Count(p => p.HasSafetyVest) * 100.0 / totalPPE) : 100.0;
        var shoesCompliance = totalPPE > 0 ? (ppeDetections.Count(p => p.HasSafetyBoots) * 100.0 / totalPPE) : 100.0;

        return new
        {
            TotalEmployees = totalEmployees,
            TodayCheckIns = todayCheckIns,
            TodayViolations = todayViolations,
            OnlineDevices = onlineDevices,
            TotalDevices = allDevices.Count(),
            PPEComplianceRate = Math.Round(ppeCompliance),
            HelmetComplianceRate = Math.Round(helmetCompliance),
            VestComplianceRate = Math.Round(vestCompliance),
            ShoesComplianceRate = Math.Round(shoesCompliance)
        };
    }
}
