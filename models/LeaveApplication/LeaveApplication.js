// 📁 File: backend/models/LeaveApplication.js
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const leaveApplicationSchema = new mongoose.Schema({
  applicationId: { type: String, default: uuidv4, unique: true },
  teacherId: { type: String, required: true },
  instituteId: { type: String, required: true },
  leaveType: { 
    type: String, 
    required: true,
    enum: ["Casual", "Sick", "Earned"] 
  },
  dates: { type: [String], required: true }, // Array of dates in YYYY-MM-DD format
  reason: { type: String, required: true },
  status: { 
    type: String, 
    enum: ["Pending", "Approved", "Rejected"], 
    default: "Pending" 
  },
  appliedOn: { type: Date, default: Date.now },
  processedOn: Date,
  processedBy: String, // Admin ID who processed it
  comments: String // Admin comments
}, { timestamps: true });

module.exports = mongoose.model("LeaveApplication", leaveApplicationSchema);