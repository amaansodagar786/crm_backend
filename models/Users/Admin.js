const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const adminSchema = new mongoose.Schema({
  adminId: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  phoneNo: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  instituteName: { type: String, required: true },
  address: { type: String, required: true },
  instituteId: { type: String, required: true },
  role: { type: String, default: "admin" },
  photo: { type: String, default: null }, // Base64 encoded photo
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;
