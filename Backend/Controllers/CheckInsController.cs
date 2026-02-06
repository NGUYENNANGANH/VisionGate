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
        [FromQuery] int? employeeId = null,
        [FromQuery] CheckInStatus? status = null)
    {
        var checkIns = await _checkInService.GetCheckInsAsync(from, to, employeeId, status);
        return Ok(checkIns);
    }

    // GET: api/checkins/5
    [HttpGet("{id}")]
    public async Task<ActionResult<CheckInRecord>> GetCheckIn(int id)
    {
        var checkIn = await _checkInService.GetCheckInByIdAsync(id);

        if (checkIn == null)
            return NotFound();

        return checkIn;
    }

    // POST: api/checkins
    [HttpPost]
    public async Task<ActionResult<CheckInRecord>> CreateCheckIn(CheckInRecord checkIn)
    {
        try
        {
            var created = await _checkInService.CreateCheckInAsync(checkIn);
            return CreatedAtAction(nameof(GetCheckIn), new { id = created.CheckInId }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // GET: api/checkins/today
    [HttpGet("today")]
    public async Task<ActionResult<object>> GetTodayStats()
    {
        var stats = await _checkInService.GetTodayStatsAsync();
        return Ok(stats);
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
                Status = CheckInStatus.Success
            };

            // 2. Create PPEDetection
            var ppeDetection = new PPEDetection
            {
                EmployeeId = request.EmployeeId,
                DetectionTime = DateTimeHelper.VietnamNow(),
                ImageUrl = request.CheckInImageUrl,
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

            // 3. Link PPE to CheckIn
            checkIn.PPEDetectionId = ppeDetection.PPEDetectionId;
            checkIn.HasPPE = ppeDetection.OverallCompliance;

            var createdCheckIn = await _checkInService.CreateCheckInAsync(checkIn);
            Console.WriteLine($"✅ CheckIn created - Status: {createdCheckIn.Status} (HasPPE: {createdCheckIn.HasPPE})");
            // 4. Create Violations if needed
            var violationIds = new List<int>();
            var violations = new List<Violation>();

            if (!request.HasHelmet)
                violations.Add(CreateViolation(request.EmployeeId, createdCheckIn.CheckInId, 
                    ppeDetection.PPEDetectionId, ViolationType.MissingHelmet, Severity.Critical, 
                    "Thiếu mũ bảo hộ", request.CheckInImageUrl));

            if (!request.HasSafetyVest)
                violations.Add(CreateViolation(request.EmployeeId, createdCheckIn.CheckInId, 
                    ppeDetection.PPEDetectionId, ViolationType.MissingSafetyVest, Severity.High, 
                    "Thiếu áo phản quang", request.CheckInImageUrl));

            if (!request.HasGloves)
                violations.Add(CreateViolation(request.EmployeeId, createdCheckIn.CheckInId, 
                    ppeDetection.PPEDetectionId, ViolationType.MissingGloves, Severity.Medium, 
                    "Thiếu găng tay bảo hộ", request.CheckInImageUrl));

            if (!request.HasSafetyBoots)
                violations.Add(CreateViolation(request.EmployeeId, createdCheckIn.CheckInId, 
                    ppeDetection.PPEDetectionId, ViolationType.MissingSafetyBoots, Severity.Medium, 
                    "Thiếu giày bảo hộ", request.CheckInImageUrl));

            if (!request.HasMask)
                violations.Add(CreateViolation(request.EmployeeId, createdCheckIn.CheckInId, 
                    ppeDetection.PPEDetectionId, ViolationType.MissingMask, Severity.Low, 
                    "Thiếu khẩu trang", request.CheckInImageUrl));

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
                        v.Severity,
                        v.Description
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

    private Violation CreateViolation(int employeeId, int checkInId, int ppeDetectionId, 
        ViolationType type, Severity severity, string description, string? imageUrl)
    {
        return new Violation
        {
            EmployeeId = employeeId,
            CheckInId = checkInId,
            PPEDetectionId = ppeDetectionId,
            ViolationType = type,
            Severity = severity,
            Description = description,
            ImageUrl = imageUrl,
            IsResolved = false,
            NotificationSent = false,
            CreatedAt = DateTime.UtcNow
        };
    }
}
