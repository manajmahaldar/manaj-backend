const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true
    },
    text: {
        type: String,
        default: ''
    },
    imageUrls: [{
        type: String
    }],
    hasAudio: {
        type: Boolean,
        default: false
    },
    recommendations: [{
        title: String,
        type: { type: String, enum: ['article', 'video', 'pdf', 'scheme', 'course', 'general'] },
        link: String,
        id: String
    }],
    visualObservations: [String],
    possibleCauses: [String],
    confidence: {
        type: String,
        enum: ['high', 'medium', 'low', 'uncertain'],
        default: 'medium'
    },
    safeNextSteps: [String],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const FarmingAIConversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        default: 'New Farming Inquiry'
    },
    farmContext: {
        fishSpecies: String,
        pondSize: String,
        numberOfFish: String,
        fishAge: String,
        stockingDensity: String,
        waterTemp: String,
        ph: String,
        dissolvedOxygen: String,
        ammonia: String,
        nitrite: String,
        feedType: String,
        feedingFrequency: String,
        location: String
    },
    messages: [MessageSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model('FarmingAIConversation', FarmingAIConversationSchema);
