using VisionGate.Models;

namespace VisionGate.Services.Interfaces;

public interface IViolationService
{
    Task<IEnumerable<Violation>> GetViolationsAsync(bool? isResolved = null, int? employeeId = null, DateTime? from = null, DateTime? to = null);
}
