const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
    instituteId: { type: String, ref: "Institute", required: true },
    adminId: { type: String, ref: "Admin", required: true },
    plan: { type: String, required: true },
    planDuration: { type: String, required: true },
    status: { type: String, enum: ["Active", "Expired", "Pending" , "Upcoming"], default: "Active" },
    planStartDate: { type: Date, required: true },
    planExpiryDate: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Subscription", SubscriptionSchema);
