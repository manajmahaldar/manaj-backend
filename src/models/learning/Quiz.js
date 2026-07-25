const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    type: { type: String, required: true, enum: ['mcq', 'true_false', 'multiple_answer'], default: 'mcq' },
    options: [{ type: String, required: true }],
    correctAnswers: [{ type: Number, required: true }], // Array of indices (0-indexed) mapping to correct option(s)
    explanation: { type: String, default: '' }
});

const quizSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningCategory', required: true },
    questions: [questionSchema],
    passingScore: { type: Number, default: 70, min: 0, max: 100 }, // Percentage needed to pass
    timeLimit: { type: Number, default: 0 }, // in minutes (0 means no limit)
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

quizSchema.index({ category: 1 });
quizSchema.index({ isActive: 1 });

module.exports = mongoose.model('Quiz', quizSchema);
