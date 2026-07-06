const mongoose = require('mongoose');

const buyingPostSchema = new mongoose.Schema({
    traderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fishName: { type: String, required: true },
    size: { type: String, required: true }, // kg or gm
    requiredQuantity: { type: String, required: true },
    buyingPrice: { type: String, required: true },
    district: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['fish', 'feed', 'medicine'], 
        default: 'fish' 
    },
    photos: [{ type: String }],
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },

    // --- Fraud Detection ---
    isFlagged:   { type: Boolean, default: false },
    fraudReason: { type: String, default: '' },
    fraudScore:  { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now }
});

// Indexes for scalability
buyingPostSchema.index({ status: 1, district: 1, category: 1, createdAt: -1 }); // Optimized feed query
buyingPostSchema.index({ traderId: 1, createdAt: -1 }); // Optimized user posts query
buyingPostSchema.index({ createdAt: -1 });
buyingPostSchema.index({ status: 1 });

module.exports = mongoose.model('BuyingPost', buyingPostSchema);
