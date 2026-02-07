require("dotenv").config();

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is missing in .env file!");
  process.exit(1);
}

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

console.log("🔥 STUDENT API SERVER.JS IS RUNNING 🔥");

const app = express();
app.use(express.json());

// ✅ PORT
const PORT = process.env.PORT || 3000;

// ✅ DB
const client = new MongoClient(process.env.MONGO_URI);
let db;

// =======================
// CONNECT DB
// =======================
async function connectDB() {
  try {
    await client.connect();
    db = client.db("studentDB");
    console.log("Connected to MongoDB (studentDB)");
  } catch (error) {
    console.error("MongoDB connection failed", error);
  }
}

// =======================
// AUTH MIDDLEWARE
// =======================
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// =======================
// TEST ROUTE
// =======================
app.get("/", (req, res) => {
  res.send("Student Management API is running");
});

// =======================
// AUTH ROUTES
// =======================

// Register
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      email,
      password: hashedPassword,
      createdAt: new Date()
    };

    const result = await db.collection("users").insertOne(user);

    res.status(201).json({ message: "User created", id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db.collection("users").findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// STUDENTS ROUTES
// =======================

// GET all students (public)
app.get("/students", async (req, res) => {
  try {
    const students = await db.collection("students").find().toArray();
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET student by ID (public)
app.get("/students/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid student ID" });
    }

    const student = await db.collection("students").findOne({ _id: new ObjectId(id) });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create student (PROTECTED)
app.post("/students", authMiddleware, async (req, res) => {
  try {
    const student = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      course: req.body.course,
      year: req.body.year,
      registrationNumber: req.body.registrationNumber,
      createdAt: new Date()
    };

    if (
      !student.firstName ||
      !student.lastName ||
      !student.email ||
      !student.course ||
      !student.year ||
      !student.registrationNumber
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await db.collection("students").insertOne(student);

    res.status(201).json({ message: "Student created", id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update student (PROTECTED)
app.put("/students/:id", authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid student ID" });
    }

    const updatedStudent = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      course: req.body.course,
      year: req.body.year,
      registrationNumber: req.body.registrationNumber
    };

    if (
      !updatedStudent.firstName ||
      !updatedStudent.lastName ||
      !updatedStudent.email ||
      !updatedStudent.course ||
      !updatedStudent.year ||
      !updatedStudent.registrationNumber
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await db.collection("students").replaceOne(
      { _id: new ObjectId(id) },
      updatedStudent
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE student (PROTECTED)
app.delete("/students/:id", authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid student ID" });
    }

    const result = await db.collection("students").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// COURSES ROUTES
// =======================

// GET all courses (public)
app.get("/courses", async (req, res) => {
  try {
    const courses = await db.collection("courses").find().toArray();
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET course by ID (public)
app.get("/courses/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    const course = await db.collection("courses").findOne({ _id: new ObjectId(id) });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create course (PROTECTED)
app.post("/courses", authMiddleware, async (req, res) => {
  try {
    const course = {
      name: req.body.name,
      code: req.body.code,
      instructor: req.body.instructor,
      credits: req.body.credits,
      semester: req.body.semester,
      department: req.body.department,
      year: req.body.year
    };

    if (
      !course.name ||
      !course.code ||
      !course.instructor ||
      !course.credits ||
      !course.semester ||
      !course.department ||
      !course.year
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await db.collection("courses").insertOne(course);

    res.status(201).json({ message: "Course created", id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update course (PROTECTED)
app.put("/courses/:id", authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    const updatedCourse = {
      name: req.body.name,
      code: req.body.code,
      instructor: req.body.instructor,
      credits: req.body.credits,
      semester: req.body.semester,
      department: req.body.department,
      year: req.body.year
    };

    if (
      !updatedCourse.name ||
      !updatedCourse.code ||
      !updatedCourse.instructor ||
      !updatedCourse.credits ||
      !updatedCourse.semester ||
      !updatedCourse.department ||
      !updatedCourse.year
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await db.collection("courses").replaceOne(
      { _id: new ObjectId(id) },
      updatedCourse
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE course (PROTECTED)
app.delete("/courses/:id", authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    const result = await db.collection("courses").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// START SERVER
// =======================
async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log("🚀 Server running on port", PORT);
  });
}

startServer();
