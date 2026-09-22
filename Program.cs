using Microsoft.EntityFrameworkCore;
using StudentApi.Data;
using StudentApi.Models;
using Microsoft.OpenApi; 
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Enter your JWT token."
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = []
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                Console.WriteLine($"Authentication failed: {context.Exception.Message}");
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                Console.WriteLine("Token validated successfully");
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                Console.WriteLine($"Challenge: {context.Error}, {context.ErrorDescription}");
                return Task.CompletedTask;
            }
        };

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = builder.Configuration ["Jwt:Issuer"],
            ValidAudience = builder.Configuration ["Jwt:Audience"],

            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)
            )
        };
    });

    builder.Services.AddAuthorization();

builder.Services.AddDbContext<StudentDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

app.UseCors("ReactPolicy");

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}



app.UseAuthentication();
app.UseAuthorization();

app.MapPost("/register", async (StudentDbContext db, RegisterRequest request) =>
{
    var existingUser = await db.Users
        .FirstOrDefaultAsync(user => user.Username == request.Username);

    if (existingUser != null)
    {
        return Results.BadRequest("Username already exists.");
    }

    var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

    var user = new User
    {
        Username = request.Username,
        PasswordHash = passwordHash
    };

    db.Users.Add(user);

    await db.SaveChangesAsync();

    return Results.Ok("User registered successfully.");
});

app.MapPost("/login", async (StudentDbContext db, LoginRequest request) =>
{
    var user = await db.Users.FirstOrDefaultAsync(user => user.Username == request.Username);

    if (user == null)
    {
        return Results.Unauthorized();
    }

    var passwordMatches = BCrypt.Net.BCrypt.Verify(
        request.Password,
        user.PasswordHash
    );

    if (!passwordMatches)
    {
        return Results.Unauthorized();
    }

    var claims = new[]
{
    new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
    new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
    new Claim(ClaimTypes.Role, user.Role)
};

var key = new SymmetricSecurityKey(
    Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)
);

var credentials = new SigningCredentials(
    key,
    SecurityAlgorithms.HmacSha256
);

var token = new JwtSecurityToken(
    issuer: builder.Configuration["Jwt:Issuer"],
    audience: builder.Configuration["Jwt:Audience"],
    claims: claims,
    expires: DateTime.UtcNow.AddHours(1),
    signingCredentials: credentials
);

var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

return Results.Ok(new { token = tokenString }); 
});

app.MapGet("/students", async (StudentDbContext db) =>
{
    return await db.Students.ToListAsync();
})
.RequireAuthorization();

app.MapGet("/students/{id}", async (StudentDbContext db, int id) =>
{
    var student = await db.Students.FindAsync(id);

    if (student == null)
    {
        return Results.NotFound("Student not found");
    }

    return Results.Ok(student);
});

app.MapPost("/students", async (StudentDbContext db, Student student) =>
{
    var validationContext = new ValidationContext(student);
    var validationResults = new List<ValidationResult>();

    bool isValid = Validator.TryValidateObject(
        student,
        validationContext,
        validationResults,
        true
    );
    
    if (!isValid)
    {
        return Results.BadRequest(validationResults);
    }

    db.Students.Add(student);

    await db.SaveChangesAsync();

    return Results.Created($"/students/{student.Id}", student);
});

app.MapPut("/students/{id}", async (StudentDbContext db, int id, Student updatedStudent) =>
{
    var validationContext = new ValidationContext(updatedStudent);
    var validationResults = new List<ValidationResult>();

    bool isValid = Validator.TryValidateObject(
        updatedStudent,
        validationContext,
        validationResults,
        true
    );

    if (!isValid)
    {
        return Results.BadRequest(validationResults);
    }

    var student = await db.Students.FindAsync(id);

    if (student == null)
    {
        return Results.NotFound("Student not found");
    }

    student.Name = updatedStudent.Name;
    student.Age = updatedStudent.Age;

    await db.SaveChangesAsync();

    return Results.Ok(student);
});

app.MapDelete("/students/{id}", async (StudentDbContext db, int id) =>
{
    var student = await db.Students.FindAsync(id);

    if (student == null)
    {
        return Results.NotFound("Student not found");
    }

    db.Students.Remove(student);

    await db.SaveChangesAsync();

    return Results.NoContent();
})
.RequireAuthorization(policy => policy.RequireRole("Admin"));
app.Run();
