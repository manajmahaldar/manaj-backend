const mongoose = require('mongoose');
require('dotenv').config();

const buyingPostSchema = new mongoose.Schema({
    status: { type: String, default: 'pending' }
});

const BuyingPost = mongoose.model('BuyingPost', buyingPostSchema);

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const result = await BuyingPost.updateMany({ status: 'pending' }, { status: 'approved' });
        console.log('Update result:', result);
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
