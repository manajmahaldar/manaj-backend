const User = require('../models/User');
const Listing = require('../models/Listing');
const Order = require('../models/Order');
const BuyingPost = require('../models/BuyingPost');
const logger = require('../utils/logger');

// @desc    Get dashboard overview stats
exports.getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalListings = await Listing.countDocuments();
        const activePosts = await BuyingPost.countDocuments({ status: 'approved' });
        const verifiedUsers = await User.countDocuments({ verifiedStatus: true });
        
        // New stats for Order Management
        const totalOrders = await Order.countDocuments();
        const pendingDeliveries = await Order.countDocuments({ status: { $in: ['confirmed', 'packed', 'out-for-delivery'] } });
        
        // Calculate total sales
        const completedOrders = await Order.find({ status: 'delivered' }).lean();
        const totalSales = completedOrders.reduce((acc, curr) => acc + parseFloat(curr.totalAmount || 0), 0);

        const pendingApprovals = await Listing.countDocuments({ status: 'pending' }) + 
                                 await BuyingPost.countDocuments({ status: 'pending' });

        res.json({
            totalUsers,
            totalListings,
            activePosts,
            verifiedUsers,
            totalOrders,
            totalSales,
            pendingDeliveries,
            pendingApprovals
        });
    } catch (err) {
        res.status(500).send('Server error');
    }
};

// @desc    Get all orders with pagination
exports.getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const query = status ? { status } : {};
        
        const orders = await Order.find(query)
            .populate('buyerId', 'name phone')
            .populate('sellerId', 'name phone')
            .populate('deliveryBoyId', 'name phone')
            .populate('listingId', 'productName')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean()
            .exec();

        const count = await Order.countDocuments(query);

        res.json({
            orders,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (err) {
        res.status(500).send('Server error');
    }
};

// @desc    Assign delivery partner to order
exports.assignDeliveryPartner = async (req, res) => {
    try {
        const { orderId, deliveryBoyId } = req.body;
        
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ msg: 'Order not found' });

        order.deliveryBoyId = deliveryBoyId;
        order.status = 'confirmed'; // Auto confirm when assigned if it was pending
        order.trackingHistory.push({
            status: 'confirmed',
            note: 'Order confirmed and delivery partner assigned.'
        });

        await order.save();
        logger.info(`Admin assigned delivery partner`, { adminId: req.user.id, orderId, deliveryBoyId });
        res.json(order);
    } catch (err) {
        res.status(500).send('Server error');
    }
};

// @desc    Get list of all delivery partners
exports.getDeliveryPartners = async (req, res) => {
    try {
        const partners = await User.find({ role: 'delivery_partner', accountStatus: 'active' }).select('name phone').lean();
        res.json(partners);
    } catch (err) {
        res.status(500).send('Server error');
    }
};

// @desc    Update product inventory and price (Admin control)
exports.updateProductInventory = async (req, res) => {
    try {
        const { listingId, price, stock } = req.body;
        const updateData = {};
        if (price) {
            updateData.price = price;
            updateData.lastPriceUpdate = Date.now();
        }
        if (stock !== undefined) updateData.stock = stock;

        const listing = await Listing.findByIdAndUpdate(listingId, updateData, { new: true });
        logger.info(`Admin updated product inventory`, { adminId: req.user.id, listingId, updateData });
        res.json(listing);
    } catch (err) {
        res.status(500).send('Server error');
    }
};

// ... include existing user/listing approval logic if needed, or leave in routes if they are simple
