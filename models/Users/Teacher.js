const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// Assigned Classes Schema
const assignedClassSchema = new mongoose.Schema({
  classId: { type: String, required: true },
  divisionIds: { type: [String], default: [] } // Changed to array of strings
});

// Teacher Schema
const teacherSchema = new mongoose.Schema({
  teacherId: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  phoneNo: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  instituteName: { type: String, required: true },
  instituteId: { type: String, required: true },
  role: { type: String, default: "teacher" },
  photo: { type: String, default: null },
  assignedClasses: [assignedClassSchema]
}, { timestamps: true });

// Add index to prevent duplicate class assignments
teacherSchema.index(
  { teacherId: 1, "assignedClasses.classId": 1 },
  { unique: true }
);

const Teacher = mongoose.model("Teacher", teacherSchema);
module.exports = Teacher;