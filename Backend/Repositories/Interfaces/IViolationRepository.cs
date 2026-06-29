using VisionGate.Models;

namespace VisionGate.Repositories.Interfaces;

public interface IViolationRepository
{
    Task<IEnumerable<Violation>> GetAllAsync(bool? isResolved = null, int? employeeId = null, DateTime? from = null, DateTime? to = null);
    Task<Violation> AddAsync(Violation violation);
    Task<int> GetTodayCountAsync();
}
