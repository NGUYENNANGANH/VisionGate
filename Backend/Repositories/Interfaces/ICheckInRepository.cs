using VisionGate.Models;

namespace VisionGate.Repositories.Interfaces;

public interface ICheckInRepository
{
    Task<IEnumerable<CheckInRecord>> GetAllAsync(DateTime? from = null, DateTime? to = null, int? employeeId = null);
    Task<CheckInRecord> AddAsync(CheckInRecord checkIn);
    Task<int> GetTodayCountAsync();
    Task<int> GetCurrentlyPresentCountAsync();
}
