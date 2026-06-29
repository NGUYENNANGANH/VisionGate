using Microsoft.EntityFrameworkCore;
using VisionGate.Models;

namespace VisionGate.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Employee> Employees { get; set; }
    public DbSet<CheckInRecord> CheckInRecords { get; set; }
    public DbSet<PPEDetection> PPEDetections { get; set; }
    public DbSet<Violation> Violations { get; set; }
    public DbSet<Device> Devices { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<ShiftConfig> ShiftConfigs { get; set; }
    public DbSet<EmployeeFace> EmployeeFaces { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Employee
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.EmployeeId);
            entity.Property(e => e.EmployeeCode).IsRequired().HasMaxLength(50);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Email).HasMaxLength(100);
            entity.Property(e => e.PhoneNumber).HasMaxLength(20);
            entity.HasIndex(e => e.EmployeeCode).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();

            entity.HasOne(e => e.ShiftConfig)
                .WithMany(s => s.Employees)
                .HasForeignKey(e => e.ShiftId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // EmployeeFace
        modelBuilder.Entity<EmployeeFace>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FaceImageUrl).IsRequired();
            entity.Property(e => e.CloudinaryPublicId).HasMaxLength(255);
            entity.Property(e => e.FaceEmbedding).IsRequired();
            entity.HasIndex(e => e.EmployeeId);

            entity.HasOne(e => e.Employee)
                .WithMany(emp => emp.EmployeeFaces)
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // CheckInRecord
        modelBuilder.Entity<CheckInRecord>(entity =>
        {
            entity.HasKey(e => e.CheckInId);
            entity.Property(e => e.FaceConfidence).HasPrecision(5, 2);
            entity.HasIndex(e => e.CheckInTime);
            entity.HasIndex(e => new { e.EmployeeId, e.CheckInTime });
            
            entity.HasOne(e => e.Employee)
                .WithMany(emp => emp.CheckInRecords)
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
            
            entity.HasOne(e => e.Device)
                .WithMany(d => d.CheckInRecords)
                .HasForeignKey(e => e.DeviceId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // PPEDetection
        modelBuilder.Entity<PPEDetection>(entity =>
        {
            entity.HasKey(e => e.PPEDetectionId);
            entity.Property(e => e.ConfidenceScore).HasPrecision(5, 2);
            
            entity.HasOne(e => e.CheckInRecord)
                .WithOne(c => c.PPEDetection)
                .HasForeignKey<PPEDetection>(e => e.CheckInId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Violation
        modelBuilder.Entity<Violation>(entity =>
        {
            entity.HasKey(e => e.ViolationId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.IsResolved);
            
            entity.HasOne(e => e.PPEDetection)
                .WithMany(p => p.Violations)
                .HasForeignKey(e => e.PPEDetectionId)
                .OnDelete(DeleteBehavior.SetNull);
                
            entity.HasOne(e => e.Employee)
                .WithMany(emp => emp.Violations)
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasOne(e => e.ResolvedByUser)
                .WithMany(u => u.ResolvedViolations)
                .HasForeignKey(e => e.ResolvedBy)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Device
        modelBuilder.Entity<Device>(entity =>
        {
            entity.HasKey(e => e.DeviceId);
            entity.Property(e => e.DeviceName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.DeviceCode).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Location).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => e.DeviceCode).IsUnique();
        });

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
        });

        // ShiftConfig
        modelBuilder.Entity<ShiftConfig>(entity =>
        {
            entity.HasKey(e => e.ShiftId);
            entity.Property(e => e.ShiftName).IsRequired().HasMaxLength(100);
            
            // Seed data mặc định
            entity.HasData(new ShiftConfig
            {
                ShiftId = 1,
                ShiftName = "Ca Hành Chính",
                StartTime = new TimeOnly(8, 0),
                EndTime = new TimeOnly(17, 0),
                Description = "Ca làm việc mặc định",
                IsActive = true
            });
        });
    }
}
