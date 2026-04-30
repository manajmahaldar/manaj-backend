const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quantity: { type: String, required: true },
    totalAmount: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'packed', 'out-for-delivery', 'delivered', 'cancelled'], 
        default: 'pending' 
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    deliveryBoyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    estimatedDeliveryTime: { type: String },
    trackingHistory: [
        {
            status: String,
            timestamp: { type: Date, default: Date.now },
            note: String
        }
    ],
    message: { type: String },
    createdAt: { type: Date, default: Date.now }
});

// Indexes for scalability
orderSchema.index({ buyerId: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ deliveryBoyId: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
