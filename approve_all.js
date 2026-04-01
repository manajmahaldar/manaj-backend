const Listing = require('./src/models/Listing');
const mongoose = require('mongoose');
require('dotenv').config();

async function approvePendingListings() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const result = await Listing.updateMany({ status: 'pending' }, { status: 'approved' });
        console.log(`Approved ${result.modifiedCount} pending listings.`);
        process.exit();
    } catch (err) {
        console.error('Error approving listings:', err);
        process.exit(1);
    }
}

approvePendingListings();
