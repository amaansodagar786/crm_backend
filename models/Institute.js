const mongoose = require("mongoose");

const instituteSchema = new mongoose.Schema({
  instituteName: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  plan: { type: String, default: "pending" },
  planDuration: { type: String, default: "pending" },
  instituteId: { type: String, required: true, unique: true },
  status: { type: String, default: "pending" },
  planStartDate: { type: Date, default: Date.now },
  planExpiryDate: { type: Date, default: null },
  adminId: { type: String, required: true },  // Change from ObjectId to String
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Institute = mongoose.model("Institute", instituteSchema);
module.exports = Institute;
