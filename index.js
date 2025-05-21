const express = require("express");
const connectDB = require("./config/db");
const bodyParser = require("body-parser"); // Import body-parser
const web1auth = require("./routes/auth");
const web2auth = require("./routes/authRoutes");
const instituteRoutes = require("./routes/instituteRoutes"); // ✅ Import this
const subscriptionRoutes = require("./routes/subscriptionRoutes"); // ✅ Import this
const Adminroutes = require("./Admin/Adminroutes"); // ✅ Import this
const Crminstitutes = require("./routes/crminstitutesroutes"); // ✅ Import this
const CrmClass = require("./routes/classRoutes"); // ✅ Import this
const StudentRoutes = require("./routes/StudentRoutes/studentRoutes"); // ✅ Import this
const TimetableRoutes = require("./routes/Timetableroutes/timetableRoutes"); // ✅ Import this
const SemCalenderRoutes = require("./routes/CalendarRoutes/CalendarRoutes"); // ✅ Import this




const Institute = require("./models/Institute");


const cors = require("cors");
const { startCronJob } = require("./routes/expireddatescheck");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json({ limit: '50mb' })); // Increase JSON payload limit to 50MB
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true })); // Increase URL-encoded payload limit to 50MB



// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Database connection
connectDB();

// Auth Routes
app.use("/api", web1auth);
app.use( "/auth", web2auth);

// Institute Routes
app.use("/api/institutes", instituteRoutes);
app.use("/crm", Crminstitutes);

// Payment Route 
app.use("/api/payment", subscriptionRoutes);

// Owner
app.use("/admin", Adminroutes);

// classes
app.use("/crmclass", CrmClass);

//Student Routes 
app.use("/student", StudentRoutes);


//Timetable Routes 
app.use("/timetable", TimetableRoutes);

// Semester Calendar Routes
app.use("/calendar", SemCalenderRoutes);








// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


// Start the cron job
startCronJob();
console.log("Cron job started: Checking for expired plans daily at midnight.");