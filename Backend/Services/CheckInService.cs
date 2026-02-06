using VisionGate.Models;
using VisionGate.Services.Interfaces;
using VisionGate.Repositories.Interfaces;
using VisionGate.Helpers;

namespace VisionGate.Services;

public class CheckInService : ICheckInService
{
    private readonly ICheckInRepository _checkInRepository;
    private readonly IEmployeeRepository _employeeRepository;
    private readonly IPPEDetectionRepository _ppeDetectionRepository;
    private readonly IViolationService _violationService;

    public CheckInService(
        ICheckInRepository checkInRepository,
        IEmployeeRepository employeeRepository,
        IPPEDetectionRepository ppeDetectionRepository,
        IViolationService violationService)
    {
        _checkInRepository = checkInRepository;
        _employeeRepository = employeeRepository;
        _ppeDetectionRepository = ppeDetectionRepository;
        _violationService = violationService;
    }

    public async Task<IEnumerable<CheckInRecord>> GetCheckInsAsync(
        DateTime? from = null,
        DateTime? to = null,
        int? employeeId = null,
        CheckInStatus? status = null)
    {
        return await _checkInRepository.GetAllAsync(from, to, employeeId, status);
    }

    public async Task<CheckInRecord?> GetCheckInByIdAsync(int id)
    {
        return await _checkInRepository.GetByIdAsync(id);
    }

    public async Task<CheckInRecord> CreateCheckInAsync(CheckInRecord checkIn)
    {
        checkIn.CreatedAt = DateTimeHelper.VietnamNow();
        checkIn.CheckInTime = DateTimeHelper.VietnamNow();

        // Validate employee exists
        var employee = await _employeeRepository.GetByIdAsync(checkIn.EmployeeId);
        if (employee == null)
            throw new InvalidOperationException($"Employee with ID {checkIn.EmployeeId} not found.");

        return await _checkInRepository.AddAsync(checkIn);
    }

    public async Task<bool> ProcessCheckInWithPPEAsync(int checkInId, PPEDetection ppeDetection)
    {
        var checkIn = await _checkInRepository.GetByIdAsync(checkInId);
        if (checkIn == null)
            return false;

        // Save PPE detection
        ppeDetection.CheckInId = checkInId;
        ppeDetection.EmployeeId = checkIn.EmployeeId;
        ppeDetection.DetectionTime = DateTimeHelper.VietnamNow();
        ppeDetection.CreatedAt = DateTimeHelper.VietnamNow();

        var saved = await _ppeDetectionRepository.AddAsync(ppeDetection);

        // Update check-in record
        checkIn.PPEDetectionId = saved.PPEDetectionId;
        checkIn.HasPPE = ppeDetection.OverallCompliance;

        if (!ppeDetection.OverallCompliance)
        {
            checkIn.Status = CheckInStatus.Warning;
            
            // Create violation automatically
            await _violationService.CreateViolationFromPPEDetectionAsync(
                ppeDetection, 
                checkIn.EmployeeId, 
                checkInId);
        }

        await _checkInRepository.UpdateAsync(checkIn);
        return true;
    }

    public async Task<object> GetTodayStatsAsync()
    {
        var today = DateTimeHelper.VietnamNow().Date;

        var totalCheckIns = await _checkInRepository.GetTodayCountAsync();
        var withPPE = await _checkInRepository.GetTodayWithPPECountAsync();
        var violations = await _violationService.GetViolationStatsAsync(today, today.AddDays(1)) as dynamic;

        return new
        {
            TotalCheckIns = totalCheckIns,
            WithPPE = withPPE,
            WithoutPPE = totalCheckIns - withPPE,
            Violations = violations?.Total ?? 0,
            Date = today
        };
    }
}
