import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [students, setStudents] = useState([]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const [editingStudent, setEditingStudent] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");

  const [error, setError] = useState("");

  const normalizeStudent = (s) => ({
    id: s.id ?? s.Id,
    name: s.name ?? s.Name,
    age: s.age ?? s.Age,
  });

 const fetchStudents = async () => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    const response = await fetch("http://localhost:5034/students", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      const normalized = data.map(normalizeStudent);

      setStudents(normalized);
      setError("");
    } else {
      const text = await response.text();
      setError(`Failed to load students (${response.status}): ${text}` );
    }
  } catch (error) {
    console.error("Error fetching students:", error);
    setError(`Network error while fetching students: ${error.message}`);
  }
};

const handleLogin = async (e) => {
  e.preventDefault();

  const loginData = {
    username: username,
    password: password
  };

  try {
    const response = await fetch("http://localhost:5034/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(loginData)
    });

    if (response.ok) {
      const data = await response.json();

      localStorage.setItem("token", data.token);

      const payload = JSON.parse(atob(data.token.split(".")[1]));
      const userRole =
        payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

      setRole(userRole);

      fetchStudents();

      alert("Login successful!");
    } else {
      alert("Invalid username or password.");
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("Something went wrong.");
  }
};

  const handleLogout = () => {
    localStorage.removeItem("token");
    setStudents([]);
    setRole("");
    alert("Logged out successfully!");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      fetchStudents();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    const student = {
      name: name,
      age: Number(age)
    };

    try {
      const response = await fetch("http://localhost:5034/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(student)
      });

      if (response.ok) {
        alert("Student added successfully!");
        setName("");
        setAge("");
        fetchStudents();
      } else {
        alert("Failed to add student.");
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    const updatedStudent = {
      name: editName,
      age: Number(editAge)
    };

    try {
      const response = await fetch(
        `http://localhost:5034/students/${editingStudent}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(updatedStudent)
        }
      );

      if (response.ok) {
        alert("Student updated successfully!");

        setEditingStudent(null);
        setEditName("");
        setEditAge("");

        fetchStudents();
      } else {
        alert("Failed to update student.");
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("Something went wrong.");
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `http://localhost:5034/students/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        alert("Student deleted successfully!");
        fetchStudents();
      } else if (response.status === 403) {
        alert("You do not have permission to delete students.");
      } else {
        alert("Failed to delete student.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Something went wrong.");
    }
  };

  const handleRegister = async (e) => {
  e.preventDefault();

  const registerData = {
    username: username,
    password: password
  };

  try {
    const response = await fetch("http://localhost:5034/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(registerData)
    });

    if (response.ok) {
      alert("Registration successful! You can now log in.");
      setUsername("");
      setPassword("");
      setIsRegistering(false);
    } else {
      const message = await response.text();
      alert("Registration failed. Username may already exist.");
    }
  } catch (error) {
    console.error("Registration error:", error);
    alert("Something went wrong.");
  }
};

  return (
  <div className="app">
    <div className="header">
      <h1>Student Management System</h1>
      <p>Manage students with ease</p>
    </div>

    <div className="auth-section">
      <div className="card" style={{ flex: 1, marginBottom: 0 }}>
        <h2>{isRegistering ? "Register" : "Login"}</h2>

        <form
          className="auth-form"
          onSubmit={isRegistering ? handleRegister : handleLogin}
        >
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary">
            {isRegistering ? "Register" : "Login"}
          </button>
        </form>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => setIsRegistering(!isRegistering)}
        >
          {isRegistering
            ? "Already have an account? Login"
            : "Don't have an account? Register"}
        </button>
      </div>

      <button onClick={handleLogout} className="btn-secondary">
        Logout
      </button>
    </div>
      <div className="card">
        <h2>Add Student</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">Add Student</button>
        </form>
      </div>

      <div className="student-list">
        <h2>Students</h2>
        {error && <div className="error">{error}</div>}
        {students.length === 0 ? (
          <div className="empty-state">No students found. Add one above.</div>
        ) : (
          <ul>
            {students.map((student) => (
              <li key={student.id} className="student-item">
                <div className="student-info">
                  {student.name} - {student.age} years old
                </div>
                <div className="student-actions">
                  <button
                    className="btn-secondary btn-small"
                    onClick={() => {
                      setEditingStudent(student.id);
                      setEditName(student.name);
                      setEditAge(student.age);
                    }}
                  >
                    Edit
                  </button>
                  {role === "Admin" && (
                    <button
                      className="btn-danger btn-small"
                      onClick={() => handleDelete(student.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editingStudent && (
        <div className="edit-form">
          <h3>Edit Student</h3>
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Age</label>
              <input
                type="number"
                value={editAge}
                onChange={(e) => setEditAge(e.target.value)}
              />
            </div>
            <div className="edit-actions">
              <button type="submit" className="btn-primary">Update Student</button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditingStudent(null);
                  setEditName("");
                  setEditAge("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;