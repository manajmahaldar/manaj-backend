const express = require('express');
const router = express.Router();
const { auth, isVerified, authorizeRoles } = require('../middleware/auth.middleware');
const sellerController = require('../controllers/seller.controller');

// All routes here require 'seller' role
router.use(auth, isVerified, authorizeRoles('seller'));

// @route   GET api/seller/dashboard
// @desc    Get seller dashboard stats
router.get('/dashboard', sellerController.getDashboard);

// @route   GET api/seller/listings
// @desc    Get seller's own listings
router.get('/listings', sellerController.getListings);

module.exports = router;
