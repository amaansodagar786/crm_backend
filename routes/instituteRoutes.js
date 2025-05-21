const express = require("express");
const router = express.Router();
const Institute = require("../models/Institute");
const MainAdmin = require("../models/MainAdmin");  
const Subscription = require("../models/Subscription");



// @route   POST /api/institutes/add
// @desc    Add a new institute and link it to an admin
// @access  Public (Later, restrict based on authentication)
router.post("/add", async (req, res) => {
    try {
        const { instituteName, address, adminId } = req.body; // Accept adminId from request

        // Check if required fields are provided
        if (!instituteName || !address || !adminId) {
            return res.status(400).json({ message: "Institute Name, Address, and Admin ID are required." });
        }

        // Check if the institute already exists
        const existingInstitute = await Institute.findOne({ instituteName });
        if (existingInstitute) {
            return res.status(400).json({ message: "Institute already exists." });
        }

        // Create new institute linked to admin
        const newInstitute = new Institute({
            instituteName,
            address,
            plan: "pending",
            planDuration: "pending",
            instituteId: `INST-${Date.now()}`,
            status: "pending",
            planStartDate: null,
            planExpiryDate: null,
            adminId, // Link the institute to the admin
        });

        await newInstitute.save();
        res.status(201).json({ message: "Institute added successfully!", institute: newInstitute });
    } catch (error) {
        console.error("Error adding institute:", error);
        res.status(500).json({ message: "Server Error. Please try again later." });
    }
});


router.get("/:adminId", async (req, res) => {
  try {
      const { adminId } = req.params;

      if (!adminId) {
          return res.status(400).json({ message: "Admin ID is required." });
      }

      const institutes = await Institute.find({ adminId });

      if (!institutes.length) {
          return res.status(404).json({ message: "No institutes found for this admin." });
      }

      res.status(200).json(institutes);
  } catch (error) {
      console.error("Error fetching institutes:", error);
      res.status(500).json({ message: "Server Error. Please try again later." });
  }
});



router.get("/details/:instituteId", async (req, res) => {
    try {
        const { instituteId } = req.params;
        const adminId = req.query.adminId; // Admin ID from query param (passed from frontend)

        if (!instituteId || !adminId) {
            return res.status(400).json({ message: "Institute ID and Admin ID are required." });
        }

        // Find the institute linked with the admin
        const institute = await Institute.findOne({ instituteId, adminId });

        if (!institute) {
            return res.status(404).json({ message: "Institute not found or unauthorized access." });
        }

        res.status(200).json(institute);
    } catch (error) {
        console.error("Error fetching institute details:", error);
        res.status(500).json({ message: "Server Error. Please try again later." });
    }
});


router.put("/update/:instituteId", async (req, res) => {
    try {
        console.log("Received update request:", req.body);
        const { instituteId } = req.params;
        const { instituteName, address, adminId } = req.body; // Updated details + Admin ID for verification

        if (!instituteId || !adminId || !instituteName || !address) {
            console.log("Missing required fields");
            return res.status(400).json({ message: "All fields are required." });
        }

        // Find the institute and verify admin ownership
        let institute = await Institute.findOne({ instituteId, adminId });
        console.log("Found institute:", institute);

        if (!institute) {
            console.log("Institute not found or unauthorized access");
            return res.status(404).json({ message: "Institute not found or unauthorized access." });
        }

        // Update details
        institute.instituteName = instituteName;
        institute.address = address;
        institute.updatedAt = new Date();

        await institute.save();
        console.log("Updated institute details successfully");

        res.status(200).json({ message: "Institute updated successfully!", institute });
    } catch (error) {
        console.error("Error updating institute:", error);
        res.status(500).json({ message: "Server Error. Please try again later." });
    }
});


// Get Institute & Admin Details by Admin ID
router.get("/admin/:instituteId", async (req, res) => {
    try {
        const { instituteId } = req.params; // ✅ Correct

        // Fetch institute details based on instituteId
        const institute = await Institute.findOne({ instituteId });

        if (!institute) {
            return res.status(404).json({ message: "Institute not found" });
        }

        // Fetch admin details using institute's `adminId`
        const admin = await MainAdmin.findOne({ adminId: institute.adminId });

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        res.json({
            instituteName: institute.instituteName,
            adminName: admin.name,
        });
    } catch (error) {
        console.error("Error fetching institute and admin details:", error);
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/subscription-details/:instituteId", async (req, res) => {
    try {
        const { instituteId } = req.params;

        if (!instituteId) {
            return res.status(400).json({ message: "Institute ID is required" });
        }

        // Fetch the latest active or expired subscription
        const currentSubscription = await Subscription.findOne({
            instituteId,
            status: { $in: ["Active", "Expired"] },
        }).sort({ planStartDate: -1 });

        // Check if the institute has an upcoming subscription
        const upcomingSubscription = await Subscription.findOne({
            instituteId,
            status: "Upcoming",
        });

        res.status(200).json({
            message: "Subscription details retrieved successfully",
            data: {
                currentSubscription,
                hasUpcomingPlan: !!upcomingSubscription, // Boolean flag
                upcomingPlanDetails: upcomingSubscription || null,
            },
        });

    } catch (error) {
        console.error("Error fetching subscription details:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


router.delete("/delete/:instituteId", async (req, res) => {
    try {
        const { instituteId } = req.params;
        
        if (!instituteId) {
            return res.status(400).json({ message: "Institute ID is required." });
        }

        // Delete the institute
        const deletedInstitute = await Institute.findOneAndDelete({ instituteId });
        if (!deletedInstitute) {
            return res.status(404).json({ message: "Institute not found." });
        }

        // Delete related subscriptions
        await Subscription.deleteMany({ instituteId });

        res.status(200).json({ message: "Institute and related data deleted successfully." });
    } catch (error) {
        console.error("Error deleting institute:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

module.exports = router;
