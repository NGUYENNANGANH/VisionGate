using VisionGate.Models;

namespace VisionGate.Repositories.Interfaces;

public interface IDeviceRepository
{
    Task<IEnumerable<Device>> GetAllAsync();
    Task<Device?> GetByIdAsync(int id);
    Task<Device> AddAsync(Device device);
    Task UpdateAsync(Device device);
    Task<bool> ExistsAsync(int id);
    Task<int> GetOnlineCountAsync();
}
