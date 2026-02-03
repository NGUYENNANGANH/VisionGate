using Microsoft.EntityFrameworkCore;
using VisionGate.Models;

namespace VisionGate.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Department> Departments { get; set; }
    public DbSet<Employee> Employees { get; set; }
    public DbSet<CheckInRecord> CheckInRecords { get; set; }
    public DbSet<PPEDetection> PPEDetections { get; set; }
    public DbSet<Violation> Violations { get; set; }
    public DbSet<Device> Devices { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<AttendanceReport> AttendanceReports { get; set; }
    public DbSet<Setting> Settings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Department
        modelBuilder.Entity<Department>(entity =>
        {
            entity.HasKey(e => e.DepartmentId);
            entity.Property(e => e.DepartmentName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.DepartmentCode).IsRequired().HasMaxLength(50);
            entity.HasIndex(e => e.DepartmentCode).IsUnique();
        });

        // Employee
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.EmployeeId);
            entity.Property(e => e.EmployeeCode).IsRequired().HasMaxLength(50);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Email).HasMaxLength(100);
            entity.Property(e => e.PhoneNumber).HasMaxLength(20);
            entity.Property(e => e.Position).HasMaxLength(100);
            entity.HasIndex(e => e.EmployeeCode).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
            
            entity.HasOne(e => e.Department)
                .WithMany(d => d.Employees)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);
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
            
            entity.HasOne(e => e.PPEDetection)
                .WithOne(p => p.CheckInRecord)
                .HasForeignKey<CheckInRecord>(e => e.PPEDetectionId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // PPEDetection
        modelBuilder.Entity<PPEDetection>(entity =>
        {
            entity.HasKey(e => e.PPEDetectionId);
            entity.Property(e => e.ConfidenceScore).HasPrecision(5, 2);
            entity.HasIndex(e => e.DetectionTime);
            
            entity.HasOne(e => e.Employee)
                .WithMany(emp => emp.PPEDetections)
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Violation
        modelBuilder.Entity<Violation>(entity =>
        {
            entity.HasKey(e => e.ViolationId);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(500);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.EmployeeId, e.IsResolved });
            
            entity.HasOne(e => e.Employee)
                .WithMany(emp => emp.Violations)
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
            
            entity.HasOne(e => e.CheckInRecord)
                .WithMany(c => c.Violations)
                .HasForeignKey(e => e.CheckInId)
                .OnDelete(DeleteBehavior.SetNull);
            
            entity.HasOne(e => e.PPEDetection)
                .WithMany(p => p.Violations)
                .HasForeignKey(e => e.PPEDetectionId)
                .OnDelete(DeleteBehavior.SetNull);
            
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

        // Notification
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.NotificationId);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Message).IsRequired().HasMaxLength(1000);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.EmployeeId, e.IsRead });
            
            entity.HasOne(e => e.Employee)
                .WithMany(emp => emp.Notifications)
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.SetNull);
            
            entity.HasOne(e => e.Violation)
                .WithMany(v => v.Notifications)
                .HasForeignKey(e => e.ViolationId)
                .OnDelete(DeleteBehavior.SetNull);
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

        // AttendanceReport
        modelBuilder.Entity<AttendanceReport>(entity =>
        {
            entity.HasKey(e => e.ReportId);
            entity.Property(e => e.TotalHours).HasPrecision(5, 2);
            entity.HasIndex(e => new { e.EmployeeId, e.Date }).IsUnique();
            
            entity.HasOne(e => e.Employee)
                .WithMany(emp => emp.AttendanceReports)
                .HasForeignKey(e => e.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Setting
        modelBuilder.Entity<Setting>(entity =>
        {
            entity.HasKey(e => e.SettingId);
            entity.Property(e => e.Key).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Value).IsRequired();
            entity.HasIndex(e => e.Key).IsUnique();
        });
    }
}
