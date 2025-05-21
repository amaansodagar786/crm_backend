const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phoneNo: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  instituteName: { type: String, required: true },
  address: { type: String, required: true }, 
  instituteId: { type: String, required: true },
  role: { type: String, required: true },
  photo: { type: String }, // Store photo as base64 string
});

const User = mongoose.model("User", userSchema);

module.exports = User;