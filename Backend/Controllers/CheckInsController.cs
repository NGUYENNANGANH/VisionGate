using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using VisionGate.Data;
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
    private const string HolidayCheckInMessage = "Ghi nh\u1EADn v\u00E0o c\u1ED5ng ng\u00E0y ngh\u1EC9";
    private readonly ICheckInService _checkInService;
    private readonly IPPEDetectionRepository _ppeDetectionRepository;
    private readonly IViolationRepository _violationRepository;
    private readonly IHubContext<VisionGateHub> _hubContext;
    private readonly AppDbContext _context;

    public CheckInsController(
        ICheckInService checkInService,
        IPPEDetectionRepository ppeDetectionRepository,
        IViolationRepository violationRepository,
        IHubContext<VisionGateHub> hubContext,
        AppDbContext context)
    {
        _checkInService = checkInService;
        _ppeDetectionRepository = ppeDetectionRepository;
        _violationRepository = violationRepository;
        _hubContext = hubContext;
        _context = context;
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
            var hasFullPpe = request.HasHelmet && request.HasGloves && request.HasSafetyVest && request.HasSafetyBoots && request.HasMask;

            // 1. Create CheckInRecord
            var checkIn = new CheckInRecord
            {
                EmployeeId = request.EmployeeId,
                DeviceId = request.DeviceId,
                CheckInImageUrl = request.CheckInImageUrl,
                FaceConfidence = request.FaceConfidence,
                CheckInTime = DateTimeHelper.VietnamNow(),
                Status = hasFullPpe ? CheckInStatus.Success : CheckInStatus.RejectedPPE,
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
                OverallCompliance = hasFullPpe
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
            var checkInDate = createdCheckIn.CheckInTime.Date;
            var weeklyOffDays = await GetWeeklyOffDaysAsync();
            var isSpecialHoliday = await _context.Holidays
                .AsNoTracking()
                .AnyAsync(h => h.IsActive && h.Date == checkInDate);
            var isHolidayCheckIn = isSpecialHoliday || weeklyOffDays.Contains(checkInDate.DayOfWeek);

            var response = new AIProcessResponse
            {
                CheckInId = createdCheckIn.CheckInId,
                PPEDetectionId = ppeDetection.PPEDetectionId,
                HasPPE = ppeDetection.OverallCompliance,
                HasViolations = violations.Any(),
                ViolationIds = violationIds,
                Message = isHolidayCheckIn
                    ? (violations.Any()
                        ? $"{HolidayCheckInMessage}, bi tu choi diem danh do phat hien {violations.Count} vi pham PPE"
                        : $"{HolidayCheckInMessage}, \u0111\u1EA7y \u0111\u1EE7 \u0111\u1ED3 b\u1EA3o h\u1ED9")
                    : (violations.Any()
                        ? $"Khong diem danh thanh cong do phat hien {violations.Count} vi pham PPE"
                        : "Check-in th\u00E0nh c\u00F4ng, \u0111\u1EA7y \u0111\u1EE7 \u0111\u1ED3 b\u1EA3o h\u1ED9")
            };

            // 6. Send realtime notification to all connected clients
            await _hubContext.Clients.All.SendAsync("ReceiveNewCheckIn", new
            {
                checkInId = createdCheckIn.CheckInId,
                employeeId = request.EmployeeId,
                checkInTime = createdCheckIn.CheckInTime,
                hasPPE = ppeDetection.OverallCompliance,
                hasViolations = violations.Any(),
                violationCount = violations.Count,
                isHoliday = isHolidayCheckIn,
                status = createdCheckIn.Status.ToString()
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

    private async Task<HashSet<DayOfWeek>> GetWeeklyOffDaysAsync()
    {
        var setting = await _context.HolidaySettings.AsNoTracking().FirstOrDefaultAsync(s => s.HolidaySettingId == 1);
        var weeklyDays = setting?.WeeklyOffDays ?? "Saturday,Sunday";

        return weeklyDays
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(day => Enum.TryParse<DayOfWeek>(day, true, out var parsedDay) ? parsedDay : (DayOfWeek?)null)
            .Where(day => day.HasValue)
            .Select(day => day!.Value)
            .ToHashSet();
    }

    private Violation CreateViolation(int employeeId, int ppeDetectionId, ViolationType type)
    {
        return new Violation
        {
            EmployeeId = employeeId,
            PPEDetectionId = ppeDetectionId,
            ViolationType = type,
            IsResolved = false,
            CreatedAt = DateTimeHelper.VietnamNow()
        };
    }
}
