using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VisionGate.DTOs;
using VisionGate.Services.Interfaces;

namespace VisionGate.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    // GET: api/reports/attendance
    [HttpGet("attendance")]
    public async Task<ActionResult<object>> GetAttendanceReport([FromQuery] AttendanceReportRequest request)
    {
        var report = await _reportService.GetAttendanceReportAsync(request);
        return Ok(report);
    }

    // GET: api/reports/violations
    [HttpGet("violations")]
    public async Task<ActionResult<object>> GetViolationReport([FromQuery] ViolationReportRequest request)
    {
        var report = await _reportService.GetViolationReportAsync(request);
        return Ok(report);
    }

    // GET: api/reports/employee/5/history
    [HttpGet("employee/{id}/history")]
    public async Task<ActionResult<object>> GetEmployeeHistory(
        int id,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        try
        {
            var history = await _reportService.GetEmployeeHistoryAsync(id, from, to);
            return Ok(history);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // POST: api/reports/export-excel
    [HttpPost("export-excel")]
    public async Task<ActionResult> ExportExcel([FromBody] ExportExcelRequest request)
    {
        try
        {
            var excelData = await _reportService.ExportToExcelAsync(request);
            return File(excelData, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
                $"Report_{request.ReportType}_{DateTime.Now:yyyyMMdd}.xlsx");
        }
        catch (NotImplementedException ex)
        {
            return StatusCode(501, new { message = ex.Message });
        }
    }

    // PUT: api/reports/attendance
    [HttpPut("attendance")]
    public async Task<ActionResult<object>> UpdateAttendance([FromBody] UpdateAttendanceRequest request)
    {
        try
        {
            var result = await _reportService.UpdateAttendanceAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            // For production, you might want to log this
            return StatusCode(500, new { message = "Lỗi khi cập nhật điểm danh: " + ex.Message });
        }
    }

    // DELETE: api/reports/attendance
    [HttpDelete("attendance")]
    public async Task<ActionResult> DeleteAttendance([FromQuery] int employeeId, [FromQuery] DateOnly date)
    {
        try
        {
            var deleted = await _reportService.DeleteAttendanceAsync(employeeId, date);
            if (!deleted)
                return NotFound(new { message = "Không tìm thấy dữ liệu điểm danh để xóa." });
                
            return Ok(new { message = "Đã xóa điểm danh thành công." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Lỗi khi xóa điểm danh: " + ex.Message });
        }
    }
}
