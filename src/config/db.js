const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdminIfNeeded = async () => {
    try {
        const adminEmail = 'admin@matsyalink.com';
        const adminPassword = 'manajmatsya0934@';

        // 1. Seed Super Admin
        const adminExists = await User.findOne({ email: adminEmail });
        if (!adminExists) {
            console.log('Admin user not found. Auto-seeding admin user...');
            const admin = new User({
                name: 'Super Admin',
                email: adminEmail,
                password: adminPassword,
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

        // 2. Seed Mock Trader (Hasibur Rahaman) with submitted documents for verification testing
        const traderPhone = '9593013549';
        const traderExists = await User.findOne({ phone: traderPhone });
        if (!traderExists) {
            console.log('Mock Trader not found. Auto-seeding mock trader with verification documents...');
            const trader = new User({
                name: 'Hasibur Rahaman',
                phone: traderPhone,
                email: 'hasiburrahaman35462@gmail.com',
                password: 'Password123!',
                role: 'trader',
                district: 'West Bengal',
                localDistrict: 'Kalimpong',
                policeStation: 'haldia',
                accountStatus: 'pending',
                profilePicture: 'https://res.cloudinary.com/dsxyyogdd/image/upload/v1779212344/monaj/profiles/wcavenyi4d2l0o1byd3v.png',
                aadhaarCard: 'https://res.cloudinary.com/dsxyyogdd/image/upload/v1779212345/monaj/verifications/aadhaar/zrzpmq91jmjs3yyukmxw.png',
                verificationVideo: 'https://res.cloudinary.com/dsxyyogdd/video/upload/v1779212465/monaj/test/video/pbs6cf5rs6n0srknfnwt.mp4'
            });
            await trader.save();
            console.log('Mock Trader auto-seeded successfully.');
        } else {
            console.log('Mock Trader verified to exist in database.');
        }

        // 3. Seed Mock Farmer with submitted documents for verification testing
        const farmerPhone = '9876543210';
        const farmerExists = await User.findOne({ phone: farmerPhone });
        if (!farmerExists) {
            console.log('Mock Farmer not found. Auto-seeding mock farmer with verification documents...');
            const farmer = new User({
                name: 'Test Farmer',
                phone: farmerPhone,
                email: 'farmer@matsyalink.com',
                password: 'Password123!',
                role: 'farmer',
                district: 'West Bengal',
                localDistrict: 'Darjeeling',
                policeStation: 'darjeeling',
                accountStatus: 'pending',
                profilePicture: 'https://res.cloudinary.com/dsxyyogdd/image/upload/v1779212344/monaj/profiles/wcavenyi4d2l0o1byd3v.png',
                aadhaarCard: 'https://res.cloudinary.com/dsxyyogdd/image/upload/v1779212345/monaj/verifications/aadhaar/zrzpmq91jmjs3yyukmxw.png',
                verificationVideo: 'https://res.cloudinary.com/dsxyyogdd/video/upload/v1779212465/monaj/test/video/pbs6cf5rs6n0srknfnwt.mp4'
            });
            await farmer.save();
            console.log('Mock Farmer auto-seeded successfully.');
        } else {
            console.log('Mock Farmer verified to exist in database.');
        }

    } catch (err) {
        console.error('Error auto-seeding database on startup:', err.message);
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
