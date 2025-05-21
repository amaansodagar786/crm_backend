const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const MainAdmin = require("../models/MainAdmin");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
require("dotenv").config(); // Load .env variables
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");



const JWT_SECRET = process.env.JWT_SECRET;

// Register MainAdmin
router.post("/register", async (req, res) => {
  const { name, email, phoneNo, password, confirmPassword } = req.body;

  try {
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingAdmin = await MainAdmin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new MainAdmin({
      adminId: uuidv4(),
      name,
      email,
      phoneNo,
      password: hashedPassword,
      role: "mainadmin",
    });

    await newAdmin.save();

    res.status(201).json({ 
      message: "MainAdmin registered successfully",
      adminId: newAdmin.adminId,
    });

  } catch (error) {
    console.error("❌ Registration Error:", error.message, error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});



// Login MainAdmin (Generate JWT Token)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log(`🔍 Checking login for email: ${email}`); // Debugging Log

    const admin = await MainAdmin.findOne({ email });
    if (!admin) {
      console.log("❌ Admin not found");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      console.log("❌ Incorrect password");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: admin._id, role: admin.role }, JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({
      message: "Login successful",
      token,
      admin: {
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });

  } catch (error) {
    console.error("❌ Login Error:", error.message, error.stack);
    res.status(500).json({ message: "Internal server error" });
  }
});



// ✅ Fetch Admin Details by adminId
router.get("/:adminId", async (req, res) => {
  try {
    const admin = await MainAdmin.findOne({ adminId: req.params.adminId });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    res.status(200).json({
      adminId: admin.adminId,
      name: admin.name,
      email: admin.email,
      phoneNo: admin.phoneNo || "",
    });
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Update Admin Profile
router.put("/update", async (req, res) => {
  const { adminId, name, phoneNo } = req.body;
  
  try {
    const updatedAdmin = await MainAdmin.findOneAndUpdate(
      { adminId },
      { name, phoneNo },
      { new: true }
    );

    if (!updatedAdmin) return res.status(404).json({ message: "Admin not found" });

    res.status(200).json({
      message: "Profile updated successfully",
      admin: {
        adminId: updatedAdmin.adminId,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        phoneNo: updatedAdmin.phoneNo,
      },
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// ✅ Reset Password
router.put("/reset-password", async (req, res) => {
  const { adminId, newPassword } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedAdmin = await MainAdmin.findOneAndUpdate(
      { adminId },
      { password: hashedPassword },
      { new: true }
    );

    if (!updatedAdmin) return res.status(404).json({ message: "Admin not found" });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset error:", error);
    res.status(500).json({ message: "Server error" });
  }
});




const otpStorage = {}; // Temporary in-memory storage (use Redis for production)

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // Change this based on your provider
  port: 587, // Use 465 for SSL, 587 for TLS
  secure: false, // Use TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const admin = await MainAdmin.findOne({ email });

  if (!admin) return res.status(404).json({ message: "Email not found" });

  const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
  otpStorage[email] = otp; // Store OTP temporarily
  console.log(`Generated OTP for ${email}: ${otp}`); // Log for testing

  // Email content
  const mailOptions = {
    from: `"Support Team" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Password Reset OTP",
    text: `Your OTP for password reset is: ${otp}. This OTP is valid for 10 minutes.`,
    html: `<p>Your OTP for password reset is: <b>${otp}</b>. This OTP is valid for 10 minutes.</p>`,
  };

  // Send email
  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    console.error("Error sending OTP email:", error);
    res.status(500).json({ message: "Failed to send OTP. Try again later." });
  }
});


router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  // Check if OTP is correct
  if (!otpStorage[email] || otpStorage[email] !== parseInt(otp)) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  // OTP is correct, allow password reset
  delete otpStorage[email]; // Remove OTP after verification
  res.status(200).json({ message: "OTP verified successfully" });
});


router.put("/pass-reset", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedAdmin = await MainAdmin.findOneAndUpdate(
      { email }, // Search by email instead of adminId
      { password: hashedPassword },
      { new: true }
    );

    if (!updatedAdmin) return res.status(404).json({ message: "Admin not found" });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset error:", error);
    res.status(500).json({ message: "Server error" });
  }
});




module.exports = router;
