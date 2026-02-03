using Microsoft.EntityFrameworkCore;
using VisionGate.Data;
using VisionGate.Models;
using VisionGate.Repositories.Interfaces;

namespace VisionGate.Repositories;

public class PPEDetectionRepository : IPPEDetectionRepository
{
    private readonly AppDbContext _context;

    public PPEDetectionRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PPEDetection?> GetByIdAsync(int id)
    {
        return await _context.PPEDetections
            .Include(p => p.Employee)
            .Include(p => p.CheckInRecord)
            .FirstOrDefaultAsync(p => p.PPEDetectionId == id);
    }

    public async Task<PPEDetection> AddAsync(PPEDetection detection)
    {
        _context.PPEDetections.Add(detection);
        await _context.SaveChangesAsync();
        return detection;
    }

    public async Task UpdateAsync(PPEDetection detection)
    {
        _context.Entry(detection).State = EntityState.Modified;
        await _context.SaveChangesAsync();
    }
}
