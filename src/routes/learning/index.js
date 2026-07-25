const express = require('express');
const router = express.Router();

const contentRoutes = require('./content.routes');
const userLearningRoutes = require('./userLearning.routes');
const quizRoutes = require('./quiz.routes');
const certificateRoutes = require('./certificate.routes');
const schemeRoutes = require('./scheme.routes');
const analyticsRoutes = require('./analytics.routes');
const adminLearningRoutes = require('./adminLearning.routes');

router.use('/content', contentRoutes);
router.use('/user', userLearningRoutes);
router.use('/quiz', quizRoutes);
router.use('/certificate', certificateRoutes);
router.use('/scheme', schemeRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminLearningRoutes);

module.exports = router;
