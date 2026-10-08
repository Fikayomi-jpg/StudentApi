using Microsoft.EntityFrameworkCore;
using StudentApi.Models;

namespace StudentApi.Data
{
	public class StudentDbContext : DbContext
	{
		public StudentDbContext(DbContextOptions<StudentDbContext> options) : base(options)
		{
		}

		public DbSet<Student> Students { get; set; }
		public DbSet<User> Users { get; set; }
	}
}