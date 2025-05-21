// Backend (Express)
const express = require('express');
const router = express.Router();
const Student = require('../../models/Users/Student');

// Route to fetch student details
router.get('/:studentId', async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const student = await Student.findOne({ studentId });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.status(200).json(student);
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/:studentId', async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const updatedData = req.body;

    // Prevent updating classId, divId, and rollNo
    delete updatedData._id; // Remove _id field
    delete updatedData.classId;
    delete updatedData.divId;
    delete updatedData.rollNo;

    const student = await Student.findOneAndUpdate(
      { studentId },
      { $set: updatedData },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.status(200).json(student);
  } catch (error) {
    console.error('Error updating student details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;