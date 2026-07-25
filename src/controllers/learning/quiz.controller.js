const Quiz = require('../../models/learning/Quiz');
const QuizAttempt = require('../../models/learning/QuizAttempt');

// @desc    Get all active quizzes
exports.getQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.find({ isActive: true }).populate('category', 'name color icon');
        res.json({ success: true, data: quizzes });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Get quiz by ID (without correct answer indices for security)
exports.getQuizById = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await Quiz.findById(id).populate('category', 'name color icon').lean();
        if (!quiz) {
            return res.status(404).json({ success: false, msg: 'Quiz not found' });
        }
        
        // Hide answers from quiz details sent to the user
        if (quiz.questions) {
            quiz.questions = quiz.questions.map(q => {
                delete q.correctAnswers;
                return q;
            });
        }
        
        res.json({ success: true, data: quiz });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Submit quiz answers, compute score, check passing status
exports.submitQuiz = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { answers, timeTaken } = req.body; // Array of { questionId, selectedAnswers: [Number] }
        
        const quiz = await Quiz.findById(id);
        if (!quiz) {
            return res.status(404).json({ success: false, msg: 'Quiz not found' });
        }
        
        let correctCount = 0;
        const gradedAnswers = [];
        
        quiz.questions.forEach(q => {
            const userAnswer = answers.find(a => a.questionId === q._id.toString());
            const userSelections = userAnswer ? userAnswer.selectedAnswers : [];
            
            // Check if user answer matches correct answers array exactly
            const isCorrect = userSelections.length === q.correctAnswers.length &&
                userSelections.every(val => q.correctAnswers.includes(val));
                
            if (isCorrect) correctCount++;
            
            gradedAnswers.push({
                questionId: q._id,
                selectedAnswers: userSelections,
                correctAnswers: q.correctAnswers,
                isCorrect,
                explanation: q.explanation
            });
        });
        
        const score = Math.round((correctCount / quiz.questions.length) * 100);
        const passed = score >= quiz.passingScore;
        
        const attempt = new QuizAttempt({
            userId,
            quizId: quiz._id,
            answers: answers.map(a => ({ questionId: a.questionId, selectedAnswers: a.selectedAnswers })),
            score,
            passed,
            timeTaken
        });
        await attempt.save();
        
        res.json({
            success: true,
            data: {
                attemptId: attempt._id,
                score,
                passed,
                passingScore: quiz.passingScore,
                correctCount,
                totalQuestions: quiz.questions.length,
                gradedAnswers
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Get leaderboard for a specific quiz
exports.getLeaderboard = async (req, res) => {
    try {
        const { id } = req.params;
        const attempts = await QuizAttempt.find({ quizId: id, passed: true })
            .sort({ score: -1, timeTaken: 1 })
            .limit(10)
            .populate('userId', 'name profilePicture role');
            
        res.json({ success: true, data: attempts });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Create quiz (Admin only)
exports.createQuiz = async (req, res) => {
    try {
        const { title, description, category, questions, passingScore, timeLimit } = req.body;
        const newQuiz = new Quiz({ title, description, category, questions, passingScore, timeLimit });
        await newQuiz.save();
        res.status(201).json({ success: true, data: newQuiz });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Update quiz (Admin only)
exports.updateQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await Quiz.findByIdAndUpdate(id, req.body, { new: true });
        if (!quiz) {
            return res.status(404).json({ success: false, msg: 'Quiz not found' });
        }
        res.json({ success: true, data: quiz });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Delete quiz (Admin only)
exports.deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await Quiz.findByIdAndDelete(id);
        if (!quiz) {
            return res.status(404).json({ success: false, msg: 'Quiz not found' });
        }
        res.json({ success: true, msg: 'Quiz deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};
