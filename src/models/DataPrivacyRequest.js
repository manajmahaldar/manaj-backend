const mongoose = require('mongoose');

const dataPrivacyRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestType: { 
        type: String, 
        required: true, 
        enum: ['export_data', 'delete_account', 'withdraw_consent', 'grievance'] 
    },
    status: { 
        type: String, 
        enum: ['pending', 'processing', 'completed', 'rejected'], 
        default: 'pending' 
    },
    reason: { type: String, default: '' },
    details: { type: Object, default: {} },
    response: { type: String, default: '' },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date, default: null }
}, { timestamps: true });

dataPrivacyRequestSchema.index({ userId: 1, requestType: 1 });
dataPrivacyRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('DataPrivacyRequest', dataPrivacyRequestSchema);
