// 📁 File: backend/routes/calendarRoutes.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const Calendar = require("../../models/SemesterCalendar/Calendar");
require('dotenv').config();

// Fetch public holidays from Google Calendar API
router.get("/holidays", async (req, res) => {
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

router.post("/:instituteId/save", async (req, res) => {
  const { instituteId } = req.params;
  const { semesterStart, semesterEnd, calendar } = req.body;
  
  try {
    // Validate calendar data is an array
    if (!Array.isArray(calendar)) {
      return res.status(400).json({ error: "Calendar data must be an array" });
    }

    // Check if calendar exists for this institute and semester
    let existingCalendar = await Calendar.findOne({ 
      instituteId,
      semesterStart,
      semesterEnd
    });

    if (existingCalendar) {
      // Update existing calendar
      existingCalendar.calendar = calendar;
      existingCalendar.updatedAt = Date.now();
      await existingCalendar.save();
    } else {
      // Create new calendar
      existingCalendar = new Calendar({ 
        instituteId, 
        semesterStart, 
        semesterEnd, 
        calendar 
      });
      await existingCalendar.save();
    }

    res.json({ 
      success: true,
      message: "Calendar saved successfully",
      calendarId: existingCalendar._id
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

    if (!calendar) {
      return res.status(404).json({ error: "Calendar not found" });
    }

    res.json(calendar);
  }