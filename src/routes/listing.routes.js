const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const { auth, admin, isVerified, authorizeRoles } = require('../middleware/auth.middleware');
const listingController = require('../controllers/listing.controller');
const { upload } = require('../config/cloudinary');
const { cache } = require('../middleware/cache');

// @route   POST api/listings
// @desc    Create a listing
router.post('/', auth, isVerified, authorizeRoles('seller', 'farmer', 'hatchery'), (req, res, next) => {
    upload.array('photos', 3)(req, res, (err) => {
        if (err) {
            console.error('Multer/Cloudinary Error:', err);
            return res.status(500).json({ msg: 'Image upload failed', error: err.message });
        }
        next();
    });
}, listingController.createListing);

// @route   GET api/listings
// @desc    Get all approved listings
router.get('/', cache(3600), listingController.getListings);

// @route   GET api/listings/my-listings
// @desc    Get user's own listings (must be BEFORE /:id)
router.get('/my-listings', auth, listingController.getMyListings);

// @route   GET api/listings/:id
// @desc    Get single listing
router.get('/:id', cache(1800), listingController.getListingById);

// @route   PUT api/listings/:id/status
// @desc    Approve/Reject listing (Admin only)
router.put('/:id/status', auth, admin, listingController.updateListingStatus);

// @route   PUT api/listings/:id
// @desc    Update a listing
router.put('/:id', auth, isVerified, authorizeRoles('seller', 'farmer', 'hatchery'), (req, res, next) => {
    upload.array('photos', 3)(req, res, (err) => {
        if (err) {
            console.error('Multer/Cloudinary Error:', err);
            return res.status(500).json({ msg: 'Image upload failed', error: err.message });
        }
        next();
    });
}, listingController.updateListing);

// @route   DELETE api/listings/:id
// @desc    Delete a listing
router.delete('/:id', auth, authorizeRoles('seller', 'farmer', 'hatchery'), listingController.deleteListing);

module.exports = router;
