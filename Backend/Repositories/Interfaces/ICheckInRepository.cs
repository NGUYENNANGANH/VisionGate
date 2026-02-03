using VisionGate.Models;

namespace VisionGate.Repositories.Interfaces;

public interface ICheckInRepository
{
    Task<IEnumerable<CheckInRecord>> GetAllAsync(DateTime? from = null, DateTime? to = null, int? employeeId = null, CheckInStatus? status = null);
    Task<CheckInRecord?> GetByIdAsync(int id);
    Task<CheckInRecord> AddAsync(CheckInRecord checkIn);
    Task UpdateAsync(CheckInRecord checkIn);
    Task<int> GetTodayCountAsync();
    Task<int> GetTodayWithPPECountAsync();
}
