const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productName: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['Spawn', 'Fingerling', 'Feed', 'Medicine', 'Fish', 'Equipment', 'Fresh Fish', 'Prawns', 'Crabs', 'Dry Fish', 'Shellfish'], 
        required: true 
    },
    quantity: { type: String }, // e.g. "50"
    unit: { type: String }, // e.g. "kg", "gm", "piece"
    stock: { type: Number, default: 0 },

    price: { type: String, required: true },
    lastPriceUpdate: { type: Date, default: Date.now },
    district: { type: String, required: true },
    localDistrict: { type: String, default: '' },
    policeStation: { type: String, default: '' },
    description: { type: String, required: true },
    photos: [{ type: String }], // Cloudinary URLs
    video: { type: String, default: '' }, // Cloudinary URL for 10s video
    phoneNumber: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },
    createdAt: { type: Date, default: Date.now }
});

// Indexes for scalability — prevents full collection scans on common queries
listingSchema.index({ district: 1, category: 1, status: 1 }); // Main filter combo
listingSchema.index({ sellerId: 1 }); // My listings queries
listingSchema.index({ createdAt: -1 }); // Sorting by newest
listingSchema.index({ status: 1 }); // Admin approval queries

module.exports = mongoose.model('Listing', listingSchema);
