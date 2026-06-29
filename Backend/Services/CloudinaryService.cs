using System.Security.Cryptography;
using System.Text;
using VisionGate.Services.Interfaces;

namespace VisionGate.Services;

public class CloudinaryService : ICloudinaryService
{
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<CloudinaryService> _logger;

    public CloudinaryService(
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        ILogger<CloudinaryService> logger)
    {
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<bool> DeleteImageAsync(string? publicId)
    {
        if (string.IsNullOrWhiteSpace(publicId))
            return false;

        var cloudName = _configuration["Cloudinary:CloudName"];
        var apiKey = _configuration["Cloudinary:ApiKey"];
        var apiSecret = _configuration["Cloudinary:ApiSecret"];

        if (string.IsNullOrWhiteSpace(cloudName) ||
            string.IsNullOrWhiteSpace(apiKey) ||
            string.IsNullOrWhiteSpace(apiSecret))
        {
            _logger.LogWarning("Cloudinary delete skipped because API credentials are not configured.");
            return false;
        }

        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var signature = CreateSignature(publicId, timestamp, apiSecret);

        var form = new Dictionary<string, string>
        {
            ["public_id"] = publicId,
            ["api_key"] = apiKey,
            ["timestamp"] = timestamp,
            ["signature"] = signature
        };

        try
        {
            var client = _httpClientFactory.CreateClient();
            var response = await client.PostAsync(
                $"https://api.cloudinary.com/v1_1/{cloudName}/image/destroy",
                new FormUrlEncodedContent(form));

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Cloudinary delete failed for {PublicId}. HTTP {StatusCode}", publicId, response.StatusCode);
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cloudinary delete failed for {PublicId}", publicId);
            return false;
        }
    }

    private static string CreateSignature(string publicId, string timestamp, string apiSecret)
    {
        var source = $"public_id={publicId}&timestamp={timestamp}{apiSecret}";
        var bytes = SHA1.HashData(Encoding.UTF8.GetBytes(source));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
