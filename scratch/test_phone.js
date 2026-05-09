const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const phoneWithZero = "09876543210";
    const phoneRaw = "9876543210";

    await User.deleteMany({ phone: { $in: [phoneWithZero, phoneRaw] } });

    const user = new User({
        name: "Test Phone",
        phone: phoneWithZero,
        password: "Password@123",
        district: "Kolkata"
    });
    await user.save();
    console.log("Saved user with phone:", phoneWithZero);

    const found = await User.findOne({ phone: phoneRaw });
    if (found) {
        console.log("Found user with raw phone! (This means Mongoose or MongoDB did some magic)");
    } else {
        console.log("User NOT found with raw phone. Normalization IS required.");
    }

    await mongoose.disconnect();
}

test().catch(console.error);
