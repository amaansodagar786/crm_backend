const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// Division Schema
const divisionSchema = new mongoose.Schema({
  divisionId: { type: String, default: uuidv4 }, // Unique ID for each division
  divisionName: { type: String, required: true },
});

// Subject Schema
const subjectSchema = new mongoose.Schema({
  subjectId: { type: String, default: uuidv4 }, // Unique ID for each subject
  subjectName: { type: String, required: true },
});

// Class Schema
const classSchema = new mongoose.Schema({
  classId: { type: String, default: uuidv4 }, // Unique Class ID
  instituteId: { type: String, required: true }, // From frontend
  className: { type: String, required: true }, // Class Name
  divisions: [divisionSchema], // Array of Divisions with unique IDs
  subjects: [subjectSchema], // Array of Subjects with unique IDs
  createdAt: { type: Date, default: Date.now },
});

const Class = mongoose.model("Class", classSchema);
module.exports = Class;
