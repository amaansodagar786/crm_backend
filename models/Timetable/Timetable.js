const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const timetableSchema = new mongoose.Schema({
  timetableId: { type: String, default: uuidv4 },
  instituteId: { type: String, required: true },
  classId: { type: String, required: true },
  divisionId: { type: String, required: true },
  createdBy: { type: String, required: true },
  days: {
    type: [
      {
        day: { type: String, required: true },
        type: { type: String, enum: ['regular', 'holiday'], default: 'regular' },
        subjects: {
          type: [
            {
              subjectName: { type: String },
              startTime: { type: String, required: true },
              endTime: { type: String, required: true },
              teacherId: { type: String },
              isBreak: { type: Boolean, default: false }
            }
          ],
          default: []
        }
      }
    ],
    default: []
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});



const Timetable = mongoose.model('Timetable', timetableSchema);
module.exports = Timetable;