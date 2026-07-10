using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using VisionGate.Data;
using VisionGate.DTOs;
using VisionGate.Helpers;
using VisionGate.Models;
using VisionGate.Services.Interfaces;

namespace VisionGate.Services;

public class ReportService : IReportService
{
    private const string HolidayCheckInStatus = "Ch\u1EA5m c\u00F4ng ng\u00E0y ngh\u1EC9";
    private readonly AppDbContext _context;

    public ReportService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<object> GetAttendanceReportAsync(AttendanceReportRequest request)
    {
        var query = _context.CheckInRecords
            .Include(c => c.Employee)
                .ThenInclude(e => e.ShiftConfig)
            .Where(c => c.Employee != null && c.Employee.IsActive && c.Status == CheckInStatus.Success)
            .AsQueryable();

        if (request.FromDate.HasValue)
            query = query.Where(c => c.CheckInTime >= request.FromDate.Value);

        if (request.ToDate.HasValue)
            query = query.Where(c => c.CheckInTime < request.ToDate.Value.AddDays(1));

        if (request.EmployeeId.HasValue)
            query = query.Where(c => c.EmployeeId == request.EmployeeId.Value);

        var checkIns = await query
            .OrderByDescending(c => c.CheckInTime)
            .ToListAsync();

        var holidayCalendar = await GetHolidayCalendarAsync(request.FromDate, request.ToDate);

        var grouped = checkIns
            .GroupBy(c => new { c.EmployeeId, Date = DateOnly.FromDateTime(c.CheckInTime) })
            .Select(g => 
            {
                var orderedScans = g.OrderBy(c => c.CheckInTime).ToList();
                var employee = orderedScans[0].Employee;
                var checkInRecord = orderedScans.FirstOrDefault(c => c.AttendanceEventType == AttendanceEventType.CheckIn);
                var checkOutRecord = orderedScans.LastOrDefault(c => c.AttendanceEventType == AttendanceEventType.CheckOut);
                TimeOnly? inTime = checkInRecord == null ? null : TimeOnly.FromDateTime(checkInRecord.CheckInTime);
                TimeOnly? outTime = checkOutRecord == null ? null : TimeOnly.FromDateTime(checkOutRecord.CheckInTime);
                var isHoliday = holidayCalendar.IsHoliday(g.Key.Date.ToDateTime(TimeOnly.MinValue));
                
                if (isHoliday)
                {
                    return new
                    {
                        EmployeeId = g.Key.EmployeeId,
                        EmployeeName = employee.FullName,
                        EmployeeCode = employee.EmployeeCode,
                        Date = g.Key.Date,
                        CheckInTime = inTime,
                        CheckOutTime = outTime,
                        LateMinutes = 0,
                        EarlyLeaveMinutes = 0,
                        TotalCheckIns = g.Count(),
                        Status = HolidayCheckInStatus
                    };
                }

                var shift = employee.ShiftConfig;
                var shiftStart = shift?.StartTime ?? new TimeOnly(8, 0);
                var shiftEnd = shift?.EndTime ?? new TimeOnly(17, 0);
                
                // Nếu quyét duy nhất 1 lần, hoặc lần quét sau cách lần quét đầu < 1 phút thì coi như quên Check-Out (giảm từ 5 phút xuống 1 phút để dễ test)
                bool isMissingCheckIn = !inTime.HasValue;
                bool isMissingCheckOut = !outTime.HasValue || (inTime.HasValue && (outTime.Value - inTime.Value).TotalMinutes < 1);

                int lateMins = inTime.HasValue && inTime.Value > shiftStart ? (int)(inTime.Value - shiftStart).TotalMinutes : 0;
                int earlyMins = 0;
                
                if (!isMissingCheckOut && outTime!.Value < shiftEnd)
                {
                    earlyMins = (int)(shiftEnd - outTime.Value).TotalMinutes;
                }

                return new
                {
                    EmployeeId = g.Key.EmployeeId,
                    EmployeeName = employee.FullName,
                    EmployeeCode = employee.EmployeeCode,
                    Date = g.Key.Date,
                    CheckInTime = inTime,
                    CheckOutTime = isMissingCheckOut ? null as TimeOnly? : outTime,
                    LateMinutes = lateMins,
                    EarlyLeaveMinutes = earlyMins,
                    TotalCheckIns = g.Count(),
                    Status = isMissingCheckIn ? "Thiếu Check-in" : (isMissingCheckOut ? "Thiếu Check-out" : (lateMins > 0 || earlyMins > 0 ? "Đi muộn/Về sớm" : "Đúng giờ"))
                };
            })
            .OrderByDescending(x => x.Date)
            .ThenBy(x => x.EmployeeName);

        return new
        {
            TotalRecords = grouped.Count(),
            FromDate = request.FromDate,
            ToDate = request.ToDate,
            Data = grouped
        };
    }

