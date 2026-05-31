using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using VisionGate.Data;
using VisionGate.DTOs;
using VisionGate.Models;
using VisionGate.Services.Interfaces;

namespace VisionGate.Services;

public class ReportService : IReportService
{
    private readonly AppDbContext _context;

    public ReportService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<object> GetAttendanceReportAsync(AttendanceReportRequest request)
    {
        var query = _context.CheckInRecords
            .Include(c => c.Employee)
            .ThenInclude(e => e.Department)
            .AsQueryable();

        if (request.FromDate.HasValue)
            query = query.Where(c => c.CheckInTime >= request.FromDate.Value);

        if (request.ToDate.HasValue)
            query = query.Where(c => c.CheckInTime < request.ToDate.Value.AddDays(1));

        if (request.EmployeeId.HasValue)
            query = query.Where(c => c.EmployeeId == request.EmployeeId.Value);

        if (request.DepartmentId.HasValue)
            query = query.Where(c => c.Employee.DepartmentId == request.DepartmentId.Value);

        // Dữ liệu cài đặt ca làm mặc định
        var startTimeStr = await _context.Settings.Where(s => s.Key == "Shift:StartTime").Select(s => s.Value).FirstOrDefaultAsync() ?? "08:00";
        var endTimeStr = await _context.Settings.Where(s => s.Key == "Shift:EndTime").Select(s => s.Value).FirstOrDefaultAsync() ?? "17:00";
        
        if (!TimeOnly.TryParse(startTimeStr, out var shiftStart)) shiftStart = new TimeOnly(8, 0);
        if (!TimeOnly.TryParse(endTimeStr, out var shiftEnd)) shiftEnd = new TimeOnly(17, 0);

        var checkIns = await query
            .OrderByDescending(c => c.CheckInTime)
            .ToListAsync();

        var grouped = checkIns
            .GroupBy(c => new { c.EmployeeId, Date = DateOnly.FromDateTime(c.CheckInTime) })
            .Select(g => 
            {
                var inTime = g.Min(c => TimeOnly.FromDateTime(c.CheckInTime));
                var outTime = g.Max(c => TimeOnly.FromDateTime(c.CheckInTime));
                
                // Nếu quyét duy nhất 1 lần, hoặc lần quét sau cách lần quét đầu < 1 phút thì coi như quên Check-Out (giảm từ 5 phút xuống 1 phút để dễ test)
                bool isMissingCheckOut = g.Count() == 1 || (outTime - inTime).TotalMinutes < 1; 

                int lateMins = inTime > shiftStart ? (int)(inTime - shiftStart).TotalMinutes : 0;
                int earlyMins = 0;
                
                if (!isMissingCheckOut && outTime < shiftEnd)
                {
                    earlyMins = (int)(shiftEnd - outTime).TotalMinutes;
                }

                return new
                {
                    EmployeeId = g.Key.EmployeeId,
                    EmployeeName = g.First().Employee.FullName,
                    EmployeeCode = g.First().Employee.EmployeeCode,
                    Department = g.First().Employee.Department?.DepartmentName,
                    Date = g.Key.Date,
                    CheckInTime = inTime,
                    CheckOutTime = isMissingCheckOut ? null as TimeOnly? : outTime,
                    LateMinutes = lateMins,
                    EarlyLeaveMinutes = earlyMins,
                    TotalCheckIns = g.Count(),
                    HasViolations = g.Any(c => c.Violations.Any()),
                    Status = isMissingCheckOut ? "Thiếu Check-out" : (lateMins > 0 || earlyMins > 0 ? "Đi muộn/Về sớm" : "Đúng giờ")
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

    public async Task<object> GetViolationReportAsync(ViolationReportRequest request)
    {
        var query = _context.Violations
            .Include(v => v.Employee)
            .ThenInclude(e => e.Department)
            .Include(v => v.CheckInRecord)
            .Include(v => v.PPEDetection)
            .AsQueryable();

        if (request.FromDate.HasValue)
            query = query.Where(v => v.CreatedAt >= request.FromDate.Value);

        if (request.ToDate.HasValue)
            query = query.Where(v => v.CreatedAt < request.ToDate.Value.AddDays(1));

        if (request.EmployeeId.HasValue)
            query = query.Where(v => v.EmployeeId == request.EmployeeId.Value);

        if (request.DepartmentId.HasValue)
            query = query.Where(v => v.Employee.DepartmentId == request.DepartmentId.Value);

        if (request.Severity.HasValue)
            query = query.Where(v => (int)v.Severity == request.Severity.Value);

        if (request.IsResolved.HasValue)
            query = query.Where(v => v.IsResolved == request.IsResolved.Value);

        var violations = await query
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => new
            {
                v.ViolationId,
                v.EmployeeId,
                EmployeeName = v.Employee.FullName,
                EmployeeCode = v.Employee.EmployeeCode,
                Department = v.Employee.Department != null ? v.Employee.Department.DepartmentName : null,
                v.ViolationType,
                v.Severity,
                v.Description,
                v.ImageUrl,
                v.IsResolved,
                v.ResolvedAt,
                v.NotificationSent,
                v.CreatedAt
            })
            .ToListAsync();

        var summary = new
        {
            Total = violations.Count,
            Resolved = violations.Count(v => v.IsResolved),
            Pending = violations.Count(v => !v.IsResolved),
            Critical = violations.Count(v => v.Severity == Severity.Critical),
            High = violations.Count(v => v.Severity == Severity.High),
            Medium = violations.Count(v => v.Severity == Severity.Medium),
            Low = violations.Count(v => v.Severity == Severity.Low)
        };

        return new
        {
            Summary = summary,
            FromDate = request.FromDate,
            ToDate = request.ToDate,
            Data = violations
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
        else
        {
            throw new ArgumentException($"Loại báo cáo không hợp lệ: {request.ReportType}");
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private async Task BuildAttendanceSheet(XLWorkbook workbook, ExportExcelRequest request)
    {
        var query = _context.CheckInRecords
            .Include(c => c.Employee)
            .ThenInclude(e => e.Department)
            .AsQueryable();

        if (request.FromDate.HasValue)
            query = query.Where(c => c.CheckInTime >= request.FromDate.Value);

        if (request.ToDate.HasValue)
            query = query.Where(c => c.CheckInTime < request.ToDate.Value.AddDays(1));

        if (request.EmployeeId.HasValue)
            query = query.Where(c => c.EmployeeId == request.EmployeeId.Value);

        if (request.DepartmentId.HasValue)
            query = query.Where(c => c.Employee.DepartmentId == request.DepartmentId.Value);

        // Dữ liệu cài đặt ca làm mặc định
        var startTimeStr = await _context.Settings.Where(s => s.Key == "Shift:StartTime").Select(s => s.Value).FirstOrDefaultAsync() ?? "08:00";
        var endTimeStr = await _context.Settings.Where(s => s.Key == "Shift:EndTime").Select(s => s.Value).FirstOrDefaultAsync() ?? "17:00";

        if (!TimeOnly.TryParse(startTimeStr, out var shiftStart)) shiftStart = new TimeOnly(8, 0);
        if (!TimeOnly.TryParse(endTimeStr, out var shiftEnd)) shiftEnd = new TimeOnly(17, 0);

        var checkIns = await query
            .OrderByDescending(c => c.CheckInTime)
            .ToListAsync();

        var grouped = checkIns
            .GroupBy(c => new { c.EmployeeId, Date = DateOnly.FromDateTime(c.CheckInTime) })
            .Select(g =>
            {
                var inTime = g.Min(c => TimeOnly.FromDateTime(c.CheckInTime));
                var outTime = g.Max(c => TimeOnly.FromDateTime(c.CheckInTime));
                bool isMissingCheckOut = g.Count() == 1 || (outTime - inTime).TotalMinutes < 1;

                int lateMins = inTime > shiftStart ? (int)(inTime - shiftStart).TotalMinutes : 0;
                int earlyMins = 0;
                if (!isMissingCheckOut && outTime < shiftEnd)
                {
                    earlyMins = (int)(shiftEnd - outTime).TotalMinutes;
                }

                return new
                {
                    EmployeeCode = g.First().Employee.EmployeeCode,
                    EmployeeName = g.First().Employee.FullName,
                    Department = g.First().Employee.Department?.DepartmentName,
                    Date = g.Key.Date,
                    CheckInTime = inTime,
                    CheckOutTime = isMissingCheckOut ? null as TimeOnly? : outTime,
                    LateMinutes = lateMins,
                    EarlyLeaveMinutes = earlyMins,
                    Status = isMissingCheckOut ? "Thiếu Check-out" : (lateMins > 0 || earlyMins > 0 ? "Đi muộn/Về sớm" : "Đúng giờ")
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
                (x.EmployeeCode != null && x.EmployeeCode.ToLower().Contains(search)) ||
                (x.Department != null && x.Department.ToLower().Contains(search))
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
            ws.Cell(row, 4).Value = item.Department ?? "";
            ws.Cell(row, 5).Value = item.Date.ToString("dd/MM/yyyy");
            ws.Cell(row, 6).Value = item.CheckInTime.ToString("HH:mm");
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
            .ThenInclude(e => e.Department)
            .AsQueryable();

        if (request.FromDate.HasValue)
            query = query.Where(v => v.CreatedAt >= request.FromDate.Value);

        if (request.ToDate.HasValue)
            query = query.Where(v => v.CreatedAt < request.ToDate.Value.AddDays(1));

        if (request.EmployeeId.HasValue)
            query = query.Where(v => v.EmployeeId == request.EmployeeId.Value);

        if (request.DepartmentId.HasValue)
            query = query.Where(v => v.Employee.DepartmentId == request.DepartmentId.Value);

        var violations = await query
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => new
            {
                EmployeeCode = v.Employee.EmployeeCode,
                EmployeeName = v.Employee.FullName,
                Department = v.Employee.Department != null ? v.Employee.Department.DepartmentName : "",
                v.ViolationType,
                v.Severity,
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
            ws.Cell(row, 1).Value = i + 1;
            ws.Cell(row, 2).Value = item.EmployeeCode;
            ws.Cell(row, 3).Value = item.EmployeeName;
            ws.Cell(row, 4).Value = item.Department;
            ws.Cell(row, 5).Value = item.ViolationType.ToString();
            ws.Cell(row, 6).Value = item.Severity.ToString();
            ws.Cell(row, 7).Value = item.Description;
            ws.Cell(row, 8).Value = item.IsResolved ? "Đã xử lý" : "Chưa xử lý";
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
            .Include(v => v.CheckInRecord)
                .ThenInclude(c => c.Device)
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
            var statusStr = item.Status == CheckInStatus.Success || (int)item.Status == 0 ? "ĐIỂM DANH" : (item.Status == CheckInStatus.Warning || (int)item.Status == 2 ? "CẢNH BÁO" : "THẤT BẠI");
            logs.Add(new AccessLogExportDto {
                Time = item.CheckInTime,
                EmployeeName = item.Employee?.FullName ?? "Khách lạ",
                EmployeeCode = item.Employee?.EmployeeCode ?? "",
                Location = item.Device?.Location ?? "Unknown",
                Status = statusStr
            });
        }

        foreach (var item in violations)
        {
            var statusStr = (int)item.ViolationType == 5 ? "TRÁI PHÉP" : "VI PHẠM";
            logs.Add(new AccessLogExportDto {
                Time = item.CreatedAt,
                EmployeeName = item.Employee?.FullName ?? "Khách lạ",
                EmployeeCode = item.Employee?.EmployeeCode ?? "",
                Location = item.CheckInRecord?.Device?.Location ?? "Unknown",
                Status = statusStr
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

    public async Task<object> GetEmployeeHistoryAsync(int employeeId, DateTime? from, DateTime? to)
    {
        var employee = await _context.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

        if (employee == null)
            throw new KeyNotFoundException($"Employee with ID {employeeId} not found");

        var checkInsQuery = _context.CheckInRecords
            .Where(c => c.EmployeeId == employeeId);

        var violationsQuery = _context.Violations
            .Where(v => v.EmployeeId == employeeId);

        if (from.HasValue)
        {
            checkInsQuery = checkInsQuery.Where(c => c.CheckInTime >= from.Value);
            violationsQuery = violationsQuery.Where(v => v.CreatedAt >= from.Value);
        }

        if (to.HasValue)
        {
            checkInsQuery = checkInsQuery.Where(c => c.CheckInTime <= to.Value);
            violationsQuery = violationsQuery.Where(v => v.CreatedAt <= to.Value);
        }

        var checkIns = await checkInsQuery
            .OrderByDescending(c => c.CheckInTime)
            .Take(100)
            .ToListAsync();

        var violations = await violationsQuery
            .OrderByDescending(v => v.CreatedAt)
            .Take(50)
            .ToListAsync();

        return new
        {
            Employee = new
            {
                employee.EmployeeId,
                employee.EmployeeCode,
                employee.FullName,
                employee.Email,
                employee.Position,
                Department = employee.Department?.DepartmentName,
                employee.IsActive
            },
            CheckInHistory = new
            {
                Total = checkIns.Count,
                Data = checkIns
            },
            ViolationHistory = new
            {
                Total = violations.Count,
                Data = violations
            },
            FromDate = from,
            ToDate = to
        };
    }

    public async Task<bool> DeleteAttendanceAsync(int employeeId, DateOnly date)
    {
        var startOfDay = date.ToDateTime(TimeOnly.MinValue);
        var endOfDay = date.ToDateTime(TimeOnly.MaxValue);

        var records = await _context.CheckInRecords
            .Where(c => c.EmployeeId == employeeId && c.CheckInTime >= startOfDay && c.CheckInTime <= endOfDay)
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
            .Where(c => c.EmployeeId == request.EmployeeId && c.CheckInTime >= startOfDay && c.CheckInTime <= endOfDay)
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

        CheckInRecord firstRecord = records.FirstOrDefault();
        CheckInRecord lastRecord = records.Count > 1 ? records.LastOrDefault() : null;

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
                    Status = CheckInStatus.Success
                };
                _context.CheckInRecords.Add(firstRecord);
            }
            else
            {
                firstRecord.CheckInTime = newInTime;
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
                    Status = CheckInStatus.Success
                };
                _context.CheckInRecords.Add(lastRecord);
            }
            else
            {
                lastRecord.CheckInTime = newOutTime;
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
