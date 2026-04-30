const Listing = require('../models/Listing');
const Order = require('../models/Order');

/**
 * GET /api/farmer/dashboard
 * Returns stats scoped to the authenticated farmer.
 */
exports.getDashboard = async (req, res) => {
    try {
        const farmerId = req.user._id;
        const [totalListings, pendingListings, approvedListings, receivedOrders] = await Promise.all([
            Listing.countDocuments({ sellerId: farmerId }),
            Listing.countDocuments({ sellerId: farmerId, status: 'pending' }),
            Listing.countDocuments({ sellerId: farmerId, status: 'approved' }),
            Order.countDocuments({ sellerId: farmerId }),
        ]);

        res.json({
            role: 'farmer',
            stats: { totalListings, pendingListings, approvedListings, receivedOrders }
        });
    } catch (err) {
        console.error('Farmer dashboard error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
};

/**
 * GET /api/farmer/listings
 * Returns only this farmer's listings.
 */
exports.getListings = async (req, res) => {
    try {
        const listings = await Listing.find({ sellerId: req.user._id }).sort({ createdAt: -1 });
        res.json(listings);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};
