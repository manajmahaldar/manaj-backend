const mongoose = require('mongoose');

const userLearningSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningContent', required: true },
    progress: { type: Number, default: 0, min: 0, max: 100 }, // Completion percentage
    completed: { type: Boolean, default: false },
    watchedSeconds: { type: Number, default: 0 },
    lastPosition: { type: Number, default: 0 }, // For resuming video/audio playback
    completedAt: { type: Date, default: null },
    bookmarked: { type: Boolean, default: false },
    downloaded: { type: Boolean, default: false },
    lastViewedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Prevent duplicate entries for user-content pairs
userLearningSchema.index({ userId: 1, contentId: 1 }, { unique: true });
userLearningSchema.index({ userId: 1, bookmarked: 1 });
userLearningSchema.index({ userId: 1, lastViewedAt: -1 });

module.exports = mongoose.model('UserLearning', userLearningSchema);
