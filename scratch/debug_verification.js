const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');

dotenv.config();

const debugVerification = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        // 1) All pending users
        const allPending = await User.find({ accountStatus: 'pending' }).lean();
        console.log(`=== All pending users (total: ${allPending.length}) ===`);
        allPending.forEach(u => {
            console.log(`  - ${u.name} | phone: ${u.phone} | aadhaarCard: "${u.aadhaarCard}" | video: "${u.verificationVideo}"`);
        });

        // 2) Pending users WITH aadhaar (what admin sees)
        const pendingWithAadhaar = await User.find({
            accountStatus: 'pending',
            aadhaarCard: { $exists: true, $nin: [null, ""] }
        }).lean();
        console.log(`\n=== Pending users WITH aadhaar (admin sees these: ${pendingWithAadhaar.length}) ===`);
        pendingWithAadhaar.forEach(u => {
            console.log(`  - ${u.name} | phone: ${u.phone} | email: ${u.email}`);
            console.log(`    state: ${u.district} | district: ${u.localDistrict} | policeStation: ${u.policeStation}`);
            console.log(`    aadhaarCard: ${u.aadhaarCard}`);
            console.log(`    verificationVideo: ${u.verificationVideo}`);
        });

        // 3) Pending users WITHOUT aadhaar (registered but not yet submitted)
        const pendingNoAadhaar = await User.find({
            accountStatus: 'pending',
            $or: [
                { aadhaarCard: { $exists: false } },
                { aadhaarCard: null },
                { aadhaarCard: "" }
            ]
        }).lean();
        console.log(`\n=== Pending users WITHOUT aadhaar (not yet submitted: ${pendingNoAadhaar.length}) ===`);
        pendingNoAadhaar.forEach(u => {
            console.log(`  - ${u.name} | phone: ${u.phone} | email: ${u.email} | createdAt: ${u.createdAt}`);
        });

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

debugVerification();
