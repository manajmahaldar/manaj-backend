const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');

dotenv.config();

const checkAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const admins = await User.find({ role: 'admin' }).select('+password').lean();
        console.log(`=== Admin Users (total: ${admins.length}) ===`);
        admins.forEach(admin => {
            console.log(`ID: ${admin._id}`);
            console.log(`Name: ${admin.name}`);
            console.log(`Email: ${admin.email}`);
            console.log(`Phone: ${admin.phone}`);
            console.log(`Role: ${admin.role}`);
            console.log(`Password Hash exists: ${!!admin.password}`);
            console.log('------------------------');
        });

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

checkAdmin();
