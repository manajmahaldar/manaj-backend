const mongoose = require('mongoose');

const FarmingAIAnalyticsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    userRole: {
        type: String,
        enum: ['Farmer', 'Seller', 'Trader', 'Hatchery', 'Admin', 'User', 'Guest'],
        default: 'User'
    },
    queryText: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        default: 'general'
    },
    hasImages: {
        type: Boolean,
        default: false
    },
    hasVoice: {
        type: Boolean,
        default: false
    },
    confidenceScore: {
        type: String,
        enum: ['high', 'medium', 'low', 'uncertain'],
        default: 'medium'
    },
    recommendationsCount: {
        type: Number,
        default: 0
    },
    resourceClicked: {
        type: String,
        default: null
    },
    isFlagged: {
        type: Boolean,
        default: false
    },
    flagReason: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('FarmingAIAnalytics', FarmingAIAnalyticsSchema);
