const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Database Connection
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://sodagaramaan786:HbiVzsmAJNAm4kg4@cluster0.576stzr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};
connectDB();

// Schemas & Models
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phoneNo: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  instituteName: { type: String, required: true },
  address: { type: String, required: true },
  instituteId: { type: String, required: true },
  role: { type: String, default: "mainadmin" },
});
const User = mongoose.model("User", userSchema);

const instituteSchema = new mongoose.Schema({
  instituteName: { type: String, required: true, unique: true },
  plan: { type: String, required: true },
  planDuration: { type: String, required: true },
  instituteId: { type: String, required: true, unique: true },
  status: { type: String, default: "active" },
  planStartDate: { type: Date, default: Date.now },
  planExpiryDate: { type: Date },
});

// Auto-update status if expired (using minutes for testing)
instituteSchema.pre("find", async function (next) {
  const institutes = await this.model.find(this.getFilter());
  institutes.forEach(async (institute) => {
    if (institute.planExpiryDate < new Date() && institute.status !== "inactive") {
      await institute.updateOne({ status: "inactive" });
    }
  });
  next();
});

const Institute = mongoose.model("Institute", instituteSchema);

// Helper function to generate Institute ID
const generateInstituteId = () => `INST${Math.floor(1000 + Math.random() * 9000)}`;

// Register Route
app.post("/api/register", async (req, res) => {
  const { name, phoneNo, email, password, confirmPassword, instituteName, plan, planDuration, address } = req.body;
  
  try {
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const instituteId = generateInstituteId();
    const planStartDate = new Date();
    let planExpiryDate = new Date();

    switch (planDuration) {
      case "1M":
        planExpiryDate.setMinutes(planStartDate.getMinutes() + 1); // 1 min for testing
        break;
      case "3M":
        planExpiryDate.setMinutes(planStartDate.getMinutes() + 3); // 3 min for testing
        break;
      case "12M":
        planExpiryDate.setMinutes(planStartDate.getMinutes() + 5); // 5 min for testing
        break;
      default:
        planExpiryDate.setMinutes(planStartDate.getMinutes() + 1);
    }

    const newInstitute = new Institute({
      instituteName,
      plan,
      planDuration,
      instituteId,
      status: "active",
      planStartDate,
      planExpiryDate,
    });
    await newInstitute.save();

    const newUser = new User({
      name,
      phoneNo,
      email,
      password,
      instituteName,
      address,
      instituteId,
      role: "mainadmin",
    });
    await newUser.save();

    res.status(201).json({ message: "Registration successful", newUser, newInstitute });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login Route
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.password !== password) return res.status(400).json({ message: "Invalid credentials" });
    res.status(200).json({ message: "Login successful", role: user.role, instituteId: user.instituteId });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/check-expired-institutes", async (req, res) => {
    try {
      const result = await Institute.updateMany(
        { planExpiryDate: { $lt: new Date() }, status: { $ne: "inactive" } },
        { $set: { status: "inactive" } }
      );
  
      res.status(200).json({ 
        message: "Institute status checked and updated if expired.",
        modifiedCount: result.modifiedCount // Number of updated institutes
      });
  
    } catch (error) {
      console.error("Error checking institutes:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  


// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
