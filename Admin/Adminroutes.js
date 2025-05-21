const express = require("express");
const router = express.Router();
const Owner = require("./Owner");
const Subscription = require("../models/Subscription");
const MainAdmin = require("../models/MainAdmin");
const Institute = require("../models/Institute");



const jwt = require("jsonwebtoken");
require("dotenv").config();
const bcrypt = require("bcrypt");


const JWT_SECRET = process.env.JWT_SECRET;

// Admin Login Route
router.post("/login", async (req, res) => {
    try {
        const { adminId, password } = req.body;

        // Check if admin exists
        const admin = await Owner.findOne({ adminId });
        if (!admin) {
            return res.status(401).json({ message: "Invalid Credentials" });
        }

        // Compare hashed password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid Credentials" });
        }

        // Generate JWT Token
        const token = jwt.sign({ adminId: admin.adminId }, JWT_SECRET, { expiresIn: "1h" });

        res.status(200).json({ message: "Login Successful", token });
    } catch (error) {
        console.error("Admin Login Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});



// Admin Registration (One-Time Setup)
router.post("/setup", async (req, res) => {
    try {
        const { adminId, password } = req.body;

        // Check if admin already exists
        const existingAdmin = await Admin.findOne();
        if (existingAdmin) {
            return res.status(403).json({ message: "Admin already registered!" });
        }

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create and save admin
        const newAdmin = new Admin({ adminId, password: hashedPassword });
        await newAdmin.save();

        res.status(201).json({ message: "Admin registered successfully!" });
    } catch (error) {
        console.error("Admin Registration Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


// Get all MainAdmins
router.get("/mainadmins", async (req, res) => {
    try {
        const mainAdmins = await MainAdmin.find().select("-password");
        res.status(200).json(mainAdmins); // Explicitly set status code
    } catch (error) {
        console.error("Error fetching MainAdmins:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// Get single MainAdmin
router.get("/mainadmins/:id", async (req, res) => {
    try {
        const mainAdmin = await MainAdmin.findById(req.params.id).select("-password");
        if (!mainAdmin) {
            return res.status(404).json({ message: "MainAdmin not found" });
        }

        const institutes = await Institute.find({ adminId: mainAdmin.adminId });
        res.status(200).json({ ...mainAdmin.toObject(), institutes });
    } catch (error) {
        console.error("Error fetching MainAdmin:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});






// router.get("/institutes/:id", async (req, res) => {
//     try {
//         const institute = await Institute.findById(req.params.id);
//         if (!institute) {
//             return res.status(404).json({ message: "Institute not found" });
//         }

//         // Fetch MainAdmin details
//         const mainAdmin = await MainAdmin.findOne({ adminId: institute.adminId }).select("name email");

//         res.status(200).json({
//             ...institute.toObject(),
//             mainAdmin: mainAdmin || null, // Attach MainAdmin details
//         });
//     } catch (error) {
//         console.error("Error fetching institute:", error);
//         res.status(500).json({ message: "Server error", error: error.message });
//     }
// });



router.get("/institutes/:id", async (req, res) => {
    try {
        const institute = await Institute.findById(req.params.id);
        if (!institute) {
            return res.status(404).json({ message: "Institute not found" });
        }

        // Fetch MainAdmin details
        const mainAdmin = await MainAdmin.findOne({ adminId: institute.adminId }).select("name email");

        // Fetch subscription details for the institute
        const subscriptions = await Subscription.find({ instituteId: institute.instituteId }).sort({ planStartDate: -1 });
        console.log("Subscriptions for institute:", subscriptions); // Log subscriptions

        res.status(200).json({
            ...institute.toObject(),
            mainAdmin: mainAdmin || null, // Attach MainAdmin details
            subscriptions, // Attach subscription plans
        });
    } catch (error) {
        console.error("Error fetching institute:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});





// Updated Institutes Route (replace both existing /institutes routes with this)
router.get("/institutes", async (req, res) => {
    try {
        const { adminId } = req.query;
        console.log("Fetching institutes for adminId:", adminId); // Log the adminId

        const filter = adminId ? { adminId } : {}; // Filter by adminId if provided
        console.log("Filter:", filter); // Log the filter

        const institutes = await Institute.find(filter).sort({ createdAt: -1 });
        console.log("Institutes found:", institutes); // Log the institutes

        // Fetch MainAdmin details for each institute
        const institutesWithAdmin = await Promise.all(
            institutes.map(async (institute) => {
                const mainAdmin = await MainAdmin.findOne({ adminId: institute.adminId }).select("name email");
                return {
                    ...institute.toObject(),
                    mainAdmin: mainAdmin || null,
                };
            })
        );

        res.status(200).json(institutesWithAdmin);
    } catch (error) {
        console.error("Error fetching institutes:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


module.exports = router;
