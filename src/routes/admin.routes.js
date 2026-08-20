const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const Listing = require('../models/Listing');
const BuyingPost = require('../models/BuyingPost');
const { auth, admin } = require('../middleware/auth.middleware');
const { cache, clearCache } = require('../middleware/cache');

// @route   GET api/admin/stats
// @desc    Get dashboard stats (Admin only)
router.get('/stats', auth, admin, cache(300), async (req, res) => {
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
// @desc    Get users with filtering, pagination, search, and sorting (Admin only)
router.get('/users', auth, admin, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            role,
            state,        // maps to 'district' field in DB
            district,     // maps to 'localDistrict' field in DB
            policeStation,
            accountStatus,
            verifiedStatus,
            isFlagged,
            dateFrom,
            dateTo,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

        // Build filter query
        const query = { role: { $ne: 'admin' } };

        if (role) query.role = role;
        if (state) query.district = state; // 'district' field stores State
        if (district) query.localDistrict = district;
        if (policeStation) query.policeStation = { $regex: policeStation, $options: 'i' };
        if (accountStatus) query.accountStatus = accountStatus;
        if (verifiedStatus !== undefined && verifiedStatus !== '') {
            query.verifiedStatus = verifiedStatus === 'true';
        }
        if (isFlagged !== undefined && isFlagged !== '') {
            query.isFlagged = isFlagged === 'true';
        }

        // Date range filter
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) query.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
        }

        // Search (name, phone, or MongoDB ObjectId)
        if (search) {
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(search);
            if (isObjectId) {
                query._id = search;
            } else {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } }
                ];
            }
        }

        // Sort
        const allowedSortFields = ['createdAt', 'name', 'role', 'accountStatus', 'district', 'localDistrict'];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password -refreshTokens -resetPasswordToken -resetPasswordExpires -failedLoginAttempts -lockUntil')
                .sort(sort)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            User.countDocuments(query)
        ]);

        res.json({
            users,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            limit: limitNum
        });
    } catch (err) {
        console.error('admin users error:', err);
        res.status(500).send('Server error');
    }
});

// @route   GET api/admin/pending-users
// @desc    Get users awaiting admin approval (admin review queue)
router.get('/pending-users', auth, admin, async (req, res) => {
    try {
        const pendingUsers = await User.find({ 
            accountStatus: 'pending',
            role: { $ne: 'admin' }
        })
        .select('-password -refreshTokens -resetPasswordToken -resetPasswordExpires -failedLoginAttempts -lockUntil')
        .sort({ createdAt: -1 })
        .lean();

        res.json({ 
            users: pendingUsers,
            pendingRegistrationsCount: pendingUsers.length
        });
    } catch (err) {
        console.error('pending-users error:', err);
        res.status(500).send('Server error');
    }
});

