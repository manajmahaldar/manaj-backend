const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
require('dotenv').config();

async function debug() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const testUser = {
        name: "Test User",
        phone: "9876543210",
        email: "test@example.com",
        password: "Password@123",
        district: "Kolkata",
        role: "farmer"
    };

    // 1. Cleanup
    await User.deleteMany({ phone: testUser.phone });

    // 2. Register (Simulate Controller)
    console.log("Registering...");
    const user = new User(testUser);
    
    console.log("Password before first save:", user.password);
    await user.save();
    console.log("Password after first save (hashed):", user.password);
    
    const hash1 = user.password;

    user.refreshTokens.push({ token: "fake-token", createdAt: new Date() });
    await user.save();
    console.log("Password after second save:", user.password);
    
    const hash2 = user.password;

    if (hash1 !== hash2) {
        console.error("BUG DETECTED: Password was hashed twice!");
        console.log("Hash 1:", hash1);
        console.log("Hash 2:", hash2);
    } else {
        console.log("Password was not hashed twice. Good.");
    }

    // 3. Login (Simulate Controller)
    console.log("Logging in...");
    const foundUser = await User.findOne({ phone: testUser.phone }).select('+password');
    if (!foundUser) {
        console.error("User not found by phone!");
    } else {
        const isMatch = await foundUser.comparePassword(testUser.password);
        console.log("Password match:", isMatch);
    }

    await mongoose.disconnect();
}

debug().catch(console.error);
