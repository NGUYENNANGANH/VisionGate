namespace VisionGate.Services.Interfaces;

public interface ICloudinaryService
{
    Task<bool> DeleteImageAsync(string? publicId);
}
