using VisionGate.Models;

namespace VisionGate.Services.Interfaces;

public interface ICheckInService
{
    Task<IEnumerable<CheckInRecord>> GetCheckInsAsync(DateTime? from = null, DateTime? to = null, int? employeeId = null, CheckInStatus? status = null);
    Task<CheckInRecord?> GetCheckInByIdAsync(int id);
    Task<CheckInRecord> CreateCheckInAsync(CheckInRecord checkIn);
    Task<object> GetTodayStatsAsync();
    Task<bool> ProcessCheckInWithPPEAsync(int checkInId, PPEDetection ppeDetection);
}
