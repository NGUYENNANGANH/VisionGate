using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VisionGate.Models;
using VisionGate.Services.Interfaces;
using VisionGate.Data;

namespace VisionGate.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{

    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
       
    }

    /// <summary>
    /// Đăng nhập cho Admin/Manager
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request.Username, request.Password);

        if (result == null)
            return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không đúng" });

        return Ok(new
        {
            token = result.Value.Token,
            user = new
            {
                result.Value.User.UserId,
                result.Value.User.Username,
                result.Value.User.FullName,
                result.Value.User.Email,
                result.Value.User.Role
            }
        });
    }

    /// <summary>
    /// Tạo user mới (chỉ superAdmin)
    /// </summary>
    [HttpPost("users")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        var user = await _authService.CreateUserAsync(
            request.Username,
            request.Password,
            request.FullName,
            request.Email,
            request.Role
        );

        if (user == null)
            return BadRequest(new { message = "Tên đăng nhập hoặc email đã tồn tại" });

        return Ok(new
        {
            user.UserId,
            user.Username,
            user.FullName,
            user.Email,
            user.Role,
            message = "Tạo user thành công"
        });
    }
        /// <summary>
    /// Lấy danh sách tất cả users (chỉ SuperAdmin)
    /// </summary>
   [HttpGet("users")]
[Authorize(Roles = "SuperAdmin")]
public async Task<IActionResult> GetAllUsers()
{
    var users = await _authService.GetAllUsersAsync();
    
    return Ok(users.Select(u => new
    {
        u.UserId,
        u.Username,
        u.FullName,
        u.Email,
        u.Role,
        u.IsActive,
        u.LastLoginAt,
        u.CreatedAt
    }));
}

    /// <summary>
    /// Đổi mật khẩu
    /// </summary>
    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
        
        var success = await _authService.ChangePasswordAsync(userId, request.OldPassword, request.NewPassword);

        if (!success)
            return BadRequest(new { message = "Mật khẩu cũ không đúng" });

        return Ok(new { message = "Đổi mật khẩu thành công" });
    }

    /// <summary>
    /// Lấy thông tin user đang đăng nhập
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");
        var user = await _authService.GetUserByIdAsync(userId);

        if (user == null)
            return NotFound();

        return Ok(new
        {
            user.UserId,
            user.Username,
            user.FullName,
            user.Email,
            user.Role,
            user.LastLoginAt
        });
    }
    
}

public record LoginRequest(string Username, string Password);
public record CreateUserRequest(string Username, string Password, string FullName, string Email, UserRole Role);
public record ChangePasswordRequest(string OldPassword, string NewPassword);
