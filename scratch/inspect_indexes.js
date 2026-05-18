const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI not found in env!");
        return;
    }
    console.log("Connecting to:", uri);
    await mongoose.connect(uri);
    
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // 1. Get all indexes
    const indexes = await collection.indexes();
    console.log("\n--- Current Indexes on 'users' collection ---");
    console.log(JSON.stringify(indexes, null, 2));
    
    // 2. Count documents with phone: null vs phone: undefined vs normal
    const totalUsers = await collection.countDocuments({});
    const phoneNullCount = await collection.countDocuments({ phone: null });
    const phoneExistsCount = await collection.countDocuments({ phone: { $exists: true } });
    const phoneUndefinedOrMissingCount = await collection.countDocuments({ phone: { $exists: false } });
    
    console.log("\n--- User Statistics ---");
    console.log("Total users:", totalUsers);
    console.log("Users with phone field existing:", phoneExistsCount);
    console.log("Users with phone: null (explicitly):", phoneNullCount);
    console.log("Users missing phone field entirely:", phoneUndefinedOrMissingCount);
    
    // 3. Let's find details of users where phone is null or missing
    const nullOrMissingUsers = await collection.find({ $or: [{ phone: null }, { phone: { $exists: false } }] }).toArray();
    console.log("\n--- Users with null/missing phone ---");
    nullOrMissingUsers.forEach(u => {
        console.log(`ID: ${u._id}, Name: ${u.name}, Email: ${u.email}, Phone: ${u.phone}, GoogleId: ${u.googleId}`);
    });

    await mongoose.disconnect();
}

run().catch(console.error);
