const mongoose = require("mongoose");

const pendingUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phoneNo: { type: String, required: true},
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  instituteName: { type: String, required: true },
  instituteId: { type: String, required: true },
  role: { type: String, default: "student" },
  photo: { type: String }, // Store photo as base64 string
  status: { type: String, default: "pending" }, // Status: pending, approved, rejected
  createdAt: { type: Date, default: Date.now },
});

const PendingUser = mongoose.model("PendingUser", pendingUserSchema);

module.exports = PendingUser;
