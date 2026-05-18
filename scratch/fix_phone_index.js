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
    
    // 1. Clean up documents with phone: null or phone: ""
    console.log("\n--- Cleaning up existing phone fields ---");
    const resultNull = await collection.updateMany(
        { $or: [{ phone: null }, { phone: "" }] },
        { $unset: { phone: "" } }
    );
    console.log(`Unset explicit phone from ${resultNull.modifiedCount} documents.`);
    
    // 2. Drop the old phone_1 index if it exists
    console.log("\n--- Dropping existing 'phone_1' index ---");
    try {
        await collection.dropIndex("phone_1");
        console.log("Successfully dropped 'phone_1' index.");
    } catch (err) {
        if (err.codeName === 'IndexNotFound' || err.message.includes('not found')) {
            console.log("'phone_1' index was not found, so no need to drop it.");
        } else {
            console.error("Error dropping 'phone_1' index:", err.message);
        }
    }
    
    // 3. Recreate the phone_1 index with unique: true, sparse: true
    console.log("\n--- Creating unique, sparse 'phone_1' index ---");
    try {
        await collection.createIndex(
            { phone: 1 },
            { name: "phone_1", unique: true, sparse: true }
        );
        console.log("Successfully created unique, sparse 'phone_1' index.");
    } catch (err) {
        console.error("Error creating 'phone_1' index:", err);
    }
    
    // 4. Verify indexes
    const indexes = await collection.indexes();
    console.log("\n--- Updated Indexes on 'users' collection ---");
    console.log(JSON.stringify(indexes, null, 2));
    
    await mongoose.disconnect();
    console.log("\nDone!");
}

run().catch(console.error);
