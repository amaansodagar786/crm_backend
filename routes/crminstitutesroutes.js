const express = require("express");
const router = express.Router();
const Institute = require("../models/Institute");
const MainAdmin = require("../models/MainAdmin");  
const Subscription = require("../models/Subscription");
const Plans = require("../plans/plans");
const PendingUser = require("../models/Pendingusers");
const Student = require("../models/Users/Student");
const Teacher = require("../models/Users/Teacher");
const Admin = require("../models/Users/Admin");
const User = require("../models/User");
const nodemailer = require("nodemailer");


// 📧 Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});



// Helper function to check user limits
async function checkUserLimit(instituteId, role) {
  // Get active subscription
  const activeSubscription = await Subscription.findOne({ 
    instituteId, 
    status: "Active" 
  });

  if (!activeSubscription) {
    throw new Error("Institute doesn't have an active subscription");
  }

  // Get plan limits
  const planName = activeSubscription.plan.toLowerCase();
  const planLimits = Plans[planName];
  
  if (!planLimits) {
    throw new Error("Invalid subscription plan");
  }

  // Get current user counts
  let currentCount;
  switch (role) {
    case "admin":
      currentCount = await Admin.countDocuments({ instituteId });
      return {
        canAdd: currentCount < planLimits.maxAdmins,
        current: currentCount,
        max: planLimits.maxAdmins,
        plan: activeSubscription.plan
      };
    case "teacher":
      currentCount = await Teacher.countDocuments({ instituteId });
      return {
        canAdd: currentCount < planLimits.maxTeachers,
        current: currentCount,
        max: planLimits.maxTeachers,
        plan: activeSubscription.plan
      };
    case "student":
      currentCount = await Student.countDocuments({ instituteId });
      return {
        canAdd: currentCount < planLimits.maxStudents,
        current: currentCount,
        max: planLimits.maxStudents,
        plan: activeSubscription.plan
      };
    default:
      throw new Error("Invalid role");
  }
}

