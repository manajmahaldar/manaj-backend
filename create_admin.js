require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        const email = 'admin@matsyalink.com';
        const password = 'manajmatsya0934@';

        // Check if admin already exists
        let admin = await User.findOne({ email });

        if (admin) {
            console.log('Admin already exists! Updating password...');
            admin.password = password; 
            await admin.save();
            console.log('Admin password updated successfully.');
        } else {
            console.log('Creating new Admin...');
            admin = new User({
                name: 'Super Admin',
                email: email,
                password: password,
                role: 'admin',
                district: 'System Admin',
                accountStatus: 'active',
                verifiedStatus: true,
            });
            await admin.save();
            console.log('Admin created successfully.');
        }

        mongoose.connection.close();
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
