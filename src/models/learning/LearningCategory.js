const mongoose = require('mongoose');

const learningCategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    icon: { type: String, default: 'BookOpen' },
    color: { type: String, default: '#0284c7' },
    parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningCategory', default: null },
    subcategories: [{ type: String, trim: true }],
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

learningCategorySchema.index({ order: 1 });

module.exports = mongoose.model('LearningCategory', learningCategorySchema);
