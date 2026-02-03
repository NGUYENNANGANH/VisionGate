using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using VisionGate.Data;
using VisionGate.Hubs;
using VisionGate.Services;
using VisionGate.Services.Interfaces;
using VisionGate.Repositories;
using VisionGate.Repositories.Interfaces;


var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(option =>
{
    option.SwaggerDoc("v1", new OpenApiInfo { Title = "VisionGate API", Version = "v1" });

    // Cấu hình JWT Bearer cho Swagger
    option.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Vui lòng nhập Token (chỉ nhập token, KHÔNG cần 'Bearer' phía trước)",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "Bearer"
    });

    option.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[]{}
        }
    });
});

// Add DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register Repositories
builder.Services.AddScoped<IEmployeeRepository, EmployeeRepository>();
builder.Services.AddScoped<ICheckInRepository, CheckInRepository>();
builder.Services.AddScoped<IViolationRepository, ViolationRepository>();
builder.Services.AddScoped<IDepartmentRepository, DepartmentRepository>();
builder.Services.AddScoped<IDeviceRepository, DeviceRepository>();
builder.Services.AddScoped<IPPEDetectionRepository, PPEDetectionRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();

// Register Application Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmployeeService, EmployeeService>();
builder.Services.AddScoped<ICheckInService, CheckInService>();
builder.Services.AddScoped<IViolationService, ViolationService>();
builder.Services.AddScoped<IDepartmentService, DepartmentService>();
builder.Services.AddScoped<IDeviceService, DeviceService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<ISettingService, SettingService>();

// Add JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "VisionGate_SuperSecretKey_Min32Characters_ChangeInProduction"))
        };
    });

builder.Services.AddAuthorization();

// Add SignalR
builder.Services.AddSignalR();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173") // React/Vite ports
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); // Required for SignalR
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
      if (app.Environment.IsDevelopment())
      {
          app.UseSwagger();
          app.UseSwaggerUI();
      }


app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<VisionGateHub>("/hubs/visiongate");

app.Run();
