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
  calendar: [
    {
      date: String,
      type: String, // 'working_day', 'weekend', 'public_holiday', 'custom_holiday'
      name: String,
    },
  ],
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