using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using VisionGate.DTOs;
using VisionGate.Hubs;
using VisionGate.Models;
using VisionGate.Repositories.Interfaces;
using VisionGate.Services.Interfaces;
using VisionGate.Helpers;

namespace VisionGate.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CheckInsController : ControllerBase
{
    private readonly ICheckInService _checkInService;
    private readonly IPPEDetectionRepository _ppeDetectionRepository;
    private readonly IViolationRepository _violationRepository;
    private readonly IHubContext<VisionGateHub> _hubContext;

    public CheckInsController(
        ICheckInService checkInService,
        IPPEDetectionRepository ppeDetectionRepository,
        IViolationRepository violationRepository,
        IHubContext<VisionGateHub> hubContext)
    {
        _checkInService = checkInService;
        _ppeDetectionRepository = ppeDetectionRepository;
        _violationRepository = violationRepository;
        _hubContext = hubContext;
    }

    // GET: api/checkins
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CheckInRecord>>> GetCheckIns(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int? employeeId = null)
    {
        var checkIns = await _checkInService.GetCheckInsAsync(from, to, employeeId);
        return Ok(checkIns);
    }

    // POST: api/checkins/ai-process
    [HttpPost("ai-process")]
    public async Task<ActionResult<AIProcessResponse>> ProcessAICheckIn([FromBody] AIProcessRequest request)
    {
        try
        {
         
            // 1. Create CheckInRecord
            var checkIn = new CheckInRecord
            {
                EmployeeId = request.EmployeeId,
                DeviceId = request.DeviceId,
                CheckInImageUrl = request.CheckInImageUrl,
                FaceConfidence = request.FaceConfidence,
                CheckInTime = DateTimeHelper.VietnamNow(),
                            };

            var createdCheckIn = await _checkInService.CreateCheckInAsync(checkIn);

            // 2. Create PPEDetection linked to CheckIn
            var ppeDetection = new PPEDetection
            {
                CheckInId = createdCheckIn.CheckInId,
                HasHelmet = request.HasHelmet,
                HasGloves = request.HasGloves,
                HasSafetyVest = request.HasSafetyVest,
                HasSafetyBoots = request.HasSafetyBoots,
                HasMask = request.HasMask,
                ConfidenceScore = request.PPEConfidenceScore,
                DetectionData = request.DetectionData,
                OverallCompliance = request.HasHelmet && request.HasGloves && 
                                   request.HasSafetyVest && request.HasSafetyBoots && request.HasMask
            };

            await _ppeDetectionRepository.AddAsync(ppeDetection);
            // 4. Create Violations if needed
            var violationIds = new List<int>();
            var violations = new List<Violation>();

            if (!request.HasHelmet)
                violations.Add(CreateViolation(request.EmployeeId, ppeDetection.PPEDetectionId, ViolationType.MissingHelmet));

            if (!request.HasSafetyVest)
                violations.Add(CreateViolation(request.EmployeeId, ppeDetection.PPEDetectionId, ViolationType.MissingSafetyVest));

            if (!request.HasGloves)
                violations.Add(CreateViolation(request.EmployeeId, ppeDetection.PPEDetectionId, ViolationType.MissingGloves));

            if (!request.HasSafetyBoots)
                violations.Add(CreateViolation(request.EmployeeId, ppeDetection.PPEDetectionId, ViolationType.MissingSafetyBoots));

            if (!request.HasMask)
                violations.Add(CreateViolation(request.EmployeeId, ppeDetection.PPEDetectionId, ViolationType.MissingMask));

            foreach (var violation in violations)
            {
                await _violationRepository.AddAsync(violation);
                violationIds.Add(violation.ViolationId);
            }

            // 5. Return response
            var response = new AIProcessResponse
            {
                CheckInId = createdCheckIn.CheckInId,
                PPEDetectionId = ppeDetection.PPEDetectionId,
                HasPPE = ppeDetection.OverallCompliance,
                HasViolations = violations.Any(),
                ViolationIds = violationIds,
                Message = violations.Any() 
                    ? $"Check-in thành công nhưng phát hiện {violations.Count} vi phạm PPE" 
                    : "Check-in thành công, đầy đủ đồ bảo hộ"
            };

            // 6. Send realtime notification to all connected clients
            await _hubContext.Clients.All.SendAsync("ReceiveNewCheckIn", new
            {
                checkInId = createdCheckIn.CheckInId,
                employeeId = request.EmployeeId,
                checkInTime = createdCheckIn.CheckInTime,
                hasPPE = ppeDetection.OverallCompliance,
                hasViolations = violations.Any(),
                violationCount = violations.Count
            });

            // Send violation notification if any
            if (violations.Any())
            {
                await _hubContext.Clients.All.SendAsync("ReceiveNewViolation", new
                {
                    employeeId = request.EmployeeId,
                    violationCount = violations.Count,
                    violations = violations.Select(v => new
                    {
                        v.ViolationId,
                        v.ViolationType,
                    })
                });
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private Violation CreateViolation(int employeeId, int ppeDetectionId, ViolationType type)
    {
        return new Violation
        {
            EmployeeId = employeeId,
            PPEDetectionId = ppeDetectionId,
            ViolationType = type,
            IsResolved = false,
            CreatedAt = DateTime.UtcNow
        };
    }
}
