using System.ComponentModel.DataAnnotations;

namespace StudentApi.Models;

public class Student
{
	public int Id { get; set; }

	[Required]
	public string Name { get; set; } = string.Empty;

	[Range (16, 100)]
	public int Age { get; set; }
}
