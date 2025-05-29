const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const leaveApplicationSchema = new mongoose.Schema({
  applicationId: { type: String, default: uuidv4, unique: true },
  teacherId: { type: String, required: true },
  instituteId: { type: String, required: true },
  leaveType: { 
    type: String, 
    required: true,
    enum: ["Casual", "Sick", "Earned", "Academic"] // Added Academic type
  },
  dates: { type: [String], required: true },
  reason: { type: String, required: true },
  status: { 
    type: String, 
    enum: ["Pending", "Approved", "Rejected"], 
    default: "Pending" 
  },
  appliedOn: { type: Date, default: Date.now },
  processedOn: Date,
  processedBy: String,
  comments: String,
  // Track if this application resulted in negative balance
  resultedInNegative: { type: Boolean, default: false },
  negativeBalanceAmount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("LeaveApplication", leaveApplicationSchema);