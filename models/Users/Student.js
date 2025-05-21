const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// Parent Details Schema
const parentDetailsSchema = new mongoose.Schema({
  fatherName: { type: String, default: null },
  fatherNo: { type: String, default: null },
  fatherEmail: { type: String, default: null },
  fatherOccupation: { type: String, default: null },
  motherName: { type: String, default: null },
  motherNo: { type: String, default: null },
  motherEmail: { type: String, default: null },
  motherOccupation: { type: String, default: null },
});

// Student Schema
const studentSchema = new mongoose.Schema({
  studentId: { type: String, default: () => uuidv4(), unique: true }, // ✅ Generate UUID Correctly
  name: { type: String, required: true },
  phoneNo: { type: String, required: true},
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  instituteId: { type: String, required: true },
  instituteName: { type: String, required: true },
  classId: { type: String, default: null },
  divId: { type: String, default: null },
  rollNo: { type: String, default: null },
  address: { type: String, default: null },
  role: { type: String, default: "student" },
  photo: { type: String, default: null }, // Base64 Image or URL
  parentDetails: { type: parentDetailsSchema, default: () => ({}) }, // Parent Details
}, { timestamps: true });

const Student = mongoose.model("Student", studentSchema);
module.exports = Student;
