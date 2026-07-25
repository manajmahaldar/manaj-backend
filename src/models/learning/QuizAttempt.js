const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    answers: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
        selectedAnswers: [{ type: Number }] // Indices of chosen options
    }],
    score: { type: Number, required: true }, // Scoring percentage (0-100)
    passed: { type: Boolean, required: true },
    timeTaken: { type: Number, default: 0 }, // in seconds
    attemptedAt: { type: Date, default: Date.now }
}, { timestamps: true });

quizAttemptSchema.index({ userId: 1, quizId: 1 });
quizAttemptSchema.index({ quizId: 1, score: -1, timeTaken: 1 }); // Indexing for leaderboard rankings

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
