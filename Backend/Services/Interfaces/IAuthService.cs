using VisionGate.Models;

namespace VisionGate.Services.Interfaces;

public interface IAuthService
{
    Task<(string Token, User User)?> LoginAsync(string username, string password);
    Task<User?> CreateUserAsync(string username, string password, string fullName, string email, UserRole role);
    Task<bool> ChangePasswordAsync(int userId, string oldPassword, string newPassword);
    Task<User?> GetUserByIdAsync(int userId);
}
