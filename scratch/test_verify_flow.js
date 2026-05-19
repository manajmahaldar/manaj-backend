/**
 * Test script to simulate the verify-profile API call
 * Checks if the endpoint works correctly with sample data
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');

dotenv.config();

const testVerifyProfileRoute = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        // Find a pending user without aadhaarCard
        const testUser = await User.findOne({ 
            accountStatus: 'pending',
            aadhaarCard: { $in: [null, ""] }
        }).lean();

        if (!testUser) {
            console.log('No pending users without aadhaar found to simulate');
            await mongoose.connection.close();
            return;
        }

        console.log(`Test user: ${testUser.name} (${testUser._id})`);
        console.log(`Current state: accountStatus=${testUser.accountStatus}, aadhaarCard="${testUser.aadhaarCard}"`);
        console.log('\n=== Simulating what verify-profile does ===');

        // Simulate saving aadhaarCard (as if Cloudinary uploaded successfully)
        const fakeCloudinaryUrl = 'https://res.cloudinary.com/test/image/upload/fake_aadhaar.jpg';
        const fakeVideoUrl = 'https://res.cloudinary.com/test/video/upload/fake_video.webm';

        const updatedUser = await User.findByIdAndUpdate(
            testUser._id,
            {
                name: testUser.name,
                email: testUser.email || 'test@example.com',
                district: testUser.district || 'West Bengal',
                localDistrict: testUser.localDistrict || 'Malda',
                policeStation: testUser.policeStation || 'Test Police Station',
                profilePicture: 'https://res.cloudinary.com/test/image/upload/profile.jpg',
                aadhaarCard: fakeCloudinaryUrl,
                verificationVideo: fakeVideoUrl,
                accountStatus: 'pending',
                verificationRejectedReason: ''
            },
            { new: true }
        ).lean();

        console.log('\n=== After simulate (what admin would see) ===');
        console.log(`Name: ${updatedUser.name}`);
        console.log(`Email: ${updatedUser.email}`);
        console.log(`Phone: ${updatedUser.phone}`);
        console.log(`State (district): ${updatedUser.district}`);
        console.log(`District (localDistrict): ${updatedUser.localDistrict}`);
        console.log(`Police Station: ${updatedUser.policeStation}`);
        console.log(`Aadhaar: ${updatedUser.aadhaarCard}`);
        console.log(`Video: ${updatedUser.verificationVideo}`);
        console.log(`Account Status: ${updatedUser.accountStatus}`);

        // Now check if pending-users API would return this user
        const pendingUsersQuery = await User.find({
            accountStatus: 'pending',
            aadhaarCard: { $exists: true, $nin: [null, ''] }
        }).lean();

        console.log(`\n=== Admin pending-users now shows ${pendingUsersQuery.length} user(s) ===`);
        pendingUsersQuery.forEach(u => console.log(`  - ${u.name} | aadhaar: ${u.aadhaarCard ? 'YES' : 'NO'}`));

        // REVERT the test change
        await User.findByIdAndUpdate(testUser._id, {
            aadhaarCard: '',
            verificationVideo: '',
            profilePicture: testUser.profilePicture || ''
        });
        console.log('\n✅ Test simulation complete - changes reverted');

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
};

testVerifyProfileRoute();
