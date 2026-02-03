using VisionGate.Models;

namespace VisionGate.Services.Interfaces;

public interface IViolationService
{
    Task<IEnumerable<Violation>> GetViolationsAsync(bool? isResolved = null, int? employeeId = null, Severity? severity = null, DateTime? from = null, DateTime? to = null);
    Task<Violation?> GetViolationByIdAsync(int id);
    Task<Violation> CreateViolationAsync(Violation violation);
    Task<bool> ResolveViolationAsync(int id, int resolvedBy);
    Task<object> GetViolationStatsAsync(DateTime? from = null, DateTime? to = null);
    Task<Violation> CreateViolationFromPPEDetectionAsync(PPEDetection ppeDetection, int employeeId, int? checkInId);
}
