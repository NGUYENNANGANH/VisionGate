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
        NormalizeDevice(device);
        await EnsureDeviceCodeIsUniqueAsync(device.DeviceCode, null);

        device.CreatedAt = DateTime.UtcNow;
        return await _deviceRepository.AddAsync(device);
    }

    public async Task<bool> UpdateDeviceAsync(int id, Device device)
    {
        if (id != device.DeviceId)
            return false;

        if (!await _deviceRepository.ExistsAsync(id))
            return false;

        NormalizeDevice(device);
        await EnsureDeviceCodeIsUniqueAsync(device.DeviceCode, id);

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

    private static void NormalizeDevice(Device device)
    {
        device.DeviceCode = (device.DeviceCode ?? string.Empty).Trim();
        device.DeviceName = (device.DeviceName ?? string.Empty).Trim();
        device.Location = (device.Location ?? string.Empty).Trim();
        device.IpAddress = string.IsNullOrWhiteSpace(device.IpAddress) ? null : device.IpAddress.Trim();
        device.RtspUsername = string.IsNullOrWhiteSpace(device.RtspUsername) ? null : device.RtspUsername.Trim();
        device.RtspPassword = string.IsNullOrWhiteSpace(device.RtspPassword) ? null : device.RtspPassword;
    }

    private async Task EnsureDeviceCodeIsUniqueAsync(string deviceCode, int? currentDeviceId)
    {
        if (string.IsNullOrWhiteSpace(deviceCode))
            throw new InvalidOperationException("Ma thiet bi khong duoc de trong.");

        var devices = await _deviceRepository.GetAllAsync();
        var exists = devices.Any(d =>
            (!currentDeviceId.HasValue || d.DeviceId != currentDeviceId.Value) &&
            string.Equals(d.DeviceCode.Trim(), deviceCode, StringComparison.OrdinalIgnoreCase));

        if (exists)
            throw new InvalidOperationException("Ma thiet bi da ton tai.");
    }
}