using VisionGate.Models;

namespace VisionGate.Repositories.Interfaces;

public interface IViolationRepository
{
    Task<IEnumerable<Violation>> GetAllAsync(bool? isResolved = null, int? employeeId = null, Severity? severity = null, DateTime? from = null, DateTime? to = null);
    Task<Violation?> GetByIdAsync(int id);
    Task<Violation> AddAsync(Violation violation);
    Task UpdateAsync(Violation violation);
    Task<int> GetTodayCountAsync();
    Task<int> GetTotalCountAsync(DateTime? from = null, DateTime? to = null);
    Task<int> GetResolvedCountAsync(DateTime? from = null, DateTime? to = null);
    Task<Dictionary<string, int>> GetCountByTypeAsync(DateTime? from = null, DateTime? to = null);
    Task<Dictionary<string, int>> GetCountBySeverityAsync(DateTime? from = null, DateTime? to = null);
}
