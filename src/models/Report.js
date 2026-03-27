const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true }, // ID of user/listing/post
    type: { 
        type: String, 
        enum: ['user', 'listing', 'post'], 
        required: true 
    },
    reason: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'reviewed', 'resolved'], 
        default: 'pending' 
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);
