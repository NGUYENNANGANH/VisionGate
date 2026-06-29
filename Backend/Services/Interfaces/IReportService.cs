using VisionGate.DTOs;

namespace VisionGate.Services.Interfaces;

public interface IReportService
{
    Task<object> GetAttendanceReportAsync(AttendanceReportRequest request);
    Task<byte[]> ExportToExcelAsync(ExportExcelRequest request);
    Task<bool> DeleteAttendanceAsync(int employeeId, DateOnly date);
    Task<object> UpdateAttendanceAsync(UpdateAttendanceRequest request);
}
