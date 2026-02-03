using VisionGate.Models;

namespace VisionGate.Repositories.Interfaces;

public interface IPPEDetectionRepository
{
    Task<PPEDetection?> GetByIdAsync(int id);
    Task<PPEDetection> AddAsync(PPEDetection detection);
    Task UpdateAsync(PPEDetection detection);
}
