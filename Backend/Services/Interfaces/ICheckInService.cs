using VisionGate.Models;

namespace VisionGate.Services.Interfaces;

public interface ICheckInService
{
    Task<IEnumerable<CheckInRecord>> GetCheckInsAsync(DateTime? from = null, DateTime? to = null, int? employeeId = null);
    Task<CheckInRecord> CreateCheckInAsync(CheckInRecord checkIn);
}
