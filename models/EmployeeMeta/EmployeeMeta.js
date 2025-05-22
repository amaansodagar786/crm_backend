const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const leaveSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., "Casual", "Sick"
  count: { type: Number, default: 0 }     // Number of leaves allowed
});

const accessSchema = new mongoose.Schema({
  module: { type: String, required: true }, // e.g., "Timetable", "Students", "Reports"
  permission: { 
    type: String, 
    enum: ["none", "view", "edit", "full"], 
    default: "view" 
  }
});

const employeeMetaSchema = new mongoose.Schema({
  metaId: { type: String, default: uuidv4, unique: true },

  userId: { type: String, required: true },      // From teacher/admin
  role: { type: String, enum: ["teacher", "admin"], required: true },
  instituteId: { type: String, required: true },

  monthlySalary: { type: Number, required: true },

  leaves: { type: [leaveSchema], default: [] },

  accessRights: { type: [accessSchema], default: [] }

}, { timestamps: true });

const EmployeeMeta = mongoose.model("EmployeeMeta", employeeMetaSchema);

module.exports = EmployeeMeta;
