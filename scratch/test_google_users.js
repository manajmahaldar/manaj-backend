const mongoose = require('mongoose');
const path = require('path');
const User = require('../src/models/User');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI not found in env!");
        return;
    }
    console.log("Connecting to:", uri);
    await mongoose.connect(uri);
    
    // Define unique emails and googleIds for our test
    const email1 = `test_google_1_${Date.now()}@example.com`;
    const email2 = `test_google_2_${Date.now()}@example.com`;
    const googleId1 = `google_id_test_1_${Date.now()}`;
    const googleId2 = `google_id_test_2_${Date.now()}`;
    
    try {
        console.log("\n--- Testing registration of Google User 1 ---");
        const user1 = new User({
            name: "Google Test User 1",
            email: email1,
            googleId: googleId1,
            district: "Kolkata",
            role: "farmer",
            accountStatus: "active"
            // Note: phone field is NOT present!
        });
        await user1.save();
        console.log("SUCCESS: Google User 1 saved successfully!");
        
        console.log("\n--- Testing registration of Google User 2 ---");
        const user2 = new User({
            name: "Google Test User 2",
            email: email2,
            googleId: googleId2,
            district: "Howrah",
            role: "trader",
            accountStatus: "active"
            // Note: phone field is NOT present!
        });
        await user2.save();
        console.log("SUCCESS: Google User 2 saved successfully!");
        
        // Clean up
        console.log("\n--- Cleaning up test users ---");
        const deleteResult = await User.deleteMany({
            _id: { $in: [user1._id, user2._id] }
        });
        console.log(`Cleaned up ${deleteResult.deletedCount} test users.`);
        
    } catch (err) {
        console.error("\nFAIL: Test encountered duplicate key or other error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("\nDisconnected.");
    }
}

run().catch(console.error);
