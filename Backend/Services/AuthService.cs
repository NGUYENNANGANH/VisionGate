using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VisionGate.Data;
using VisionGate.Models;
using VisionGate.Services.Interfaces;

namespace VisionGate.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<(string Token, User User)?> LoginAsync(string username, string password)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == username && u.IsActive);

        if (user == null)
            return null;

        if (!VerifyPassword(password, user.PasswordHash))
            return null;

        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var token = GenerateJwtToken(user);
        return (token, user);
    }

    public async Task<User?> CreateUserAsync(string username, string password, string fullName, string email, UserRole role)
    {
        if (await _context.Users.AnyAsync(u => u.Username == username))
            return null;

        if (await _context.Users.AnyAsync(u => u.Email == email))
            return null;

        var user = new User
        {
            Username = username,
            PasswordHash = HashPassword(password),
            FullName = fullName,
            Email = email,
            Role = role,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return user;
    }

    public async Task<bool> ChangePasswordAsync(int userId, string oldPassword, string newPassword)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return false;

        if (!VerifyPassword(oldPassword, user.PasswordHash))
            return false;

        user.PasswordHash = HashPassword(newPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<User?> GetUserByIdAsync(int userId)
    {
        return await _context.Users.FindAsync(userId);
    }

    private string GenerateJwtToken(User user)
    {
        var key = _configuration["Jwt:Key"] ?? "VisionGate_SuperSecretKey_Min32Characters_ChangeInProduction";
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "VisionGate",
            audience: _configuration["Jwt:Audience"] ?? "VisionGateClients",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }

    private bool VerifyPassword(string password, string passwordHash)
    {
        return HashPassword(password) == passwordHash;
    }
}
