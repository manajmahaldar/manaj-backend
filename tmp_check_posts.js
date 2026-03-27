const mongoose = require('mongoose');
require('dotenv').config();

const buyingPostSchema = new mongoose.Schema({
    traderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fishName: { type: String, required: true },
    size: { type: String, required: true },
    requiredQuantity: { type: String, required: true },
    buyingPrice: { type: String, required: true },
    district: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    category: { type: String, default: 'fish' },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },
    createdAt: { type: Date, default: Date.now }
});

const BuyingPost = mongoose.model('BuyingPost', buyingPostSchema);

async function run() {
    try {
        console.log('Connecting to:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        const counts = await BuyingPost.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        console.log('Post Status Counts:', JSON.stringify(counts, null, 2));
        
        const latest = await BuyingPost.find().sort({ _id: -1 }).limit(5);
        console.log('Latest Posts:', JSON.stringify(latest, null, 2));
        
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
