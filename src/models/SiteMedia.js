const mongoose = require('mongoose');

const siteMediaSchema = new mongoose.Schema({
    url:          { type: String, required: true },
    publicId:     { type: String, required: true }, // Cloudinary public_id for deletion
    resourceType: { type: String, enum: ['image', 'video'], required: true },
    format:       { type: String, default: '' },    // e.g. mp4, jpg, webp
    bytes:        { type: Number, default: 0 },
    width:        { type: Number, default: 0 },
    height:       { type: Number, default: 0 },
    duration:     { type: Number, default: 0 },     // seconds (for video)
    caption:      { type: String, default: '' },
    folder:       { type: String, default: 'fish_marketplace/admin_media' },
    uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt:    { type: Date, default: Date.now }
});

siteMediaSchema.index({ resourceType: 1, createdAt: -1 });
siteMediaSchema.index({ uploadedBy: 1 });

module.exports = mongoose.model('SiteMedia', siteMediaSchema);
