const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');

dotenv.config();

const checkAllWithAadhaar = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({ aadhaarCard: { $ne: "" } });

        console.log('Users with Aadhaar card count:', users.length);
        users.forEach(u => {
            console.log(`ID: ${u._id}`);
            console.log(`Name: ${u.name}`);
            console.log(`AccountStatus: ${u.accountStatus}`);
            console.log(`AadhaarCard: ${u.aadhaarCard}`);
            console.log(`VerificationVideo: ${u.verificationVideo}`);
            console.log(`-----------------------------------`);
        });

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

checkAllWithAadhaar();
