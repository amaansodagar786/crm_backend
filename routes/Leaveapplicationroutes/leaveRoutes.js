const express = require("express");
const router = express.Router();
const LeaveApplication = require("../../models/LeaveApplication/LeaveApplication");
const EmployeeMeta = require("../../models/SalaryLeaveAccess/EmployeeMeta");
const Teacher = require("../../models/Users/Teacher");
const Admin = require("../../models/Users/Admin");

// Apply for leave
router.post("/apply", async (req, res) => {
  try {
    const { teacherId, instituteId, leaveType, dates, reason } = req.body;

    // For academic leaves, no need to check balance
    if (leaveType !== "Academic") {
      const employee = await EmployeeMeta.findOne({ userId: teacherId });
      if (!employee) {
        return res.status(404).json({ error: "Employee record not found" });
      }

      const leaveBalance = employee.leaves.find(l => l.type === leaveType);
      
      // Still allow application even if balance is insufficient
      if (!leaveBalance) {
        return res.status(400).json({
          error: `Leave type ${leaveType} not configured for this employee`
        });
      }
    }

    // Create leave application
    const application = new LeaveApplication({
      teacherId,
      instituteId,
      leaveType,
      dates,
      reason,
      status: "Pending"
    });

    await application.save();
    res.status(201).json(application);
    
  } catch (error) {
    console.error("Error applying for leave", error);
    res.status(500).json({ error: "Failed to apply for leave" });
  }
});

// Process leave application (approve/reject)
router.put("/process/:leaveId", async (req, res) => {
  try {
    const { action, reason } = req.body;
    const leave = await LeaveApplication.findById(req.params.leaveId);

    if (!leave) {
      return res.status(404).json({ error: "Leave application not found" });
    }

    if (action === 'approve') {
      const employee = await EmployeeMeta.findOne({ userId: leave.teacherId });
      
      if (!employee) {
        return res.status(404).json({ error: "Employee record not found" });
      }

      // Handle academic leave separately
      if (leave.leaveType === "Academic") {
        // Add academic leave type if not exists
        let academicLeave = employee.leaves.find(l => l.type === "Academic");
        
        if (!academicLeave) {
          employee.leaves.push({ type: "Academic", count: leave.dates.length });
        } else {
          academicLeave.count += leave.dates.length;
        }
        
        await employee.save();
      } else {
        // Regular leave processing with negative balance handling
        const leaveBalance = employee.leaves.find(l => l.type === leave.leaveType);
        const remainingBalance = leaveBalance.count - leave.dates.length;
        
        if (remainingBalance < 0) {
          leave.resultedInNegative = true;
          leave.negativeBalanceAmount = Math.abs(remainingBalance);
          
          // Track negative leaves
          leaveBalance.negativeCount += Math.abs(remainingBalance);
          leaveBalance.lastNegativeAdjustment = new Date();
          employee.totalNegativeLeaves += Math.abs(remainingBalance);
        }
        
        leaveBalance.count = remainingBalance;
        await employee.save();
      }

      leave.status = "Approved";
      leave.processedOn = new Date();
      leave.processedBy = req.user?.userId; // Assuming authenticated admin
      leave.comments = reason || "Approved by admin";
      
      await leave.save();
      res.status(200).json({ 
        message: "Leave approved successfully",
        resultedInNegative: leave.resultedInNegative,
        negativeBalance: leave.negativeBalanceAmount
      });

    } else if (action === 'reject') {
      leave.status = "Rejected";
      leave.processedOn = new Date();
      leave.processedBy = req.user?.userId;
      leave.rejectionReason = reason || "Rejected by admin";
      await leave.save();
      res.status(200).json({ message: "Leave rejected successfully" });
    } else {
      res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    console.error("Error processing leave:", {
      error: error.message,
      stack: error.stack,
      leaveId: req.params.leaveId,
      action: req.body.action
    });
    res.status(500).json({ error: "Failed to process leave" });
  }
});

// Get pending leaves
router.get("/pending/:instituteId", async (req, res) => {
  try {
    const pendingLeaves = await LeaveApplication.find({
      instituteId: req.params.instituteId,
      status: "Pending"
    });

    const detailedLeaves = await Promise.all(pendingLeaves.map(async (leave) => {
      let user = await Teacher.findOne({ teacherId: leave.teacherId });
      let role = "teacher";

      if (!user) {
        user = await Admin.findOne({ adminId: leave.teacherId });
        role = "admin";
      }

      const employee = await EmployeeMeta.findOne({ userId: leave.teacherId });
      const leaveBalance = employee?.leaves.find(l => l.type === leave.leaveType);

      return {
        ...leave._doc,
        userInfo: {
          name: user?.name || "N/A",
          email: user?.email || "N/A",
          role
        },
        leaveBalances: employee?.leaves || [],
        salary: employee?.monthlySalary || 0,
        // Calculate available balance for this leave type
        availableBalance: leaveBalance?.count || 0,
        // Flag if this application would result in negative balance
        willResultInNegative: leave.leaveType !== "Academic" && 
                             leaveBalance && 
                             (leaveBalance.count - leave.dates.length < 0),
        negativeAmount: leave.leaveType !== "Academic" && 
                       leaveBalance ? 
                       Math.max(0, leave.dates.length - leaveBalance.count) : 0
      };
    }));

    res.status(200).json(detailedLeaves);
  } catch (error) {
    console.error("Error fetching pending leaves:", {
      error: error.message,
      instituteId: req.params.instituteId
    });
    res.status(500).json({ error: "Failed to fetch pending leaves" });
  }
});

module.exports = router;