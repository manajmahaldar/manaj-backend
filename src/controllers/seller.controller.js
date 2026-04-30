const Listing = require('../models/Listing');
const Order = require('../models/Order');

/**
 * GET /api/seller/dashboard
 * Returns stats scoped to the authenticated seller.
 */
exports.getDashboard = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const [totalListings, pendingListings, approvedListings, receivedOrders] = await Promise.all([
            Listing.countDocuments({ sellerId: sellerId }),
            Listing.countDocuments({ sellerId: sellerId, status: 'pending' }),
            Listing.countDocuments({ sellerId: sellerId, status: 'approved' }),
            Order.countDocuments({ sellerId: sellerId }),
        ]);

        res.json({
            role: 'seller',
            stats: { totalListings, pendingListings, approvedListings, receivedOrders }
        });
    } catch (err) {
        console.error('Seller dashboard error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
};

/**
 * GET /api/seller/listings
 */
exports.getListings = async (req, res) => {
    try {
        const listings = await Listing.find({ sellerId: req.user._id }).sort({ createdAt: -1 });
        res.json(listings);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};
