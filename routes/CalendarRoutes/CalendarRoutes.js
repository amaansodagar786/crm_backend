// 📁 File: backend/routes/calendarRoutes.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const Calendar = require("../../models/SemesterCalendar/Calendar");
require('dotenv').config();

// Fetch public holidays from Google Calendar API
router.get("/holidays", async (req, res) => {
    console.log("Api Key", process.env.GOOGLE_CALENDAR_API_KEY);
  const { start, end } = req.query;
  try {
    const calendarId = "en.indian%23holiday%40group.v.calendar.google.com";
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&timeMin=${start}T00:00:00Z&timeMax=${end}T23:59:59Z&singleEvents=true&orderBy=startTime`;

    const response = await axios.get(url);
    const holidays = response.data.items.map((event) => ({
      date: event.start.date,
      name: event.summary,
    }));

    res.json(holidays);
  } catch (error) {
    console.error("Error fetching holidays", error);
    res.status(500).json({ error: "Failed to fetch holidays" });
  }
});

// Save institute calendar

// Updated save endpoint
// Updated save endpoint
router.post("/:instituteId/save", async (req, res) => {
  const { instituteId } = req.params;
  const { semesterStart, semesterEnd, calendar } = req.body;
  
  try {
    // Validate calendar data
    if (!Array.isArray(calendar)) {
      return res.status(400).json({ error: "Calendar data must be an array" });
    }

    // First try to find any existing overlapping calendar
    const existingCalendar = await Calendar.findOne({
      instituteId,
      $or: [
        { semesterStart: { $lte: semesterEnd }, semesterEnd: { $gte: semesterStart } },
        { semesterStart: { $gte: semesterStart }, semesterEnd: { $lte: semesterEnd } }
      ]
    });

    // Prepare the update object
    const updateData = {
      semesterStart: existingCalendar 
        ? new Date(Math.min(new Date(semesterStart), new Date(existingCalendar.semesterStart)))
        : new Date(semesterStart),
      semesterEnd: existingCalendar 
        ? new Date(Math.max(new Date(semesterEnd), new Date(existingCalendar.semesterEnd)))
        : new Date(semesterEnd),
      calendar,
      updatedAt: Date.now()
    };

    // Perform the update or insert
    const result = await Calendar.findOneAndUpdate(
      { 
        instituteId,
        $or: [
          { semesterStart: { $lte: semesterEnd }, semesterEnd: { $gte: semesterStart } },
          { semesterStart: { $gte: semesterStart }, semesterEnd: { $lte: semesterEnd } }
        ]
      },
      { $set: updateData },
      { 
        upsert: true,
        new: true,
        setDefaultsOnInsert: true 
      }
    );

    res.json({ 
      success: true,
      message: "Calendar saved successfully",
      calendarId: result._id
    });
  } catch (error) {
    console.error("Error saving calendar", error);
    res.status(500).json({ error: "Failed to save calendar" });
  }
});



// Load institute calendar
router.get("/:instituteId/load", async (req, res) => {
  const { instituteId } = req.params;
  const { semesterStart, semesterEnd } = req.query;

  try {
    const calendar = await Calendar.findOne({
      instituteId,
      semesterStart,
      semesterEnd
    });

    res.json(calendar || { calendar: [] }); // Return empty array if not found
  } catch (error) {
    console.error("Error loading calendar", error);
    res.status(500).json({ error: "Failed to load calendar" });
  }
});


// Get all calendars for institute (NEW ROUTE)
router.get("/:instituteId/all", async (req, res) => {
  try {
    const calendars = await Calendar.find({ instituteId: req.params.instituteId });
    res.json(calendars);
  } catch (error) {
    console.error("Error fetching calendars", error);
    res.status(500).json({ error: "Failed to fetch calendars" });
  }
});


module.exports = router;