// 📁 File: backend/models/Calendar.js
const mongoose = require("mongoose");

const calendarSchema = new mongoose.Schema({
  instituteId: {
    type: String,
    required: true,
    ref: 'Institute'
  },
  semesterStart: String,
  semesterEnd: String,
  calendar: {
    type: [{
      date: String,
      type: { 
        type: String,
        enum: ['working_day', 'weekend', 'public_holiday', 'custom_holiday']
      },
      name: String,
    }],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Calendar", calendarSchema);