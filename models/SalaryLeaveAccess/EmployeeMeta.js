const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const leaveSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true,
    enum: ["Casual", "Sick", "Earned", "Academic"] // Added Academic type
  },
  count: { type: Number, default: 0 },     // Can be negative
  // Track negative leaves separately
  negativeCount: { type: Number, default: 0 },
  lastNegativeAdjustment: Date
});

const accessSchema = new mongoose.Schema({
  module: { type: String, required: true },
  permission: { 
    type: String, 
    enum: ["none", "view", "edit", "full"], 
    default: "view" 
  }
});

const employeeMetaSchema = new mongoose.Schema({
  metaId: { type: String, default: uuidv4, unique: true },
  userId: { type: String, required: true },
  role: { type: String, enum: ["teacher", "admin"], required: true },
  instituteId: { type: String, required: true },
  monthlySalary: { type: Number, required: true },
  leaves: { type: [leaveSchema], default: [] },
  accessRights: { type: [accessSchema], default: [] },
  // Track total negative leaves across all types
  totalNegativeLeaves: { type: Number, default: 0 }
}, { timestamps: true });

const EmployeeMeta = mongoose.model("EmployeeMeta", employeeMetaSchema);

module.exports = EmployeeMeta;