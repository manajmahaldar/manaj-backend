const express = require('express');
const router = express.Router();
const userLearningController = require('../../controllers/learning/userLearning.controller');
const { auth } = require('../../middleware/auth.middleware');

router.post('/track', auth, userLearningController.trackProgress);
router.post('/bookmark', auth, userLearningController.toggleBookmark);
router.get('/bookmarks', auth, userLearningController.getBookmarks);
router.get('/recent', auth, userLearningController.getRecentlyViewed);
router.get('/continue', auth, userLearningController.getContinueLearning);
router.get('/progress-stats', auth, userLearningController.getMyProgress);

module.exports = router;
