const mongoose = require('mongoose');

const mediaLibrarySchema = new mongoose.Schema({
    fileName: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    fileType: { 
        type: String, 
        required: true, 
        enum: ['image', 'video', 'pdf', 'audio', 'presentation', 'other'] 
    },
    folder: { type: String, default: 'General', trim: true },
    sizeBytes: { type: Number, default: 0 },
    mimeType: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    altText: { type: String, default: '' },
    tags: [{ type: String, trim: true }]
}, { timestamps: true });

mediaLibrarySchema.index({ folder: 1, fileType: 1 });
mediaLibrarySchema.index({ fileName: 'text', tags: 'text' });

module.exports = mongoose.model('MediaLibrary', mediaLibrarySchema);
