using VisionGate.DTOs;

namespace VisionGate.Services.Interfaces;

public interface IReportService
{
    Task<object> GetAttendanceReportAsync(AttendanceReportRequest request);
    Task<object> GetViolationReportAsync(ViolationReportRequest request);
    Task<byte[]> ExportToExcelAsync(ExportExcelRequest request);
    Task<object> GetEmployeeHistoryAsync(int employeeId, DateTime? from, DateTime? to);
}
