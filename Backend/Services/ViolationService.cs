using VisionGate.Models;
using VisionGate.Services.Interfaces;
using VisionGate.Repositories.Interfaces;

namespace VisionGate.Services;

public class ViolationService : IViolationService
{
    private readonly IViolationRepository _violationRepository;
    private readonly INotificationService _notificationService;

    public ViolationService(IViolationRepository violationRepository, INotificationService notificationService)
    {
        _violationRepository = violationRepository;
        _notificationService = notificationService;
    }

    public async Task<IEnumerable<Violation>> GetViolationsAsync(
        bool? isResolved = null,
        int? employeeId = null,
        Severity? severity = null,
        DateTime? from = null,
        DateTime? to = null)
    {
        return await _violationRepository.GetAllAsync(isResolved, employeeId, severity, from, to);
    }

    public async Task<Violation?> GetViolationByIdAsync(int id)
    {
        return await _violationRepository.GetByIdAsync(id);
    }

    public async Task<Violation> CreateViolationAsync(Violation violation)
    {
        violation.CreatedAt = DateTime.UtcNow;
        violation.IsResolved = false;

        var created = await _violationRepository.AddAsync(violation);

        // Send notification if severity is high or critical
        if (violation.Severity >= Severity.High)
        {
            await _notificationService.CreateNotificationAsync(
                NotificationType.Violation,
                $"Violation: {violation.ViolationType}",
                violation.Description,
                violation.EmployeeId,
                violation.ViolationId,
                Priority.High);
        }

        return created;
    }

    public async Task<Violation> CreateViolationFromPPEDetectionAsync(PPEDetection ppeDetection, int employeeId, int? checkInId)
    {
        var violationType = DetermineViolationType(ppeDetection);
        var description = GenerateViolationDescription(ppeDetection);
        var severity = DetermineSeverity(ppeDetection);

        var violation = new Violation
        {
            EmployeeId = employeeId,
            CheckInId = checkInId,
            PPEDetectionId = ppeDetection.PPEDetectionId,
            ViolationType = violationType,
            Severity = severity,
            Description = description,
            ImageUrl = ppeDetection.ImageUrl,
            CreatedAt = DateTime.UtcNow
        };

        return await CreateViolationAsync(violation);
    }

    public async Task<bool> ResolveViolationAsync(int id, int resolvedBy)
    {
        var violation = await _violationRepository.GetByIdAsync(id);
        if (violation == null)
            return false;

        violation.IsResolved = true;
        violation.ResolvedAt = DateTime.UtcNow;
        violation.ResolvedBy = resolvedBy;

        await _violationRepository.UpdateAsync(violation);
        return true;
    }

    public async Task<object> GetViolationStatsAsync(DateTime? from = null, DateTime? to = null)
    {
        var total = await _violationRepository.GetTotalCountAsync(from, to);
        var resolved = await _violationRepository.GetResolvedCountAsync(from, to);
        var byType = await _violationRepository.GetCountByTypeAsync(from, to);
        var bySeverity = await _violationRepository.GetCountBySeverityAsync(from, to);

        return new
        {
            Total = total,
            Resolved = resolved,
            Pending = total - resolved,
            ByType = byType.Select(x => new { Type = x.Key, Count = x.Value }),
            BySeverity = bySeverity.Select(x => new { Severity = x.Key, Count = x.Value })
        };
    }

    private ViolationType DetermineViolationType(PPEDetection detection)
    {
        if (!detection.HasHelmet) return ViolationType.MissingHelmet;
        if (!detection.HasSafetyVest) return ViolationType.MissingSafetyVest;
        if (!detection.HasGloves) return ViolationType.MissingGloves;
        if (!detection.HasMask) return ViolationType.MissingMask;
        if (!detection.HasSafetyBoots) return ViolationType.MissingSafetyBoots;
        
        return ViolationType.Other;
    }

    private string GenerateViolationDescription(PPEDetection detection)
    {
        var missing = new List<string>();
        
        if (!detection.HasHelmet) missing.Add("Helmet");
        if (!detection.HasSafetyVest) missing.Add("Safety Vest");
        if (!detection.HasGloves) missing.Add("Gloves");
        if (!detection.HasMask) missing.Add("Mask");
        if (!detection.HasSafetyBoots) missing.Add("Safety Boots");

        return $"Missing PPE: {string.Join(", ", missing)}. Confidence: {detection.ConfidenceScore:P2}";
    }

    private Severity DetermineSeverity(PPEDetection detection)
    {
        var missingCount = new[] 
        { 
            detection.HasHelmet, 
            detection.HasSafetyVest, 
            detection.HasGloves, 
            detection.HasMask, 
            detection.HasSafetyBoots 
        }.Count(x => !x);

        // Helmet is critical
        if (!detection.HasHelmet) return Severity.Critical;
        
        if (missingCount >= 3) return Severity.High;
        if (missingCount == 2) return Severity.Medium;
        
        return Severity.Low;
    }
}
