using Microsoft.EntityFrameworkCore;
using VisionGate.Data;
using VisionGate.Models;
using VisionGate.Repositories.Interfaces;

namespace VisionGate.Repositories;

public class DeviceRepository : IDeviceRepository
{
    private readonly AppDbContext _context;

    public DeviceRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Device>> GetAllAsync()
    {
        return await _context.Devices
            .OrderBy(d => d.DeviceName)
            .ToListAsync();
    }

    public async Task<Device?> GetByIdAsync(int id)
    {
        return await _context.Devices.FindAsync(id);
    }

    public async Task<Device> AddAsync(Device device)
    {
        _context.Devices.Add(device);
        await _context.SaveChangesAsync();
        return device;
    }

    public async Task UpdateAsync(Device device)
    {
        _context.Entry(device).State = EntityState.Modified;
        await _context.SaveChangesAsync();
    }

    public async Task<bool> ExistsAsync(int id)
    {
        return await _context.Devices.AnyAsync(d => d.DeviceId == id);
    }

    public async Task<int> GetOnlineCountAsync()
    {
        return await _context.Devices.CountAsync(d => d.Status == DeviceStatus.Online);
    }
}
