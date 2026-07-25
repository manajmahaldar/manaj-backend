const mongoose = require('mongoose');

const learningContentSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: { 
        type: String, 
        required: true, 
        enum: ['video', 'article', 'blog', 'pdf', 'infographic', 'audio', 'presentation', 'downloadable_doc', 'faq', 'external_link'] 
    },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LearningCategory', required: true }],
    subcategory: { type: String, default: '' },
    tags: [{ type: String, trim: true }],
    language: { type: String, required: true, default: 'en' },
    level: { type: String, required: true, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    status: { 
        type: String, 
        required: true, 
        enum: ['draft', 'pending_review', 'scheduled', 'published', 'archived', 'deleted'], 
        default: 'draft' 
    },
    publishAt: { type: Date, default: Date.now },
    author: {
        name: { type: String, required: true, default: 'MatsyaLink Expert' },
        avatar: { type: String, default: '' },
        bio: { type: String, default: '' }
    },
    thumbnail: { type: String, default: '' },
    
    // Type specific content:
    content: { type: String, default: '' }, // Rich text / markdown
    videoUrl: { type: String, default: '' },
    videoSource: { type: String, enum: ['youtube', 'vimeo', 'cloudinary', 'self', ''], default: '' },
    pdfUrl: { type: String, default: '' },
    mediaUrl: { type: String, default: '' }, // For audio/infographic/presentation
    externalLink: { type: String, default: '' },
    
    // Metadata:
    duration: { type: Number, default: 0 }, // in minutes/seconds
    readingTime: { type: Number, default: 0 }, // in minutes
    fileSize: { type: String, default: '' }, // e.g. "2.4 MB"
    
    // Engagement stats:
    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    bookmarkCount: { type: Number, default: 0 },
    
    // Curation flags:
    featured: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isRecommended: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false }
}, { timestamps: true });

learningContentSchema.index({ type: 1, status: 1 });
learningContentSchema.index({ categories: 1 });
learningContentSchema.index({ language: 1, level: 1 });
learningContentSchema.index({ publishAt: -1 });
learningContentSchema.index({ featured: 1, pinned: 1, isTrending: 1 });
learningContentSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('LearningContent', learningContentSchema);
