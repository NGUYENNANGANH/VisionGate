using VisionGate.Models;

namespace VisionGate.Services.Interfaces;

public interface IDeviceService
{
    Task<IEnumerable<Device>> GetAllDevicesAsync();
    Task<Device?> GetDeviceByIdAsync(int id);
    Task<Device> CreateDeviceAsync(Device device);
    Task<bool> UpdateDeviceAsync(int id, Device device);
    Task<bool> UpdateHeartbeatAsync(int id);
    Task<bool> DeviceExistsAsync(int id);
}
