const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');

dotenv.config();

const findAdmins = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const admins = await User.find({ role: 'admin' });
        console.log('Admin users count:', admins.length);
        admins.forEach(admin => {
            console.log(`ID: ${admin._id}`);
            console.log(`Name: ${admin.name}`);
            console.log(`Email: ${admin.email}`);
            console.log(`Phone: ${admin.phone}`);
            console.log(`VerifiedStatus: ${admin.verifiedStatus}`);
            console.log(`AccountStatus: ${admin.accountStatus}`);
            console.log('-----------------------------');
        });

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

findAdmins();
