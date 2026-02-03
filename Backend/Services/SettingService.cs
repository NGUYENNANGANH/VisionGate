using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using VisionGate.Data;
using VisionGate.Models;
using VisionGate.Services.Interfaces;

namespace VisionGate.Services;

public class SettingService : ISettingService
{
    private readonly AppDbContext _context;

    public SettingService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Setting>> GetAllSettingsAsync()
    {
        return await _context.Settings.ToListAsync();
    }

    public async Task<Setting?> GetSettingByKeyAsync(string key)
    {
        return await _context.Settings.FirstOrDefaultAsync(s => s.Key == key);
    }

    public async Task<T?> GetSettingValueAsync<T>(string key)
    {
        var setting = await GetSettingByKeyAsync(key);
        if (setting == null)
            return default;

        try
        {
            return setting.DataType switch
            {
                SettingDataType.Integer => (T)(object)int.Parse(setting.Value),
                SettingDataType.Boolean => (T)(object)bool.Parse(setting.Value),
                SettingDataType.JSON => JsonSerializer.Deserialize<T>(setting.Value),
                _ => (T)(object)setting.Value
            };
        }
        catch
        {
            return default;
        }
    }

    public async Task<Setting> UpdateSettingAsync(string key, string value)
    {
        var setting = await GetSettingByKeyAsync(key);
        
        if (setting == null)
            throw new KeyNotFoundException($"Setting with key '{key}' not found");

        setting.Value = value;
        setting.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return setting;
    }

    public async Task<Setting> CreateSettingAsync(Setting setting)
    {
        var existing = await GetSettingByKeyAsync(setting.Key);
        if (existing != null)
            throw new InvalidOperationException($"Setting with key '{setting.Key}' already exists");

        setting.UpdatedAt = DateTime.UtcNow;
        _context.Settings.Add(setting);
        await _context.SaveChangesAsync();
        
        return setting;
    }
}
