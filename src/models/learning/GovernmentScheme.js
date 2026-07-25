const mongoose = require('mongoose');

const governmentSchemeSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    schemeName: { type: String, required: true, trim: true }, // Official Govt Name
    description: { type: String, required: true },
    ministry: { type: String, default: 'Ministry of Fisheries, Animal Husbandry & Dairying' },
    category: { 
        type: String, 
        required: true, 
        enum: ['pmmsy', 'subsidy', 'loan', 'insurance', 'training_program', 'notification'],
        default: 'subsidy' 
    },
    eligibility: { type: String, default: '' },
    benefits: { type: String, default: '' },
    applicationLink: { type: String, default: '' },
    documentsRequired: [{ type: String }],
    deadline: { type: Date, default: null },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

governmentSchemeSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('GovernmentScheme', governmentSchemeSchema);
