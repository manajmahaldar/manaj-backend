const mongoose = require('mongoose');

// Singleton document — only one record ever exists (queried by {})
const heroSettingsSchema = new mongoose.Schema({
    video1Url:    { type: String, default: '' },
    video1Id:     { type: String, default: '' }, // Cloudinary publicId
    video2Url:    { type: String, default: '' },
    video2Id:     { type: String, default: '' },
    heroImageUrl: { type: String, default: '' },
    heroImageId:  { type: String, default: '' },
    updatedAt:    { type: Date, default: Date.now },
    updatedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('HeroSettings', heroSettingsSchema);
