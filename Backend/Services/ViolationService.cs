using VisionGate.Models;
using VisionGate.Services.Interfaces;
using VisionGate.Repositories.Interfaces;

namespace VisionGate.Services;

public class ViolationService : IViolationService
{
    private readonly IViolationRepository _violationRepository;

    public ViolationService(IViolationRepository violationRepository)
    {
        _violationRepository = violationRepository;
    }

    public async Task<IEnumerable<Violation>> GetViolationsAsync(
        bool? isResolved = null,
        int? employeeId = null,
        DateTime? from = null,
        DateTime? to = null)
    {
        return await _violationRepository.GetAllAsync(isResolved, employeeId, from, to);
    }
}
