namespace VisionGate.DTOs;

public class EmployeeFaceDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string FaceImageUrl { get; set; } = string.Empty;
    public string? CloudinaryPublicId { get; set; }
    public bool IsPrimary { get; set; }
    public string Angle { get; set; } = "Front";
    public DateTime CreatedAt { get; set; }
}

public class CreateEmployeeFaceRequest
{
    public string FaceImageUrl { get; set; } = string.Empty;
    public string? CloudinaryPublicId { get; set; }
    public bool IsPrimary { get; set; }
    public string Angle { get; set; } = "Front";
}

public class RegisteredFaceDto
{
    public int FaceId { get; set; }
    public int EmployeeId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public byte[] FaceEmbedding { get; set; } = Array.Empty<byte>();
}
