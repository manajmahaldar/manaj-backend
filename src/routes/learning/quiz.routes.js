const express = require('express');
const router = express.Router();
const quizController = require('../../controllers/learning/quiz.controller');
const { auth } = require('../../middleware/auth.middleware');
const { authorizeRoles } = require('../../middleware/role.middleware');

const adminAuth = [auth, authorizeRoles('admin', 'superadmin')];

router.get('/', auth, quizController.getQuizzes);
router.get('/:id', auth, quizController.getQuizById);
router.post('/:id/submit', auth, quizController.submitQuiz);
router.get('/:id/leaderboard', auth, quizController.getLeaderboard);

// CMS Endpoints
router.post('/', ...adminAuth, quizController.createQuiz);
router.put('/:id', ...adminAuth, quizController.updateQuiz);
router.delete('/:id', ...adminAuth, quizController.deleteQuiz);

module.exports = router;
