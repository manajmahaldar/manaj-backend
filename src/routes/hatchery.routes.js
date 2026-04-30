const express = require('express');
const router = express.Router();
const { auth, isVerified, authorizeRoles } = require('../middleware/auth.middleware');
const hatcheryController = require('../controllers/hatchery.controller');

// All routes here require 'hatchery' role
router.use(auth, isVerified, authorizeRoles('hatchery'));

// @route   GET api/hatchery/dashboard
// @desc    Get hatchery dashboard stats
router.get('/dashboard', hatcheryController.getDashboard);

// @route   GET api/hatchery/listings
// @desc    Get hatchery's own listings
router.get('/listings', hatcheryController.getListings);

module.exports = router;
