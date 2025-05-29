const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken")
const Student = require("../models/Users/Student");
const Teacher = require("../models/Users/Teacher");
const Admin = require("../models/Users/Admin");
const Subscription = require("../models/Subscription");
const MainAdmin = require("../models/MainAdmin");
const Institute = require("../models/Institute");
const PendingUser = require("../models/Pendingusers");
const Plans = require("../plans/plans");

const nodemailer = require("nodemailer");
const otpStorage = {}; // Temporary storage for OTPs
const multer = require("multer");
// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });


const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


router.post("/mainlogin", async (req, res) => {
  const { email, password } = req.body;
  console.log({ email, password });

  try {
    console.log(`🔍 Checking login for email: ${email}`);
    let user = null;
    let role = null;

    // Check all user types in sequence
    const userTypes = [
      { model: MainAdmin, role: 'mainadmin' },
      { model: Admin, role: 'admin' },
      { model: Teacher, role: 'teacher' },
      { model: Student, role: 'student' }
    ];

    for (const userType of userTypes) {
      const foundUser = await userType.model.findOne({ email });
      if (foundUser) {
        user = foundUser;
        role = userType.role;
        break;
      }
    }

    if (!user) {
      console.log("❌ User not found");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify Institute status for non-mainadmin roles
    if (role !== "mainadmin") {
      const institute = await Institute.findOne({ instituteId: user.instituteId });

      if (!institute) {
        return res.status(404).json({ message: "Institute not found. Contact support." });
      }

      if (institute.status !== "Active") {
        return res.status(403).json({
          message: `Login failed. Your institute status is ${institute.status}. Please contact support.`
        });
      }
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: user._id, role: role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Send response
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        adminId: (role === "mainadmin" || role === "admin") ? user.adminId || user._id : null,
        name: user.name,
        email: user.email,
        role: role,
        instituteId: role !== "mainadmin" ? user.instituteId : null,
        studentId: role === "student" ? user.studentId : null,
        classId: role === "student" ? user.classId : null,  // Add this
        divId: role === "student" ? user.divId : null,     // Add this
        teacherId: role === "teacher" ? user.teacherId : null // Add this line
      },
    });

  } catch (error) {
    console.error("❌ Login Error:", error.message, error.stack);
    res.status(500).json({ message: "Internal server error" });
  }
});






// ✅ Register API
router.post("/mainregister", upload.single("photo"), async (req, res) => {
  const { name, phoneNo, email, password, role, instituteId } = req.body;
  const photo = req.file;

  try {
    // Existing checks for duplicate emails
    const existingPendingUser = await PendingUser.findOne({ email });
    const existingStudent = await Student.findOne({ email });
    const existingTeacher = await Teacher.findOne({ email });
    const existingAdmin = await Admin.findOne({ email });
    const existingMainAdmin = await MainAdmin.findOne({ email });

    if (existingPendingUser || existingAdmin || existingMainAdmin || existingTeacher || existingStudent) {
      return res.status(400).json({ message: "Email already exists. Please use a different email." });
    }

    // Check institute exists
    const institute = await Institute.findOne({ instituteId });
    if (!institute) {
      return res.status(404).json({ message: "Institute not found" });
    }

    // Check institute's active subscription
    const activeSubscription = await Subscription.findOne({
      instituteId,
      status: "Active"
    });

    if (!activeSubscription) {
      return res.status(403).json({
        message: "Institute doesn't have an active subscription. Please contact the institute admin."
      });
    }

    // Get the plan limits
    const planLimits = Plans[activeSubscription.plan.toLowerCase()];
    if (!planLimits) {
      return res.status(400).json({ message: "Invalid subscription plan" });
    }

    // Check if the institute has reached its user limits for this role
    switch (role) {
      case "admin":
        const adminCount = await Admin.countDocuments({ instituteId });
        if (adminCount >= planLimits.maxAdmins) {
          return res.status(403).json({
            message: `This institute has reached its maximum admin limit (${planLimits.maxAdmins}) for the ${activeSubscription.plan} plan.`
          });
        }
        break;

      case "teacher":
        const teacherCount = await Teacher.countDocuments({ instituteId });
        if (teacherCount >= planLimits.maxTeachers) {
          return res.status(403).json({
            message: `This institute has reached its maximum teacher limit (${planLimits.maxTeachers}) for the ${activeSubscription.plan} plan.`
          });
        }
        break;

      case "student":
        const studentCount = await Student.countDocuments({ instituteId });
        if (studentCount >= planLimits.maxStudents) {
          return res.status(403).json({
            message: `This institute has reached its maximum student limit (${planLimits.maxStudents}) for the ${activeSubscription.plan} plan.`
          });
        }
        break;

      default:
        return res.status(400).json({ message: "Invalid role" });
    }

    // If all checks pass, continue with registration
    const hashedPassword = await bcrypt.hash(password, 10);
    const photoBase64 = photo ? photo.buffer.toString("base64") : "";

    const newPendingUser = new PendingUser({
      name,
      phoneNo,
      email,
      password: hashedPassword,
      role,
      instituteName: institute.instituteName,
      instituteId,
      photo: photoBase64,
      status: "pending",
    });

    await newPendingUser.save();

    // Send email (existing code)
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Registration Request Received – Awaiting Approval",
      html: `<p>Dear ${name},</p>...`, // your existing email template
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message: "Registration request submitted for approval and confirmation email sent.",
      user: newPendingUser
    });

  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});