    public async Task<byte[]> ExportToExcelAsync(ExportExcelRequest request)
    {
        using var workbook = new XLWorkbook();

        if (request.ReportType?.ToLower() == "attendance")
        {
            await BuildAttendanceSheet(workbook, request);
        }
        else if (request.ReportType?.ToLower() == "violations")
        {
            await BuildViolationSheet(workbook, request);
        }
        else if (request.ReportType?.ToLower() == "access-logs")
        {
            await BuildAccessLogsSheet(workbook, request);
        }
        else if (request.ReportType?.ToLower() == "overview")
        {
            await BuildOverviewSheet(workbook, request);
        }
        else
        {
            throw new ArgumentException($"Loại báo cáo không hợp lệ: {request.ReportType}");
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private async Task<HolidayCalendarRule> GetHolidayCalendarAsync(DateTime? fromDate, DateTime? toDate)
    {
        var query = _context.Holidays.AsNoTracking().Where(h => h.IsActive);

        if (fromDate.HasValue)
            query = query.Where(h => h.Date >= fromDate.Value.Date);

        if (toDate.HasValue)
            query = query.Where(h => h.Date <= toDate.Value.Date);

        var dates = await query.Select(h => h.Date.Date).ToListAsync();
        var weeklyOffDays = await GetWeeklyOffDaysAsync();
        return new HolidayCalendarRule(dates.ToHashSet(), weeklyOffDays);
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

    private sealed record HolidayCalendarRule(HashSet<DateTime> Dates, HashSet<DayOfWeek> WeeklyOffDays)
    {
        public bool IsHoliday(DateTime date) => Dates.Contains(date.Date) || WeeklyOffDays.Contains(date.DayOfWeek);
    }

    private async Task BuildOverviewSheet(XLWorkbook workbook, ExportExcelRequest request)
    {
        var ws = workbook.Worksheets.Add("Tổng quan");
        
        var today = DateTimeHelper.VietnamNow().Date;
        var activeEmployees = await _context.Employees.Where(e => e.IsActive).CountAsync();
        var todayCheckIns = await _context.CheckInRecords
            .Where(c => c.Status == CheckInStatus.Success && c.AttendanceEventType == AttendanceEventType.CheckIn && c.CheckInTime >= today)
            .Select(c => c.EmployeeId).Distinct().CountAsync();
        var todayViolations = await _context.Violations
            .Where(v => v.CreatedAt >= today).CountAsync();
        var totalDevices = await _context.Devices.CountAsync();
        var onlineDevices = await _context.Devices.Where(d => d.IsActive).CountAsync();

        ws.Cell(1, 1).Value = "BÁO CÁO TỔNG QUAN AN NINH";
        ws.Range(1, 1, 1, 4).Merge();
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 16;
        ws.Cell(1, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        ws.Cell(3, 1).Value = "Ngày xuất báo cáo:";
        ws.Cell(3, 2).Value = DateTime.Now.ToString("dd/MM/yyyy HH:mm");

        ws.Cell(5, 1).Value = "1. Số liệu thống kê nhanh";
        ws.Cell(5, 1).Style.Font.Bold = true;

        var statsHeaders = new[] { "Chỉ số", "Giá trị" };
        ws.Cell(6, 1).Value = statsHeaders[0];
        ws.Cell(6, 2).Value = statsHeaders[1];
        StyleHeaderRow(ws, 6, 2);

        ws.Cell(7, 1).Value = "Nhân viên đang làm";
        ws.Cell(7, 2).Value = activeEmployees;
        ws.Cell(8, 1).Value = "Nhân viên đang có mặt (Hôm nay)";
        ws.Cell(8, 2).Value = todayCheckIns;
        ws.Cell(9, 1).Value = "Số vi phạm (Hôm nay)";
        ws.Cell(9, 2).Value = todayViolations;
        ws.Cell(10, 1).Value = "Thiết bị trực tuyến";
        ws.Cell(10, 2).Value = $"{onlineDevices} / {totalDevices}";

        ws.Range(7, 1, 10, 2).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        ws.Range(7, 1, 10, 2).Style.Border.InsideBorder = XLBorderStyleValues.Thin;

        ws.Cell(13, 1).Value = "2. Vi phạm gần đây (Hôm nay)";
        ws.Cell(13, 1).Style.Font.Bold = true;

        var headers = new[] { "STT", "Mã NV", "Họ tên", "Loại vi phạm", "Trạng thái", "Thời gian" };
        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cell(14, i + 1).Value = headers[i];
        }
        StyleHeaderRow(ws, 14, headers.Length);

        var recentViolations = await _context.Violations
            .Include(v => v.Employee)
            .Where(v => v.CreatedAt >= today)
            .OrderByDescending(v => v.CreatedAt)
            .Take(50)
            .ToListAsync();

        for (int i = 0; i < recentViolations.Count; i++)
        {
            var row = i + 15;
            var item = recentViolations[i];
            ws.Cell(row, 1).Value = i + 1;
            ws.Cell(row, 2).Value = item.Employee?.EmployeeCode ?? "N/A";
            ws.Cell(row, 3).Value = item.Employee?.FullName ?? "N/A";
            
            var violationTypeStr = item.ViolationType switch
            {
                VisionGate.Models.ViolationType.MissingHelmet => "Thiếu mũ",
                VisionGate.Models.ViolationType.MissingSafetyVest => "Thiếu áo",
                VisionGate.Models.ViolationType.MissingSafetyBoots => "Thiếu giày",
                VisionGate.Models.ViolationType.UnauthorizedAccess => "Người lạ",
                _ => "Khác"
            };
            ws.Cell(row, 4).Value = violationTypeStr;
            ws.Cell(row, 5).Value = item.IsResolved ? "Đã xử lý" : "Chưa xử lý";
            ws.Cell(row, 6).Value = item.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss");

            ws.Range(row, 1, row, headers.Length).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            ws.Range(row, 1, row, headers.Length).Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        }

        ws.Columns().AdjustToContents();
    }

    private async Task BuildAttendanceSheet(XLWorkbook workbook, ExportExcelRequest request)
    {
        var query = _context.CheckInRecords
            .Include(c => c.Employee)
                .ThenInclude(e => e.ShiftConfig)
            .Where(c => c.Employee != null && c.Employee.IsActive && c.Status == CheckInStatus.Success)
            .AsQueryable();

        if (request.FromDate.HasValue)
            query = query.Where(c => c.CheckInTime >= request.FromDate.Value);

        if (request.ToDate.HasValue)
            query = query.Where(c => c.CheckInTime < request.ToDate.Value.AddDays(1));

        if (request.EmployeeId.HasValue)
            query = query.Where(c => c.EmployeeId == request.EmployeeId.Value);

        var checkIns = await query
            .OrderByDescending(c => c.CheckInTime)
            .ToListAsync();

        var holidayCalendar = await GetHolidayCalendarAsync(request.FromDate, request.ToDate);

        var grouped = checkIns
            .GroupBy(c => new { c.EmployeeId, Date = DateOnly.FromDateTime(c.CheckInTime) })
            .Select(g =>
            {
                var orderedScans = g.OrderBy(c => c.CheckInTime).ToList();
                var employee = orderedScans[0].Employee;
                var checkInRecord = orderedScans.FirstOrDefault(c => c.AttendanceEventType == AttendanceEventType.CheckIn);
                var checkOutRecord = orderedScans.LastOrDefault(c => c.AttendanceEventType == AttendanceEventType.CheckOut);
                TimeOnly? inTime = checkInRecord == null ? null : TimeOnly.FromDateTime(checkInRecord.CheckInTime);
                TimeOnly? outTime = checkOutRecord == null ? null : TimeOnly.FromDateTime(checkOutRecord.CheckInTime);
                var isHoliday = holidayCalendar.IsHoliday(g.Key.Date.ToDateTime(TimeOnly.MinValue));
                
                if (isHoliday)
                {
                    return new
                    {
                        EmployeeCode = employee.EmployeeCode,
                        EmployeeName = employee.FullName,
                        Date = g.Key.Date,
                        CheckInTime = inTime,
                        CheckOutTime = outTime,
                        LateMinutes = 0,
                        EarlyLeaveMinutes = 0,
                        Status = HolidayCheckInStatus
                    };
                }

                var shift = employee.ShiftConfig;
                var shiftStart = shift?.StartTime ?? new TimeOnly(8, 0);
                var shiftEnd = shift?.EndTime ?? new TimeOnly(17, 0);

                bool isMissingCheckIn = !inTime.HasValue;
                bool isMissingCheckOut = !outTime.HasValue || (inTime.HasValue && (outTime.Value - inTime.Value).TotalMinutes < 1);

                int lateMins = inTime.HasValue && inTime.Value > shiftStart ? (int)(inTime.Value - shiftStart).TotalMinutes : 0;
                int earlyMins = 0;
                if (!isMissingCheckOut && outTime!.Value < shiftEnd)
                {
                    earlyMins = (int)(shiftEnd - outTime.Value).TotalMinutes;
                }

                return new
                {
                    EmployeeCode = employee.EmployeeCode,
                    EmployeeName = employee.FullName,
                    Date = g.Key.Date,
                    CheckInTime = inTime,
                    CheckOutTime = isMissingCheckOut ? null as TimeOnly? : outTime,
                    LateMinutes = lateMins,
                    EarlyLeaveMinutes = earlyMins,
                    Status = isMissingCheckIn ? "Thiếu Check-in" : (isMissingCheckOut ? "Thiếu Check-out" : (lateMins > 0 || earlyMins > 0 ? "Đi muộn/Về sớm" : "Đúng giờ"))
                };
            })
            .OrderByDescending(x => x.Date)
            .ThenBy(x => x.EmployeeName)
            .ToList();

        if (!string.IsNullOrEmpty(request.SearchText))
        {
            var search = request.SearchText.ToLower();
            grouped = grouped.Where(x => 
                (x.EmployeeName != null && x.EmployeeName.ToLower().Contains(search)) ||
                (x.EmployeeCode != null && x.EmployeeCode.ToLower().Contains(search))
            ).ToList();
        }

        var ws = workbook.Worksheets.Add("Báo cáo điểm danh");

        // Headers
        var headers = new[] { "STT", "Mã NV", "Họ tên", "Phòng ban", "Ngày", "Giờ vào", "Giờ ra", "Đi muộn (phút)", "Về sớm (phút)", "Trạng thái" };
        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cell(1, i + 1).Value = headers[i];
        }
        StyleHeaderRow(ws, 1, headers.Length);

        // Data rows
        for (int i = 0; i < grouped.Count; i++)
        {
            var row = i + 2;
            var item = grouped[i];
            ws.Cell(row, 1).Value = i + 1;
            ws.Cell(row, 2).Value = item.EmployeeCode;
            ws.Cell(row, 3).Value = item.EmployeeName;
            ws.Cell(row, 4).Value = "";
            ws.Cell(row, 5).Value = item.Date.ToString("dd/MM/yyyy");
            ws.Cell(row, 6).Value = item.CheckInTime?.ToString("HH:mm") ?? "";
            ws.Cell(row, 7).Value = item.CheckOutTime?.ToString("HH:mm") ?? "";
            ws.Cell(row, 8).Value = item.LateMinutes;
            ws.Cell(row, 9).Value = item.EarlyLeaveMinutes;
            ws.Cell(row, 10).Value = item.Status;

            // Thin borders for data rows
            ws.Range(row, 1, row, headers.Length).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            ws.Range(row, 1, row, headers.Length).Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        }

        ws.Columns().AdjustToContents();
    }

    private async Task BuildViolationSheet(XLWorkbook workbook, ExportExcelRequest request)
    {
        var query = _context.Violations
            .Include(v => v.Employee)
            .AsQueryable();

        if (request.FromDate.HasValue)
            query = query.Where(v => v.CreatedAt >= request.FromDate.Value);

        if (request.ToDate.HasValue)
            query = query.Where(v => v.CreatedAt < request.ToDate.Value.AddDays(1));

        var violations = await query
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => new
            {
                EmployeeCode = v.Employee != null ? v.Employee.EmployeeCode : "N/A",
                EmployeeName = v.Employee != null ? v.Employee.FullName : "N/A",
                v.ViolationType,
                v.Description,
                v.IsResolved,
                v.CreatedAt
            })
            .ToListAsync();

        var ws = workbook.Worksheets.Add("Báo cáo vi phạm");

        // Headers
        var headers = new[] { "STT", "Mã NV", "Họ tên", "Phòng ban", "Loại vi phạm", "Mức độ", "Mô tả", "Đã xử lý", "Ngày tạo" };
        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cell(1, i + 1).Value = headers[i];
        }
        StyleHeaderRow(ws, 1, headers.Length);

        // Data rows
        for (int i = 0; i < violations.Count; i++)
        {
            var row = i + 2;
            var item = violations[i];
            ws.Cell(row, 2).Value = item.EmployeeCode;
            ws.Cell(row, 3).Value = item.EmployeeName;
            ws.Cell(row, 4).Value = "";
            ws.Cell(row, 5).Value = item.ViolationType == VisionGate.Models.ViolationType.Other ? "VI PH\u1EA0M PPE" : item.ViolationType.ToString();
            ws.Cell(row, 6).Value = "N/A";
            ws.Cell(row, 7).Value = item.Description ?? "";
            ws.Cell(row, 8).Value = item.IsResolved ? "Da xu ly" : "Chua xu ly";
            ws.Cell(row, 9).Value = item.CreatedAt.ToString("dd/MM/yyyy HH:mm");

            // Thin borders for data rows
            ws.Range(row, 1, row, headers.Length).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            ws.Range(row, 1, row, headers.Length).Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        }

        ws.Columns().AdjustToContents();
    }

