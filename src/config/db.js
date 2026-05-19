const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdminIfNeeded = async () => {
    try {
        const email = 'admin@matsyalink.com';
        const password = 'manajmatsya0934@';

        const adminExists = await User.findOne({ email });
        if (!adminExists) {
            console.log('Admin user not found. Auto-seeding admin user...');
            const admin = new User({
                name: 'Super Admin',
                email: email,
                password: password,
                role: 'admin',
                district: 'System Admin',
                accountStatus: 'active',
                verifiedStatus: true,
                isVerified: true
            });
            await admin.save();
            console.log('Admin user auto-seeded successfully.');
        } else {
            console.log('Admin user verified to exist in database.');
        }
    } catch (err) {
        console.error('Error auto-seeding admin user on startup:', err.message);
    }
};

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fish-marketplace');
        console.log(`Connected to MongoDB: ${conn.connection.host}`);
        await seedAdminIfNeeded();
    } catch (err) {
        console.error(`Error connecting to MongoDB: ${err.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
