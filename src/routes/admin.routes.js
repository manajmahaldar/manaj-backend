const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const Listing = require('../models/Listing');
const BuyingPost = require('../models/BuyingPost');
const { auth, admin } = require('../middleware/auth.middleware');

// @route   GET api/admin/stats
// @desc    Get dashboard stats (Admin only)
router.get('/stats', auth, admin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalListings = await Listing.countDocuments();
        const activePosts = await BuyingPost.countDocuments({ status: 'approved' });
        const verifiedUsers = await User.countDocuments({ verifiedStatus: true });
        const pendingApprovals = await Listing.countDocuments({ status: 'pending' }) + 
                                 await BuyingPost.countDocuments({ status: 'pending' });

        res.json({
            totalUsers,
            totalListings,
            activePosts,
            verifiedUsers,
            pendingApprovals
        });
    } catch (err) {
        res.status(500).send('Server error');
    }
});


// @route   POST api/reports
// @desc    Submit a report
router.post('/', auth, async (req, res) => {
    try {
        const { targetId, type, reason } = req.body;
        const report = new Report({
            reporterId: req.user.id,
            targetId,
            type,
            reason
        });
        await report.save();
        res.json(report);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   GET api/admin/users
// @desc    Get all users (Admin only)
router.get('/users', auth, admin, async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } }).select('-password').lean();
        res.json(users);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   GET api/admin/pending-users
// @desc    Get all users pending verification
router.get('/pending-users', auth, admin, async (req, res) => {
    try {
        const users = await User.find({ 
            accountStatus: 'pending',
            aadhaarCard: { $ne: "" } 
        }).select('-password').lean();
        res.json(users);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   PUT api/admin/users/:id/approve-verification
// @desc    Approve user verification
router.put('/users/:id/approve-verification', auth, admin, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id, 
            { accountStatus: 'active', verifiedStatus: true }, 
            { new: true }
        );
        res.json(user);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   PUT api/admin/users/:id/reject-verification
// @desc    Reject user verification
router.put('/users/:id/reject-verification', auth, admin, async (req, res) => {
    try {
        const { reason } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id, 
            { 
                accountStatus: 'pending', 
                verifiedStatus: false,
                verificationRejectedReason: reason || "Documents not clear"
            }, 
            { new: true }
        );
        res.json(user);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   PUT api/admin/users/:id/verify
// @desc    Verify user (Admin only)
router.put('/users/:id/verify', auth, admin, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { verifiedStatus: true }, { new: true });
        res.json(user);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   PUT api/admin/users/:id/status
// @desc    Update user status (Suspend/Activate)
router.put('/users/:id/status', auth, admin, async (req, res) => {
    try {
        const { accountStatus } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { accountStatus }, { new: true });
        res.json(user);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   GET api/admin/pending-listings
// @desc    Get all pending listings (Admin only)
router.get('/pending-listings', auth, admin, async (req, res) => {
    try {
        const listings = await Listing.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
        res.json(listings);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   PUT api/admin/listings/:id/approve
// @desc    Approve a listing (Admin only)
router.put('/listings/:id/approve', auth, admin, async (req, res) => {
    try {
        const listing = await Listing.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
        res.json(listing);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   PUT api/admin/listings/:id/reject
// @desc    Reject a listing (Admin only)
router.put('/listings/:id/reject', auth, admin, async (req, res) => {
    try {
        const listing = await Listing.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
        res.json(listing);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/admin/users/:id
// @desc    Delete a user (Admin only)
router.delete('/users/:id', auth, admin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // 1. Delete user's listings
        await Listing.deleteMany({ sellerId: userId });
        
        // 2. Delete user's buying posts
        await BuyingPost.deleteMany({ traderId: userId });
        
        // 3. Delete the user
        await User.findByIdAndDelete(userId);
        
        res.json({ msg: 'User and all related data removed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