    private async Task BuildAccessLogsSheet(XLWorkbook workbook, ExportExcelRequest request)
    {
        var checkInsQuery = _context.CheckInRecords
            .Include(c => c.Employee)
            .Include(c => c.Device)
            .AsQueryable();

        var violationsQuery = _context.Violations
            .Include(v => v.Employee)
            .Include(v => v.PPEDetection)
                .ThenInclude(p => p.CheckInRecord)
            .Where(v => !v.IsResolved)
            .AsQueryable();

        if (request.FromDate.HasValue)
        {
            checkInsQuery = checkInsQuery.Where(c => c.CheckInTime >= request.FromDate.Value);
            // violations on the frontend for access logs aren't filtered by date, but let's filter if requested
            violationsQuery = violationsQuery.Where(v => v.CreatedAt >= request.FromDate.Value);
        }

        if (request.ToDate.HasValue)
        {
            var endDate = request.ToDate.Value.AddDays(1);
            checkInsQuery = checkInsQuery.Where(c => c.CheckInTime < endDate);
            violationsQuery = violationsQuery.Where(v => v.CreatedAt < endDate);
        }

        var checkIns = await checkInsQuery.ToListAsync();
        var violations = await violationsQuery.ToListAsync();

        var logs = new List<AccessLogExportDto>();

        foreach (var item in checkIns)
        {
            logs.Add(new AccessLogExportDto {
                Time = item.CheckInTime,
                EmployeeName = item.Employee?.FullName ?? "Khách lạ",
                EmployeeCode = item.Employee?.EmployeeCode ?? "",
                Location = item.Device?.Location ?? "Thiết bị đã xóa",
                Status = item.Status == CheckInStatus.RejectedPPE ? "VI PH\u1EA0M PPE" : (item.AttendanceEventType == AttendanceEventType.CheckOut ? "DIEM DANH RA" : "DIEM DANH VAO")
            });
        }

        foreach (var item in violations.Where(v => v.PPEDetection?.CheckInRecord?.Status != CheckInStatus.RejectedPPE))
        {
            var isStranger = item.ViolationType == VisionGate.Models.ViolationType.UnauthorizedAccess;
            logs.Add(new AccessLogExportDto {
                Time = item.CreatedAt,
                EmployeeName = isStranger ? "Khách lạ" : (item.Employee?.FullName ?? "N/A"),
                EmployeeCode = isStranger ? "" : (item.Employee?.EmployeeCode ?? "N/A"),
                Location = "Không xác định", // Violations don't store location directly in this version
                Status = isStranger ? "KH\u00C1CH L\u1EA0" : "VI PH\u1EA0M PPE"
            });
        }

        if (!string.IsNullOrEmpty(request.SearchText))
        {
            var search = request.SearchText.ToLower();
            logs = logs.Where(l => 
                (l.EmployeeName != null && l.EmployeeName.ToLower().Contains(search)) ||
                (l.EmployeeCode != null && l.EmployeeCode.ToLower().Contains(search)) ||
                (l.Location != null && l.Location.ToLower().Contains(search))
            ).ToList();
        }

        if (!string.IsNullOrEmpty(request.Status))
        {
            logs = logs.Where(l => l.Status == request.Status).ToList();
        }

        var sortedLogs = logs.OrderByDescending(l => l.Time).ToList();

        var ws = workbook.Worksheets.Add("Lịch sử và Vi phạm");

        // Headers
        var headers = new[] { "STT", "Thời gian", "Mã NV", "Họ tên", "Vị trí", "Trạng thái" };
        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cell(1, i + 1).Value = headers[i];
        }
        StyleHeaderRow(ws, 1, headers.Length);

