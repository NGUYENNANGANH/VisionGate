using VisionGate.Models;

namespace VisionGate.Services.Interfaces;

public interface ISettingService
{
    Task<IEnumerable<Setting>> GetAllSettingsAsync();
    Task<Setting?> GetSettingByKeyAsync(string key);
    Task<T?> GetSettingValueAsync<T>(string key);
    Task<Setting> UpdateSettingAsync(string key, string value);
    Task<Setting> CreateSettingAsync(Setting setting);
}
