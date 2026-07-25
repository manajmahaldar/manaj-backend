const mongoose = require('mongoose');

const legalPolicySchema = new mongoose.Schema({
    slug: { 
        type: String, 
        required: true, 
        unique: true, 
        enum: [
            'privacy-policy', 
            'terms-and-conditions', 
            'cookie-policy', 
            'data-deletion-policy', 
            'refund-policy', 
            'shipping-policy', 
            'community-guidelines', 
            'grievance-policy', 
            'security-notice'
        ] 
    },
    title: { type: String, required: true },
    version: { type: String, default: '1.0.0' },
    effectiveDate: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    content: { type: String, required: true },
    changelog: { type: String, default: 'Initial version release' },
    isPublished: { type: Boolean, default: true },
    history: [{
        version: String,
        effectiveDate: Date,
        content: String,
        changelog: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('LegalPolicy', legalPolicySchema);
