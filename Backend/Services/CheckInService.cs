using VisionGate.Models;
using VisionGate.Services.Interfaces;
using VisionGate.Repositories.Interfaces;
using VisionGate.Helpers;

namespace VisionGate.Services;

public class CheckInService : ICheckInService
{
    private readonly ICheckInRepository _checkInRepository;
    private readonly IEmployeeRepository _employeeRepository;

    public CheckInService(
        ICheckInRepository checkInRepository,
        IEmployeeRepository employeeRepository)
    {
        _checkInRepository = checkInRepository;
        _employeeRepository = employeeRepository;
    }

    public async Task<IEnumerable<CheckInRecord>> GetCheckInsAsync(
        DateTime? from = null,
        DateTime? to = null,
        int? employeeId = null)
    {
        return await _checkInRepository.GetAllAsync(from, to, employeeId);
    }

    public async Task<CheckInRecord> CreateCheckInAsync(CheckInRecord checkIn)
    {
        checkIn.CreatedAt = DateTimeHelper.VietnamNow();
        checkIn.CheckInTime = DateTimeHelper.VietnamNow();

        // Validate employee exists and is still working
        var employee = await _employeeRepository.GetByIdAsync(checkIn.EmployeeId);
        if (employee == null)
            throw new InvalidOperationException($"Employee with ID {checkIn.EmployeeId} not found.");

        if (!employee.IsActive)
            throw new InvalidOperationException($"Employee with ID {checkIn.EmployeeId} is inactive and cannot check in.");

        return await _checkInRepository.AddAsync(checkIn);
    }
}
