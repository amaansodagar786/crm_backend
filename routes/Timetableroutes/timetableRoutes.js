// routes/timetableRoutes.js
const express = require('express');
const router = express.Router();
const Timetable = require('../../models/Timetable/Timetable');
const Class = require('../../models/Classes/Class');
const Teacher = require('../../models/Users/Teacher');


// Helper function to update teacher assignments
async function updateTeacherAssignments(timetableData) {
  const { classId, divisionId, instituteId, days } = timetableData;

  // Get all unique teacher IDs from the timetable (excluding breaks)
  const teacherIds = [];
  days.forEach(day => {
    if (day.type === 'regular' && day.subjects) {
      day.subjects.forEach(subject => {
        if (!subject.isBreak && subject.teacherId && !teacherIds.includes(subject.teacherId)) {
          teacherIds.push(subject.teacherId);
        }
      });
    }
  });

  // Update each teacher's assignedClasses
  for (const teacherId of teacherIds) {
    try {
      // First try to find if the teacher already has this class assigned
      const teacher = await Teacher.findOne({
        teacherId,
        "assignedClasses.classId": classId
      });

      if (teacher) {
        // Class exists, update the divisionIds
        await Teacher.updateOne(
          { 
            teacherId,
            "assignedClasses.classId": classId
          },
          {
            $addToSet: {
              "assignedClasses.$.divisionIds": divisionId
            }
          }
        );
      } else {
        // Class doesn't exist, add new entry
        await Teacher.updateOne(
          { teacherId },
          {
            $push: {
              assignedClasses: {
                classId,
                divisionIds: [divisionId]
              }
            }
          },
          { upsert: true }
        );
      }
    } catch (error) {
      console.error(`Error updating teacher ${teacherId}:`, error);
      // Continue with next teacher even if one fails
    }
  }
}
// Get all classes for an institute
router.get('/classes/:instituteId', async (req, res) => {
  try {
    const classes = await Class.find({ instituteId: req.params.instituteId });
    res.status(200).json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get divisions for a class
router.get('/divisions/:classId', async (req, res) => {
  try {
    const classData = await Class.findOne({ classId: req.params.classId });
    res.status(200).json(classData.divisions);
  } catch (error) {
    console.error('Error fetching divisions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all subjects for a class
router.get('/subjects/:classId', async (req, res) => {
  try {
    const classData = await Class.findOne({ classId: req.params.classId });
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.status(200).json(classData.subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all teachers for an institute
router.get('/teachers/:instituteId', async (req, res) => {
  try {
    const teachers = await Teacher.find({ instituteId: req.params.instituteId });
    res.status(200).json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/create', async (req, res) => {
  try {
    // Validate the request body
    const { classId, divisionId, instituteId, days } = req.body;
    
    if (!classId || !divisionId || !instituteId || !days) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate each day's structure
    for (const day of days) {
      if (!day.day || !day.type) {
        return res.status(400).json({ message: 'Each day must have a day name and type' });
      }

      if (day.type === 'regular' && day.subjects) {
        for (const subject of day.subjects) {
          if (!subject.startTime || !subject.endTime) {
            return res.status(400).json({ message: 'All periods must have start and end times' });
          }

          if (!subject.isBreak && (!subject.subjectName || !subject.teacherId)) {
            return res.status(400).json({ message: 'All non-break periods must have a subject and teacher' });
          }
        }
      }
    }

    const newTimetable = new Timetable({
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Save timetable first
    await newTimetable.save();

    // Update teacher assignments
    await updateTeacherAssignments(req.body);

    res.status(201).json({ 
      message: 'Timetable created successfully! Teachers have been assigned.', 
      timetableId: newTimetable.timetableId 
    });
  } catch (error) {
    console.error('Error creating timetable:', error);
    res.status(500).json({ message: 'Failed to create timetable', error: error.message });
  }
});

router.put('/update/:timetableId', async (req, res) => {
  try {
    // Validate the request body
    const { days } = req.body;
    
    if (days) {
      for (const day of days) {
        if (!day.day || !day.type) {
          return res.status(400).json({ message: 'Each day must have a day name and type' });
        }

        if (day.type === 'regular' && day.subjects) {
          for (const subject of day.subjects) {
            if (!subject.startTime || !subject.endTime) {
              return res.status(400).json({ message: 'All periods must have start and end times' });
            }

            if (!subject.isBreak && (!subject.subjectName || !subject.teacherId)) {
              return res.status(400).json({ message: 'All non-break periods must have a subject and teacher' });
            }
          }
        }
      }
    }

    const updatedTimetable = await Timetable.findOneAndUpdate(
      { timetableId: req.params.timetableId },
      { 
        $set: { 
          ...req.body,
          updatedAt: new Date() 
        } 
      },
      { new: true, runValidators: true }
    );

    if (!updatedTimetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }

    // Update teacher assignments
    await updateTeacherAssignments(req.body);

    res.status(200).json({ 
      message: 'Timetable updated successfully. Teacher assignments updated.', 
      updatedTimetable 
    });
  } catch (error) {
    console.error('Error updating timetable:', error);
    res.status(500).json({ message: 'Failed to update timetable', error: error.message });
  }
});

// Update the showtimetable route to handle breaks
router.get('/showtimetable/:instituteId', async (req, res) => {
  try {
    const timetables = await Timetable.find({ instituteId: req.params.instituteId }).lean();

    const timetablesWithDetails = await Promise.all(
      timetables.map(async (timetable) => {
        const classData = await Class.findOne({ classId: timetable.classId }).lean();
        const divisionData = classData?.divisions?.find((div) => div.divisionId === timetable.divisionId);

        // Fetch all teacher names in one go (excluding breaks)
        const teacherIds = timetable.days.flatMap(day =>
          day.subjects?.filter(sub => !sub.isBreak).map(sub => sub.teacherId) || []
        );

        const teachers = await Teacher.find({ teacherId: { $in: teacherIds } }).lean();
        const teacherMap = teachers.reduce((map, teacher) => {
          map[teacher.teacherId] = teacher.name;
          return map;
        }, {});

        // Map through days and subjects
        const days = timetable.days.map(day => ({
          ...day,
          subjects: day.subjects?.map(sub => ({
            ...sub,
            teacherName: sub.isBreak ? 'Break' : (teacherMap[sub.teacherId] || 'N/A')
          })) || []
        }));

        return {
          ...timetable,
          className: classData?.className || 'N/A',
          divisionName: divisionData?.divisionName || 'N/A',
          days
        };
      })
    );

    res.status(200).json(timetablesWithDetails);
  } catch (error) {
    console.error('Error fetching timetables:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});


// Delete a timetable
router.delete('/delete/:timetableId', async (req, res) => {
  try {
    const deletedTimetable = await Timetable.findOneAndDelete({ timetableId: req.params.timetableId });
    if (!deletedTimetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    res.status(200).json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    console.error('Error deleting timetable:', error);
    res.status(500).json({ message: 'Failed to delete timetable' });
  }
});


// Get timetable by class and division
router.get('/student-timetable/:instituteId/:classId/:divisionId', async (req, res) => {
  try {
    const { instituteId, classId, divisionId } = req.params;

    // First check if classId and divisionId are provided
    if (!classId || !divisionId) {
      return res.status(400).json({
        message: 'Class and division information is missing'
      });
    }

    // Find timetable matching the criteria
    const timetable = await Timetable.findOne({
      instituteId,
      classId,
      divisionId
    }).lean();

    if (!timetable) {
      return res.status(404).json({
        message: 'Timetable not found for this class and division'
      });
    }

    // Get class and division details
    const classData = await Class.findOne({ classId }).lean();
    const divisionData = classData?.divisions?.find(div => div.divisionId === divisionId);

    // Get teacher names
    const teacherIds = timetable.days.flatMap(day =>
      day.subjects?.filter(sub => !sub.isBreak).map(sub => sub.teacherId) || []
    );

    const teachers = await Teacher.find({ teacherId: { $in: teacherIds } }).lean();
    const teacherMap = teachers.reduce((map, teacher) => {
      map[teacher.teacherId] = teacher.name;
      return map;
    }, {});

    // Format days with teacher names
    const days = timetable.days.map(day => ({
      ...day,
      subjects: day.subjects?.map(sub => ({
        ...sub,
        teacherName: sub.isBreak ? 'Break' : (teacherMap[sub.teacherId] || 'N/A')
      })) || []
    }));

    res.status(200).json({
      ...timetable,
      className: classData?.className || 'N/A',
      divisionName: divisionData?.divisionName || 'N/A',
      days
    });

  } catch (error) {
    console.error('Error fetching student timetable:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/teacher-timetable/:instituteId/:teacherId', async (req, res) => {
  try {
    const { instituteId, teacherId } = req.params;

    // First get the teacher's assigned classes and divisions
    const teacher = await Teacher.findOne({ 
      instituteId, 
      teacherId 
    }).lean();

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }


    // If no assigned classes, return empty array
    if (!teacher.assignedClasses || teacher.assignedClasses.length === 0) {
      return res.status(200).json([]);
    }

    // Fetch all timetables for the teacher's assigned classes/divisions
    const timetablePromises = teacher.assignedClasses.flatMap(cls => 
      cls.divisionIds.map(divisionId => 
        Timetable.findOne({
          instituteId,
          classId: cls.classId,
          divisionId
        }).lean()
      )
    );

    const rawTimetables = await Promise.all(timetablePromises);
    const timetables = rawTimetables.filter(t => t !== null);

    // Enrich timetable data with class/division names and highlight teacher's lectures
    const enrichedTimetables = await Promise.all(
      timetables.map(async timetable => {
        const classData = await Class.findOne({ classId: timetable.classId }).lean();
        const divisionData = classData?.divisions?.find(div => div.divisionId === timetable.divisionId);

        // Process days to highlight teacher's lectures
        const days = timetable.days.map(day => {
          if (day.type !== 'regular' || !day.subjects) return day;
          
          const subjects = day.subjects.map(subject => ({
            ...subject,
            isTeacherLecture: !subject.isBreak && subject.teacherId === teacherId
          }));
          
          return { ...day, subjects };
        });

        return {
          ...timetable,
          className: classData?.className || 'N/A',
          divisionName: divisionData?.divisionName || 'N/A',
          days
        };
      })
    );

    res.status(200).json(enrichedTimetables);
  } catch (error) {
    console.error('Error fetching teacher timetable:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;