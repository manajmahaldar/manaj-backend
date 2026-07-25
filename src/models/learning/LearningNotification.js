const mongoose = require('mongoose');

const learningNotificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = broadcast to all
    type: { 
        type: String, 
        required: true, 
        enum: ['new_video', 'new_blog', 'new_article', 'new_scheme', 'webinar', 'quiz_available', 'certificate_earned', 'announcement', 'system']
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, default: null }, // Reference to content, quiz, or scheme
    targetRole: { type: String, default: 'all' }, // 'all', 'farmer', 'seller', 'trader', 'hatchery'
    actionUrl: { type: String, default: '/learning' },
    read: { type: Boolean, default: false },
    isBroadcast: { type: Boolean, default: false }
}, { timestamps: true });

learningNotificationSchema.index({ userId: 1, read: 1 });
learningNotificationSchema.index({ isBroadcast: 1 });
learningNotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('LearningNotification', learningNotificationSchema);
