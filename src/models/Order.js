const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quantity: { type: String, required: true },
    totalAmount: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'accepted', 'completed', 'cancelled'], 
        default: 'pending' 
    },
    message: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
