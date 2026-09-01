require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function checkUsers() {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({ email: { $exists: true, $ne: '' } }).select('name email phone role').limit(10);
    console.log("Registered Users in DB:", users);
    process.exit(0);
}

checkUsers().catch(console.error);
