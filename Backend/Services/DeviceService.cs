using VisionGate.Models;
using VisionGate.Services.Interfaces;
using VisionGate.Repositories.Interfaces;

namespace VisionGate.Services;

public class DeviceService : IDeviceService
{
    private readonly IDeviceRepository _deviceRepository;

    public DeviceService(IDeviceRepository deviceRepository)
    {
        _deviceRepository = deviceRepository;
    }

    public async Task<IEnumerable<Device>> GetAllDevicesAsync()
    {
        return await _deviceRepository.GetAllAsync();
    }

    public async Task<Device?> GetDeviceByIdAsync(int id)
    {
        return await _deviceRepository.GetByIdAsync(id);
    }

    public async Task<Device> CreateDeviceAsync(Device device)
    {
        device.CreatedAt = DateTime.UtcNow;
        device.IsActive = true;

        return await _deviceRepository.AddAsync(device);
    }

    public async Task<bool> UpdateDeviceAsync(int id, Device device)
    {
        if (id != device.DeviceId)
            return false;

        if (!await _deviceRepository.ExistsAsync(id))
            return false;

        
        await _deviceRepository.UpdateAsync(device);
        return true;
    }

    public async Task<bool> DeleteDeviceAsync(int id)
    {
        var device = await _deviceRepository.GetByIdAsync(id);
        if (device == null)
            return false;

        await _deviceRepository.DeleteAsync(device);
        return true;
    }

    public async Task<bool> DeviceExistsAsync(int id)
    {
        return await _deviceRepository.ExistsAsync(id);
    }
}
