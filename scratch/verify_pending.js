const mongoose = require('mongoose');
const Listing = require('../src/models/Listing');
const BuyingPost = require('../src/models/BuyingPost');
require('dotenv').config();

async function verify() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if there are any pending items
        const pendingListings = await Listing.find({ status: 'pending' });
        const pendingPosts = await BuyingPost.find({ status: 'pending' });

        console.log(`Found ${pendingListings.length} pending listings`);
        console.log(`Found ${pendingPosts.length} pending buying posts`);

        if (pendingListings.length > 0) {
            console.log('Sample pending listing:', pendingListings[0].productName);
        }
        if (pendingPosts.length > 0) {
            console.log('Sample pending post:', pendingPosts[0].fishName);
        }

        console.log('\nVerification complete. Use the Admin Dashboard UI to test approval/rejection.');
        
        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

verify();
