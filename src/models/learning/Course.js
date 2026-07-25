const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
    contents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LearningContent' }],
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }
});

const courseSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '' },
    thumbnail: { type: String, default: '' },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LearningCategory' }],
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    language: { type: String, default: 'en' },
    author: {
        name: { type: String, default: 'MatsyaLink Instructor' },
        avatar: { type: String, default: '' }
    },
    modules: [moduleSchema],
    status: { 
        type: String, 
        enum: ['draft', 'pending_review', 'scheduled', 'published', 'archived', 'deleted'], 
        default: 'draft' 
    },
    publishAt: { type: Date, default: Date.now },
    featured: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    enrolledCount: { type: Number, default: 0 },
    completionCount: { type: Number, default: 0 }
}, { timestamps: true });

courseSchema.index({ status: 1, publishAt: -1 });

module.exports = mongoose.model('Course', courseSchema);
