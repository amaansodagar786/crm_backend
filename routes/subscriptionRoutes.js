const express = require("express");
const router = express.Router();
const Institute = require("../models/Institute");
const Subscription = require("../models/Subscription");

router.post("/save", async (req, res) => {
    try {
      const { instituteId, adminId, plan, planDuration } = req.body;
  
      if (!instituteId || !adminId || !plan || !planDuration) {
        return res.status(400).json({ message: "Missing required fields" });
      }
  
      // Check institute existence
      const institute = await Institute.findOne({ instituteId });
      if (!institute) {
        return res.status(404).json({ message: "Institute not found" });
      }
  
      // Check for active plan
      const activePlan = await Subscription.findOne({ instituteId, status: "Active" });
  
      // Determine subscription status
      const status = activePlan ? "Upcoming" : "Active";
  
      // Convert current date to IST
      const nowUTC = new Date();
      const nowIST = new Date(nowUTC.getTime() + 5.5 * 60 * 60 * 1000);
  
      // Set planStartDate: If there's an active plan, the new plan starts after it ends
      const planStartDate = activePlan ? activePlan.planExpiryDate : nowIST;
  
      // Calculate expiry date based on planDuration (in months)
      const planExpiryDate = new Date(planStartDate);
      const durationMatch = planDuration.match(/^(\d+)M$/);
  
      if (durationMatch) {
        const monthsToAdd = parseInt(durationMatch[1], 10);
        planExpiryDate.setMonth(planExpiryDate.getMonth() + monthsToAdd);
      } else {
        return res.status(400).json({ message: "Invalid plan duration format. Use '1M', '3M', '6M', '12M'." });
      }
  
      // Create new subscription
      const newSubscription = new Subscription({
        instituteId,
        adminId,
        plan,
        planDuration,
        status,
        planStartDate,
        planExpiryDate,
      });
  
      await newSubscription.save();
  
      // Update Institute ONLY if it's a new activation (not renewal)
      if (!activePlan) {
        await Institute.findOneAndUpdate(
          { instituteId },
          {
            plan,
            planDuration,
            status: "Active",
            planStartDate,
            planExpiryDate,
            updatedAt: new Date(),
          },
          { new: true }
        );
      }
  
      res.status(200).json({
        message: activePlan
          ? "Renewal plan saved successfully. It will activate after the current plan expires."
          : "New subscription activated successfully",
        data: newSubscription,
      });
    } catch (error) {
      console.error("Payment processing error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });



// Get subscription details by instituteId

router.get("/history/:instituteId", async (req, res) => {
    try {
        const { instituteId } = req.params;

        if (!instituteId) {
            return res.status(400).json({ message: "Institute ID is required" });
        }

        // Find all subscriptions linked to this institute
        const subscriptionHistory = await Subscription.find({ instituteId }).sort({ planStartDate: -1 });

        if (!subscriptionHistory.length) {
            return res.status(404).json({ message: "No subscription history found" });
        }

        res.status(200).json({ message: "Subscription history retrieved successfully", data: subscriptionHistory });
    } catch (error) {
        console.error("Error fetching subscription history:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});




module.exports = router;


