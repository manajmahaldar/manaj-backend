const express = require('express');
const router = express.Router();
const { auth, isVerified, authorizeRoles } = require('../middleware/auth.middleware');
const farmerController = require('../controllers/farmer.controller');

// All routes here require 'farmer' role
router.use(auth, isVerified, authorizeRoles('farmer'));

// @route   GET api/farmer/dashboard
// @desc    Get farmer dashboard stats
router.get('/dashboard', farmerController.getDashboard);

// @route   GET api/farmer/listings
// @desc    Get farmer's own listings
router.get('/listings', farmerController.getListings);

module.exports = router;
