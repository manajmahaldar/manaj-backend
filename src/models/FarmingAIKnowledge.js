const mongoose = require('mongoose');

const FarmingAIKnowledgeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: [
            'basics',
            'pond_management',
            'water_quality',
            'fish_health',
            'feed_nutrition',
            'hatchery',
            'biofloc_ras',
            'equipment',
            'marketing_economics',
            'government_schemes',
            'general'
        ],
        default: 'general'
    },
    sourceType: {
        type: String,
        enum: ['article', 'video', 'pdf', 'scheme', 'custom_guideline'],
        default: 'custom_guideline'
    },
    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    pdfUrl: {
        type: String,
        default: null
    },
    tags: [{
        type: String
    }],
    isApproved: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

FarmingAIKnowledgeSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('FarmingAIKnowledge', FarmingAIKnowledgeSchema);
