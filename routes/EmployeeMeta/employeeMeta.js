const express = require("express");
const router = express.Router();
const EmployeeMeta = require("../../models/SalaryLeaveAccess/EmployeeMeta");
const Teacher = require("../../models/Users/Teacher");
const Admin = require("../../models/Users/Admin");

// Get all faculty (teachers and admins) for an institute
router.get("/faculty/:instituteId", async (req, res) => {
  try {
    const teachers = await Teacher.find({ instituteId: req.params.instituteId });
    const admins = await Admin.find({ instituteId: req.params.instituteId });

    const faculty = [
      ...teachers.map(t => ({ ...t._doc, role: "teacher" })),
      ...admins.map(a => ({ ...a._doc, role: "admin" }))
    ];

    res.status(200).json(faculty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get or create employee meta
router.get("/meta/:userId", async (req, res) => {
  try {
    let meta = await EmployeeMeta.findOne({ userId: req.params.userId });

    if (!meta) {
      // Create default meta if doesn't exist
      meta = new EmployeeMeta({
        userId: req.params.userId,
        role: req.query.role,
        instituteId: req.query.instituteId,
        monthlySalary: 0,
        leaves: [],
        accessRights: []
      });
      await meta.save();
    }

    res.status(200).json(meta);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update employee meta (salary, leaves, access)
// Updated employeeMeta routes
router.put("/meta/:metaId", async (req, res) => {
  console.log('PUT /meta request received', {
    params: req.params,
    body: req.body
  });

  try {
    const { monthlySalary, leaves, accessRights } = req.body;

    console.log('Updating employee meta with:', {
      monthlySalary,
      leaves,
      accessRights
    });

    const updatedMeta = await EmployeeMeta.findOneAndUpdate(
      { metaId: req.params.metaId }, // Query by metaId instead of _id
      {
        monthlySalary,
        leaves,
        accessRights,
        updatedAt: new Date()
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedMeta) {
      console.error('Update failed - no document found with id:', req.params.metaId);
      return res.status(404).json({
        success: false,
        message: 'No employee meta found with that ID'
      });
    }

    console.log('Successfully updated employee meta:', updatedMeta);

    res.status(200).json({
      success: true,
      data: updatedMeta
    });
  } catch (error) {
    console.error('Error updating employee meta:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update employee details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;