namespace VisionGate.Models;

public class EmployeeFace
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string FaceImageUrl { get; set; } = string.Empty;
    public string? CloudinaryPublicId { get; set; }
    public byte[] FaceEmbedding { get; set; } = Array.Empty<byte>();
    public bool IsPrimary { get; set; }
    public string Angle { get; set; } = "Front";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Employee? Employee { get; set; }
}
