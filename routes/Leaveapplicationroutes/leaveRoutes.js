// 📁 File: backend/routes/leaveRoutes.js
const express = require("express");
const router = express.Router();
const LeaveApplication = require("../../models/LeaveApplication/LeaveApplication");
const EmployeeMeta = require("../../models/SalaryLeaveAccess/EmployeeMeta");

// Apply for leave
router.post("/apply", async (req, res) => {
  try {
    const { teacherId, instituteId, leaveType, dates, reason } = req.body;

    // Check leave balance
    const employee = await EmployeeMeta.findOne({ userId: teacherId });
    const leaveBalance = employee.leaves.find(l => l.type === leaveType);
    
    if (!leaveBalance || leaveBalance.count < dates.length) {
      return res.status(400).json({ 
        error: `Not enough ${leaveType} leaves remaining` 
      });
    }

    // Create leave application
    const application = new LeaveApplication({
      teacherId,
      instituteId,
      leaveType,
      dates,
      reason
    });

    await application.save();
    
    res.status(201).json(application);
  } catch (error) {
    console.error("Error applying for leave", error);
    res.status(500).json({ error: "Failed to apply for leave" });
  }
});

module.exports = router;