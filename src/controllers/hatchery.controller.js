const Listing = require('../models/Listing');
const Order = require('../models/Order');

/**
 * GET /api/hatchery/dashboard
 * Returns stats scoped to the authenticated hatchery.
 */
exports.getDashboard = async (req, res) => {
    try {
        const hatcheryId = req.user._id;
        const [totalListings, pendingListings, approvedListings, receivedOrders] = await Promise.all([
            Listing.countDocuments({ sellerId: hatcheryId }),
            Listing.countDocuments({ sellerId: hatcheryId, status: 'pending' }),
            Listing.countDocuments({ sellerId: hatcheryId, status: 'approved' }),
            Order.countDocuments({ sellerId: hatcheryId }),
        ]);

        res.json({
            role: 'hatchery',
            stats: { totalListings, pendingListings, approvedListings, receivedOrders }
        });
    } catch (err) {
        console.error('Hatchery dashboard error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
};

/**
 * GET /api/hatchery/listings
 */
exports.getListings = async (req, res) => {
    try {
        const listings = await Listing.find({ sellerId: req.user._id }).sort({ createdAt: -1 });
        res.json(listings);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};
