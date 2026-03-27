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
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BuyingPost', buyingPostSchema);
