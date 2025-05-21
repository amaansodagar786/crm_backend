const mongoose = require("mongoose");

const OwnerSchema = new mongoose.Schema({
    adminId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});



const Owner = mongoose.model("Owner", OwnerSchema);
module.exports = Owner;
