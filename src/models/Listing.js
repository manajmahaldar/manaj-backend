const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productName: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['Spawn/Seed', 'Feed', 'Medicine', 'Fish', 'Equipment'], 
        required: true 
    },
    quantity: { type: String }, // e.g. "50"
    unit: { type: String }, // e.g. "kg", "gm", "piece"

    price: { type: String, required: true },
    district: { type: String, required: true },
    description: { type: String, required: true },
    photos: [{ type: String }], // Cloudinary URLs
    phoneNumber: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Listing', listingSchema);
