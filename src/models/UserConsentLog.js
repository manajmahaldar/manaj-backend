const mongoose = require('mongoose');

const userConsentLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    consentType: { 
        type: String, 
        required: true, 
        enum: ['privacy_policy', 'terms', 'essential_cookies', 'analytics_cookies', 'marketing_communications', 'data_processing'] 
    },
    granted: { type: Boolean, required: true },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    policyVersion: { type: String, default: '1.0.0' },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

userConsentLogSchema.index({ userId: 1, consentType: 1 });

module.exports = mongoose.model('UserConsentLog', userConsentLogSchema);