// @route   GET api/admin/users/analytics
// @desc    Get user analytics for admin dashboard (Admin only)
router.get('/users/analytics', auth, admin, cache(3600), async (req, res) => {
    try {
        const [roleCounts, statusCounts, stateCounts, districtCounts, registrationTrend] = await Promise.all([
            // Count per role
            User.aggregate([
                { $match: { role: { $ne: 'admin' } } },
                { $group: { _id: '$role', count: { $sum: 1 } } }
            ]),
            // Count per verification/account status
            User.aggregate([
                { $match: { role: { $ne: 'admin' } } },
                { $group: { _id: { accountStatus: '$accountStatus', verifiedStatus: '$verifiedStatus' }, count: { $sum: 1 } } }
            ]),
            // State-wise distribution
            User.aggregate([
                { $match: { role: { $ne: 'admin' }, district: { $nin: [null, ''] } } },
                { $group: { _id: '$district', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            // District-wise distribution (top 15)
            User.aggregate([
                { $match: { role: { $ne: 'admin' }, localDistrict: { $nin: [null, ''] } } },
                { $group: { _id: '$localDistrict', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 15 }
            ]),
            // Registration trend — last 12 months
            User.aggregate([
                { $match: { role: { $ne: 'admin' }, createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
                { $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    count: { $sum: 1 }
                }},
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ])
        ]);

        // Transform role counts into object
        const byRole = {};
        roleCounts.forEach(r => { byRole[r._id] = r.count; });

        // Transform status counts
        let verified = 0, pending = 0, rejected = 0, suspended = 0, active = 0;
        statusCounts.forEach(s => {
            if (s._id.accountStatus === 'suspended') suspended += s.count;
            else if (s._id.accountStatus === 'pending') pending += s.count;
            else if (s._id.accountStatus === 'active') active += s.count;
            if (s._id.verifiedStatus) verified += s.count;
        });

        // Transform trend data
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const trend = registrationTrend.map(t => ({
            month: `${monthNames[t._id.month - 1]} ${t._id.year}`,
            count: t.count
        }));

        res.json({
            byRole,
            byStatus: { verified, pending, rejected, suspended, active },
            byState: stateCounts.map(s => ({ name: s._id, count: s.count })),
            byDistrict: districtCounts.map(d => ({ name: d._id, count: d.count })),
            registrationTrend: trend,
            total: Object.values(byRole).reduce((a, b) => a + b, 0)
        });
    } catch (err) {
        console.error('analytics error:', err);
        res.status(500).send('Server error');
    }
});

// @route   GET api/admin/users/locations
// @desc    Get distinct locations from DB for cascading filter dropdowns (Admin only)
router.get('/users/locations', auth, admin, async (req, res) => {
    try {
        const { state, district: districtParam } = req.query;

        // Always return distinct states
        const states = await User.distinct('district', { role: { $ne: 'admin' }, district: { $nin: [null, ''] } });

        let districts = [];
        let policeStations = [];

        // If state is selected, return its districts
        if (state) {
            districts = await User.distinct('localDistrict', {
                role: { $ne: 'admin' },
                district: state,
                localDistrict: { $nin: [null, ''] }
            });
        }

        // If district is selected, return its police stations
        if (state && districtParam) {
            policeStations = await User.distinct('policeStation', {
                role: { $ne: 'admin' },
                district: state,
                localDistrict: districtParam,
                policeStation: { $nin: [null, ''] }
            });
        }

        res.json({ states: states.sort(), districts: districts.sort(), policeStations: policeStations.sort() });
    } catch (err) {
        console.error('locations error:', err);
        res.status(500).send('Server error');
    }
});


// @route   GET api/admin/users/:id
// @desc    Get a single user's full details (Admin only)
router.get('/users/:id', auth, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -refreshTokens -resetPasswordToken -resetPasswordExpires -failedLoginAttempts -lockUntil')
            .lean();
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error('get user by id error:', err);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/admin/users/:id/approve-verification
// @desc    Approve user verification (with audit trail)
router.put('/users/:id/approve-verification', auth, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.accountStatus = 'active';
        user.verifiedStatus = true;
        user.verifiedBy = req.user.id;
        user.verifiedAt = new Date();
        user.verificationRejectedReason = '';
        user.verificationHistory.push({
            status: 'verified',
            changedBy: req.user.id,
            changedAt: new Date(),
            reason: 'Approved by admin'
        });
        await user.save();
        res.json(user);
    } catch (err) {
        console.error('approve-verification error:', err);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/admin/users/:id/reject-verification
// @desc    Reject user verification (with audit trail)
router.put('/users/:id/reject-verification', auth, admin, async (req, res) => {
    try {
        const { reason } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.accountStatus = 'pending';
        user.verifiedStatus = false;
        user.verificationRejectedReason = reason || 'Documents not clear';
        user.verificationHistory.push({
            status: 'rejected',
            changedBy: req.user.id,
            changedAt: new Date(),
            reason: reason || 'Documents not clear'
        });
        await user.save();
        res.json(user);
    } catch (err) {
        console.error('reject-verification error:', err);
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

// @route   PUT api/admin/users/:id/unflag
// @desc    Unflag a user (Admin only)
router.put('/users/:id/unflag', auth, admin, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { 
            isFlagged: false,
            trustScore: 100,
            fraudReason: ''
        }, { new: true });
        res.json(user);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   GET api/admin/pending-listings
// @desc    Get all pending listings and buying posts (Admin only)
router.get('/pending-listings', auth, admin, async (req, res) => {
    try {
        const listings = await Listing.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
        const posts = await BuyingPost.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
        
        // Combine and add type indicator for frontend
        const combined = [
            ...listings.map(l => ({ ...l, type: 'listing' })),
            ...posts.map(p => ({ ...p, type: 'post' }))
        ].sort((a, b) => b.createdAt - a.createdAt);

        res.json(combined);
    } catch (err) {
        res.status(500).send('Server error');
    }
});


// @route   PUT api/admin/listings/:id/approve
// @desc    Approve a listing (Admin only)
router.put('/listings/:id/approve', auth, admin, async (req, res) => {
    try {
        const listing = await Listing.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
        clearCache('/api/listings');
        res.json(listing);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   PUT api/admin/listings/:id/reject
// @desc    Reject a listing (Admin only)
router.put('/listings/:id/reject', auth, admin, async (req, res) => {
    try {
        const { reason } = req.body;
        const listing = await Listing.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectionReason: reason || '' }, { new: true });
        clearCache('/api/listings');
        res.json(listing);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   PUT api/admin/posts/:id/approve
// @desc    Approve a buying post (Admin only)
router.put('/posts/:id/approve', auth, admin, async (req, res) => {
    try {
        const post = await BuyingPost.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
        clearCache('/api/posts');
        res.json(post);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   PUT api/admin/posts/:id/reject
// @desc    Reject a buying post (Admin only)
router.put('/posts/:id/reject', auth, admin, async (req, res) => {
    try {
        const { reason } = req.body;
        const post = await BuyingPost.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectionReason: reason || '' }, { new: true });
        clearCache('/api/posts');
        res.json(post);
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
