const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');

dotenv.config();

const checkPending = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({ accountStatus: 'pending' });

        console.log('Pending users count:', users.length);
        users.forEach(u => {
            console.log(`ID: ${u._id}`);
            console.log(`Name: ${u.name}`);
            console.log(`Phone: ${u.phone}`);
            console.log(`Email: ${u.email}`);
            console.log(`District (State): ${u.district}`);
            console.log(`LocalDistrict (District): ${u.localDistrict}`);
            console.log(`PoliceStation: ${u.policeStation}`);
            console.log(`AadhaarCard: ${u.aadhaarCard}`);
            console.log(`VerificationVideo: ${u.verificationVideo}`);
            console.log(`-----------------------------------`);
        });

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

checkPending();