// Forgot Password Route
router.post("/main-forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // Check if email exists in MainAdmin or User collection
    const admin = await MainAdmin.findOne({ email });
    const user = await User.findOne({ email });

    if (!admin && !user) {
      return res.status(404).json({ message: "Email not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
    otpStorage[email] = otp; // Store OTP temporarily
    console.log(`Generated OTP for ${email}: ${otp}`); // Log for testing

    // Email content
    const mailOptions = {
      from: `"Support Team" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Reset Your Password ",
      html: `
    <p>Dear User,</p>
    <p>You have requested to reset your password for your account. Please use the OTP below to proceed with resetting your password:</p>
    <h2>🔐 Your OTP: <strong>${otp}</strong></h2>
    <p>This OTP is valid for <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
    <p>For security reasons, do not share your OTP with anyone.</p>
    <br/>
    <p>Best regards,</p>
    <p><strong>Your Company Name</strong></p>
    <p>Support Team</p>
  `,
    };

    // Send email
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    console.error("Error sending OTP email:", error);
    res.status(500).json({ message: "Failed to send OTP. Try again later." });
  }
});




// Verify OTP Route
router.post("/main-verify-otp", (req, res) => {
  const { email, otp } = req.body;

  // Check if OTP is correct
  if (!otpStorage[email] || otpStorage[email] !== parseInt(otp)) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  // OTP is correct, allow password reset
  delete otpStorage[email]; // Remove OTP after verification
  res.status(200).json({ message: "OTP verified successfully" });
});




// Reset Password Route
router.put("/main-pass-reset", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Check if email exists in MainAdmin or User collection
    const admin = await MainAdmin.findOne({ email });
    const user = await User.findOne({ email });

    if (admin) {
      // Update password for MainAdmin
      const updatedAdmin = await MainAdmin.findOneAndUpdate(
        { email },
        { password: hashedPassword },
        { new: true }
      );
      return res.status(200).json({ message: "Password updated successfully" });
    }

    if (user) {
      // Update password for User
      const updatedUser = await User.findOneAndUpdate(
        { email },
        { password: hashedPassword },
        { new: true }
      );
      return res.status(200).json({ message: "Password updated successfully" });
    }

    // If email doesn't exist in either collection
    return res.status(404).json({ message: "Email not found" });
  } catch (error) {
    console.error("Reset error:", error);
    res.status(500).json({ message: "Server error" });
  }
});




router.get("/get-inst", async (req, res) => {
  try {
    console.log("Received request at /get-inst"); // Debugging
    const institutes = await Institute.find({}, "instituteName instituteId");

    // console.log("Fetched Institutes:", institutes); // Debugging
    if (!institutes || institutes.length === 0) {
      console.warn("No institutes found in the database.");
      return res.status(200).json([]); // Return empty array instead of 404
    }

    res.status(200).json(institutes);
  } catch (error) {
    console.error(`[GET] /get-inst - Error fetching institutes:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
});



module.exports = router;