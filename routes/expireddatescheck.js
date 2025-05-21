const cron = require("node-cron");
const Institute = require("../models/Institute");
const Subscription = require("../models/Subscription");

const startCronJob = () => {
    // Schedule a cron job to run every 5 minutes for testing (change to "0 0 * * *" for daily at midnight)
    cron.schedule("*/30 * * * *", async () => {
        console.log("🔄 Running Subscription Cron Job...");

        try {
            const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
    
            // 1. Update expired subscriptions first
            const expiredSubscriptions = await Subscription.find({
                planExpiryDate: { $lt: nowIST },
                status: { $in: ["Active", "Upcoming"] }
            });
    
            for (const sub of expiredSubscriptions) {
                // Update subscription status
                sub.status = "Expired";
                await sub.save();
    
                // Update institute status only if no active subscriptions remain
                const activeSubs = await Subscription.countDocuments({
                    instituteId: sub.instituteId,
                    status: "Active"
                });
    
                if (activeSubs === 0) {
                    await Institute.findOneAndUpdate(
                        { instituteId: sub.instituteId },
                        { status: "Inactive" }
                    );
                    console.log(`Institute ${sub.instituteId} marked inactive`);
                }
            }
    
            // 2. Activate upcoming subscriptions when start date arrives
            const upcomingSubs = await Subscription.find({
                planStartDate: { $lte: nowIST },
                status: "Upcoming"
            });
    
            for (const sub of upcomingSubs) {
                sub.status = "Active";
                await sub.save();
    
                await Institute.findOneAndUpdate(
                    { instituteId: sub.instituteId },
                    {
                        status: "Active",
                        plan: sub.plan,
                        planDuration: sub.planDuration,
                        planStartDate: sub.planStartDate,
                        planExpiryDate: sub.planExpiryDate
                    }
                );
            }
    
        } catch (error) {
            console.error("Cron job error:", error);
        }
    });
};

// ✅ Ensure it's exported correctly
module.exports = { startCronJob };
