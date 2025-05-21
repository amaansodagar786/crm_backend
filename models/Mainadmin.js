const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // Import UUID for unique ID generation


const mainAdminSchema = new mongoose.Schema({
  adminId: { type: String, unique: true, default: uuidv4 }, // Generate a unique admin ID
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNo: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: "mainadmin" },
  createdAt: { type: Date, default: Date.now },
});

const MainAdmin = mongoose.model("MainAdmin", mainAdminSchema);
module.exports = MainAdmin;
