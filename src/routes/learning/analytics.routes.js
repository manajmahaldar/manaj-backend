const express = require('express');
const router = express.Router();
const analyticsController = require('../../controllers/learning/analytics.controller');
const { auth, admin } = require('../../middleware/auth.middleware');

router.get('/', auth, admin, analyticsController.getLearningAnalytics);

module.exports = router;