        // Data rows
        for (int i = 0; i < sortedLogs.Count; i++)
        {
            var row = i + 2;
            var item = sortedLogs[i];
            ws.Cell(row, 1).Value = i + 1;
            ws.Cell(row, 2).Value = item.Time.ToString("dd/MM/yyyy HH:mm:ss");
            ws.Cell(row, 3).Value = item.EmployeeCode;
            ws.Cell(row, 4).Value = item.EmployeeName;
            ws.Cell(row, 5).Value = item.Location;
            ws.Cell(row, 6).Value = item.Status;

            ws.Range(row, 1, row, headers.Length).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            ws.Range(row, 1, row, headers.Length).Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        }

        ws.Columns().AdjustToContents();
    }

    private class AccessLogExportDto
    {
        public DateTime Time { get; set; }
        public string EmployeeName { get; set; }
        public string EmployeeCode { get; set; }
        public string Location { get; set; }
        public string Status { get; set; }
    }

    private static void StyleHeaderRow(IXLWorksheet ws, int row, int colCount)
    {
        var headerRange = ws.Range(row, 1, row, colCount);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#4472C4");
        headerRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        headerRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
    }

    public async Task<bool> DeleteAttendanceAsync(int employeeId, DateOnly date)
    {
        var startOfDay = date.ToDateTime(TimeOnly.MinValue);
        var endOfDay = date.ToDateTime(TimeOnly.MaxValue);

        var records = await _context.CheckInRecords
            .Where(c => c.EmployeeId == employeeId && c.Status == CheckInStatus.Success && c.CheckInTime >= startOfDay && c.CheckInTime <= endOfDay)
            .ToListAsync();

        if (!records.Any()) return false;

        _context.CheckInRecords.RemoveRange(records);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<object> UpdateAttendanceAsync(UpdateAttendanceRequest request)
    {
        var startOfDay = request.Date.ToDateTime(TimeOnly.MinValue);
        var endOfDay = request.Date.ToDateTime(TimeOnly.MaxValue);

        var records = await _context.CheckInRecords
            .Where(c => c.EmployeeId == request.EmployeeId && c.Status == CheckInStatus.Success && c.CheckInTime >= startOfDay && c.CheckInTime <= endOfDay)
            .OrderBy(c => c.CheckInTime)
            .ToListAsync();

        if (request.CheckInTime == null && request.CheckOutTime == null)
        {
            if (records.Any())
            {
                _context.CheckInRecords.RemoveRange(records);
                await _context.SaveChangesAsync();
            }
            return new { success = true, action = "deleted" };
        }

        CheckInRecord? firstRecord = records.FirstOrDefault(r => r.AttendanceEventType == AttendanceEventType.CheckIn);
        CheckInRecord? lastRecord = records.LastOrDefault(r => r.AttendanceEventType == AttendanceEventType.CheckOut);

        if (request.CheckInTime.HasValue)
        {
            var newInTime = request.Date.ToDateTime(TimeOnly.FromTimeSpan(request.CheckInTime.Value));
            if (firstRecord == null)
            {
                firstRecord = new CheckInRecord 
                { 
                    EmployeeId = request.EmployeeId, 
                    CheckInTime = newInTime,
                    FaceConfidence = 100,
                    Status = CheckInStatus.Success,
                    AttendanceEventType = AttendanceEventType.CheckIn,
                };
                _context.CheckInRecords.Add(firstRecord);
            }
            else
            {
                firstRecord.CheckInTime = newInTime;
                firstRecord.AttendanceEventType = AttendanceEventType.CheckIn;
            }
        }

        if (request.CheckOutTime.HasValue)
        {
            var newOutTime = request.Date.ToDateTime(TimeOnly.FromTimeSpan(request.CheckOutTime.Value));
            if (lastRecord == null)
            {
                lastRecord = new CheckInRecord 
                { 
                    EmployeeId = request.EmployeeId, 
                    CheckInTime = newOutTime,
                    FaceConfidence = 100,
                    Status = CheckInStatus.Success,
                    AttendanceEventType = AttendanceEventType.CheckOut,
                };
                _context.CheckInRecords.Add(lastRecord);
            }
            else
            {
                lastRecord.CheckInTime = newOutTime;
                lastRecord.AttendanceEventType = AttendanceEventType.CheckOut;
            }
        }
        else if (lastRecord != null)
        {
            // if checkout time is null but we have a last record, delete the last record
            _context.CheckInRecords.Remove(lastRecord);
        }

        await _context.SaveChangesAsync();
        return new { success = true, action = "updated" };
    }
}
