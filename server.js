require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");

console.log("🔥 STUDENT API SERVER.JS IS RUNNING 🔥");

const app = express();
app.use(express.json());

// ✅ PORT MUST BE DEFINED EARLY
const PORT = process.env.PORT || 3000;

const client = new MongoClient(process.env.MONGO_URI);
let db;

// connect to MongoDB once
async function connectDB() {
  try {
    await client.connect();
    db = client.db("studentDB");
    console.log("Connected to MongoDB (studentDB)");
  } catch (error) {
    console.error("MongoDB connection failed", error);
  }
}

// routes
app.get("/", (req, res) => {
  res.send("Student Management API is running");
});

app.get("/students", async (req, res) => {
  try {
    const students = await db.collection("students").find().toArray();
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// POST create new student
app.post("/students", async (req, res) => {
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

    // validation
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

    res.status(201).json({
      message: "Student created successfully",
      id: result.insertedId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// PUT update student
app.put("/students/:id", async (req, res) => {
  try {
    const studentId = new require("mongodb").ObjectId(req.params.id);

    const updatedStudent = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      course: req.body.course,
      year: req.body.year,
      registrationNumber: req.body.registrationNumber
    };

    // validation
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
      { _id: studentId },
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
// DELETE student
app.delete("/students/:id", async (req, res) => {
  try {
    const studentId = new require("mongodb").ObjectId(req.params.id);

    const result = await db.collection("students").deleteOne({
      _id: studentId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// start server AFTER everything is defined
async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log("🚀 Server running on port", PORT);
  });
}

startServer();
