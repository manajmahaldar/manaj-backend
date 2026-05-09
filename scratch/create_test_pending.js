const mongoose = require('mongoose');
const Listing = require('../src/models/Listing');
const BuyingPost = require('../src/models/BuyingPost');
const User = require('../src/models/User');
require('dotenv').config();

async function createPending() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find a random user to be the seller/trader
        const user = await User.findOne({ role: { $ne: 'admin' } });
        if (!user) {
            console.error('No non-admin user found to create test items.');
            return;
        }

        console.log(`Using user: ${user.name} (${user.role})`);

        // Create a pending listing
        const newListing = new Listing({
            sellerId: user._id,
            productName: "Test Pending Fish",
            category: "Fish",
            price: "500",
            district: "Kolkata",
            description: "Test description",
            phoneNumber: user.phone,
            status: "pending"
        });
        await newListing.save();
        console.log('Created pending listing');

        // Create a pending buying post
        const newPost = new BuyingPost({
            traderId: user._id,
            fishName: "Test Pending Buy Request",
            size: "2kg",
            requiredQuantity: "100kg",
            buyingPrice: "300",
            district: "Kolkata",
            phoneNumber: user.phone,
            status: "pending"
        });
        await newPost.save();
        console.log('Created pending buying post');

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

createPending();
