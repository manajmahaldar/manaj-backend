const express = require('express');
const router = express.Router();
const { auth, isVerified, authorizeRoles } = require('../middleware/auth.middleware');
const traderController = require('../controllers/trader.controller');

// All routes here require 'trader' role
router.use(auth, isVerified, authorizeRoles('trader'));

// @route   GET api/trader/dashboard
// @desc    Get trader dashboard stats
router.get('/dashboard', traderController.getDashboard);

// @route   GET api/trader/posts
// @desc    Get trader's own buying posts
router.get('/posts', traderController.getPosts);

module.exports = router;
