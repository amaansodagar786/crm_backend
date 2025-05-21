const express = require("express");
const router = express.Router();
const Class = require("../models/Classes/Class");
const Student = require('../models/Users/Student');
const Institute = require("../models/Institute");


// Create a New Class
router.post("/create-class", async (req, res) => {
  const { className, instituteId, divisions, subjects } = req.body;

  if (!className || !instituteId || !divisions?.length || !subjects?.length) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if class with same name already exists for this institute
    const existingClass = await Class.findOne({ 
      className,
      instituteId 
    });

    if (existingClass) {
      return res.status(400).json({ 
        message: "Class with this name already exists. Please choose a different name." 
      });
    }

    // Create divisions with unique IDs
    const formattedDivisions = divisions.map((divisionName) => ({
      divisionId: `DIV_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      divisionName,
    }));

    // Create subjects with unique IDs
    const formattedSubjects = subjects.map((subjectName) => ({
      subjectId: `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      subjectName,
    }));

    // Create a new class
    const newClass = new Class({
      className,
      instituteId,
      divisions: formattedDivisions,
      subjects: formattedSubjects,
    });

    await newClass.save();
    res.status(201).json({ message: "Class created successfully", newClass });
  } catch (error) {
    console.error("Error creating class:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get all classes for a specific institute
router.get('/get-classes/:instituteId', async (req, res) => {
  try {
    const { instituteId } = req.params;
    console.log(`[GET /get-classes] Fetching classes for instituteId: ${instituteId}`);
    const classes = await Class.find({ instituteId });
    console.log(`[GET /get-classes] Found ${classes.length} classes`);
    res.status(200).json(classes);
  } catch (error) {
    console.error('[GET /get-classes] Error fetching classes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all students for an institute
router.get('/students/:instituteId', async (req, res) => {
  try {
    const { instituteId } = req.params;
    console.log(`[GET /students] Fetching students for instituteId: ${instituteId}`);
    
    const students = await Student.find({ instituteId })
      .populate('instituteId', 'instituteName') // Populate institute details if needed
      .sort({ createdAt: -1 }); // Sort by newest first
    
    console.log(`[GET /students] Found ${students.length} students`);
    console.log('[GET /students] Sample student:', students.length > 0 ? students[0] : 'No students found');

    if (!students.length) {
      console.log('[GET /students] No students found in database');
      return res.status(200).json([]); // Return empty array instead of 404
    }

    // Format students data for response
    const formattedStudents = students.map(student => ({
      studentId: student.studentId,
      name: student.name,
      email: student.email,
      phoneNo: student.phoneNo,
      instituteId: student.instituteId,
      instituteName: student.instituteId?.instituteName || 'Unknown Institute',
      classId: student.classId,
      divId: student.divId,
      rollNo: student.rollNo,
      createdAt: student.createdAt
    }));

    res.status(200).json(formattedStudents);
  } catch (error) {
    console.error('[GET /students] Error fetching students:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all classes for an institute
router.get('/classes/:instituteId', async (req, res) => {
  try {
    const { instituteId } = req.params;
    console.log(`[GET /classes] Fetching classes for instituteId: ${instituteId}`);
    const classes = await Class.find({ instituteId });
    console.log(`[GET /classes] Found ${classes.length} classes`);

    if (!classes.length) {
      console.log('[GET /classes] No classes found in database');
      return res.status(200).json([]); // Return empty array instead of 404
    }

    res.status(200).json(classes);
  } catch (error) {
    console.error('[GET /classes] Error fetching classes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get divisions for a class
router.get('/divisions/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    console.log(`[GET /divisions] Fetching divisions for classId: ${classId}`);
    const classData = await Class.findOne({ classId });

    if (!classData) {
      console.log('[GET /divisions] Class not found');
      return res.status(404).json({ message: 'Class not found' });
    }

    console.log(`[GET /divisions] Found ${classData.divisions.length} divisions`);
    res.status(200).json(classData.divisions);
  } catch (error) {
    console.error('[GET /divisions] Error fetching divisions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update student details
router.put('/students/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { classId, divId, rollNo } = req.body;
    
    console.log(`[PUT /students] Updating student ${studentId} with data:`, {
      classId, divId, rollNo
    });

    const student = await Student.findOneAndUpdate(
      { studentId },
      { classId, divId, rollNo },
      { new: true }
    );

    if (!student) {
      console.log(`[PUT /students] Student ${studentId} not found`);
      return res.status(404).json({ message: 'Student not found' });
    }

    console.log(`[PUT /students] Successfully updated student ${studentId}`);
    res.status(200).json(student);
  } catch (error) {
    console.error('[PUT /students] Error updating student:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;