// Get all pending users for a specific institute
router.get("/pending-users/:instituteId", async (req, res) => {
  const { instituteId } = req.params;

  try {
    // First check if institute has active subscription
    const activeSubscription = await Subscription.findOne({ 
      instituteId, 
      status: "Active" 
    });

    if (!activeSubscription) {
      return res.status(403).json({ 
        message: "Institute doesn't have an active subscription" 
      });
    }

    const pendingUsers = await PendingUser.find({ instituteId, status: "pending" });
    
    // Get current user counts for the institute
    const planName = activeSubscription.plan.toLowerCase();
    const planLimits = Plans[planName];
    
    const adminCount = await Admin.countDocuments({ instituteId });
    const teacherCount = await Teacher.countDocuments({ instituteId });
    const studentCount = await Student.countDocuments({ instituteId });

    res.status(200).json({
      pendingUsers,
      limits: {
        admin: { current: adminCount, max: planLimits.maxAdmins },
        teacher: { current: teacherCount, max: planLimits.maxTeachers },
        student: { current: studentCount, max: planLimits.maxStudents },
        plan: activeSubscription.plan
      }
    });
  } catch (error) {
    console.error("Error fetching pending users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ✅ Approve a pending user with plan limit checks
router.put("/pending-users/:userId/approve", async (req, res) => {
  const { userId } = req.params;

  try {
    const pendingUser = await PendingUser.findById(userId);
    if (!pendingUser) {
      return res.status(404).json({ message: "Pending user not found" });
    }

    // Check if institute has reached its user limit for this role
    const limitCheck = await checkUserLimit(pendingUser.instituteId, pendingUser.role);
    
    if (!limitCheck.canAdd) {
      return res.status(403).json({ 
        message: `Cannot approve user. Institute has reached its maximum ${pendingUser.role} limit (${limitCheck.current}/${limitCheck.max}) for the ${limitCheck.plan} plan.`,
        limitReached: true,
        current: limitCheck.current,
        max: limitCheck.max,
        role: pendingUser.role,
        plan: limitCheck.plan
      });
    }

    let newUser;
    if (pendingUser.role === "student") {
      newUser = new Student({
        name: pendingUser.name,
        phoneNo: pendingUser.phoneNo,
        email: pendingUser.email,
        password: pendingUser.password,
        instituteName: pendingUser.instituteName,
        instituteId: pendingUser.instituteId,
        role: pendingUser.role,
        photo: pendingUser.photo,
      });
    } else if (pendingUser.role === "teacher") {
      newUser = new Teacher({
        name: pendingUser.name,
        phoneNo: pendingUser.phoneNo,
        email: pendingUser.email,
        password: pendingUser.password,
        instituteName: pendingUser.instituteName,
        instituteId: pendingUser.instituteId,
        role: pendingUser.role,
        photo: pendingUser.photo,
      });
    } else if (pendingUser.role === "admin") {
      newUser = new Admin({
        name: pendingUser.name,
        phoneNo: pendingUser.phoneNo,
        email: pendingUser.email,
        password: pendingUser.password,
        instituteName: pendingUser.instituteName,
        instituteId: pendingUser.instituteId,
        role: pendingUser.role,
        photo: pendingUser.photo,
        address: pendingUser.address || "Not specified" // Add default address

      });
    }

    await newUser.save();

    // Send approval email
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: pendingUser.email,
      subject: `Welcome to ${pendingUser.instituteName} – Registration Approved`,
      html: `
        <p>Dear ${pendingUser.name},</p>
        <p>Your registration request for <strong>${pendingUser.instituteName}</strong> has been approved!</p>
        <p>🎉 You can now log in using your credentials.</p>
        <p><a href="YOUR_LOGIN_LINK">Log In to Your Account</a></p>
        <p>If you need assistance, feel free to contact us.</p>
      `,
    });

    // Remove from PendingUser collection
    await PendingUser.findByIdAndDelete(userId);

    res.status(200).json({ 
      message: "User approved, email sent, and saved to the appropriate schema.",
      newUser: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      },
      limits: {
        role: pendingUser.role,
        current: limitCheck.current + 1,
        max: limitCheck.max,
        plan: limitCheck.plan
      }
    });
  } catch (error) {
    console.error("Error approving user:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
});

// ✅ Reject a pending user
router.put("/pending-users/:userId/reject", async (req, res) => {
  const { userId } = req.params;
  const { rejectionReason } = req.body;

  try {
    const pendingUser = await PendingUser.findById(userId);
    if (!pendingUser) {
      return res.status(404).json({ message: "Pending user not found" });
    }

    // Update rejection reason if provided
    if (rejectionReason) {
      pendingUser.rejectionReason = rejectionReason;
      await pendingUser.save();
    }

    // Send rejection email
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: pendingUser.email,
      subject: `Registration Request for ${pendingUser.instituteName} – Not Approved`,
      html: `
        <p>Dear ${pendingUser.name},</p>
        <p>We regret to inform you that your registration request for <strong>${pendingUser.instituteName}</strong> has not been approved by the administrator.</p>
        <p>📌 <strong>Reason:</strong> ${pendingUser.rejectionReason || 'Not provided'}</p>
        <p>If you believe this was a mistake or need further clarification, please contact the administrator.</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>Your Company Name</strong></p>
        <p>Support Team</p>
      `,
    });

    // Remove from PendingUser collection
    await PendingUser.findByIdAndDelete(userId);

    res.status(200).json({ 
      message: "User rejected, email sent, and removed from pending users",
      rejectedUser: {
        id: pendingUser._id,
        name: pendingUser.name,
        email: pendingUser.email,
        role: pendingUser.role
      }
    });
  } catch (error) {
    console.error("Error rejecting user:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
});




// Get all institutes for a specific admin
router.get("/institutes/:adminId", async (req, res) => {
    let { adminId } = req.params;
  
    // Remove hyphens from adminId (if any)
    // adminId = adminId.replace(/-/g, '');
    console.log( adminId);

  
    try {
      const institutes = await Institute.find({ adminId });
      console.log("Fetched institutes:", institutes);
      res.status(200).json(institutes);
    } catch (error) {
      console.error("Error fetching institutes:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });





module.exports = router;