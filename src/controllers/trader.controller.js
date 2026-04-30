const BuyingPost = require('../models/BuyingPost');
const Order = require('../models/Order');

/**
 * GET /api/trader/dashboard
 * Returns stats scoped to the authenticated trader.
 */
exports.getDashboard = async (req, res) => {
    try {
        const traderId = req.user._id;
        const [totalPosts, pendingPosts, approvedPosts, sentOrders] = await Promise.all([
            BuyingPost.countDocuments({ traderId: traderId }),
            BuyingPost.countDocuments({ traderId: traderId, status: 'pending' }),
            BuyingPost.countDocuments({ traderId: traderId, status: 'approved' }),
            Order.countDocuments({ buyerId: traderId }),
        ]);

        res.json({
            role: 'trader',
            stats: { totalPosts, pendingPosts, approvedPosts, sentOrders }
        });
    } catch (err) {
        console.error('Trader dashboard error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
};

/**
 * GET /api/trader/posts
 */
exports.getPosts = async (req, res) => {
    try {
        const posts = await BuyingPost.find({ traderId: req.user._id }).sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};
