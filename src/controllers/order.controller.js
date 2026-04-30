const Order = require('../models/Order');
const Listing = require('../models/Listing');
const { publishMessage } = require('../config/rabbitClient');

/**
 * createOrder
 * -----------
 * Anyone can create an order.
 */
exports.createOrder = async (req, res) => {
    try {
        const { listingId, quantity, message } = req.body;
        
        const listing = await Listing.findById(listingId);
        if (!listing) {
            return res.status(404).json({ msg: 'Listing not found' });
        }

        const totalAmount = (parseFloat(listing.price) * parseFloat(quantity)).toString();

        const newOrder = new Order({
            listingId,
            buyerId: req.user.id,
            sellerId: listing.sellerId,
            quantity,
            totalAmount,
            message
        });

        await newOrder.save();

        // Background job for processing
        await publishMessage('order_processing', {
            action: 'CREATE_ORDER',
            orderId: newOrder._id,
            buyerId: newOrder.buyerId,
            sellerId: newOrder.sellerId,
            listingId: newOrder.listingId,
            totalAmount: newOrder.totalAmount
        });

        // Notification to seller
        await publishMessage('notifications', {
            type: 'NEW_ORDER',
            recipientId: newOrder.sellerId,
            message: `You have received a new order for listing ${listing.productName}`
        });

        res.json(newOrder);
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).send('Server error');
    }
};

/**
 * getMyOrders (Sent Orders)
 * -------------------------
 * STRICT ISOLATION: Only orders where current user is the buyer.
 */
exports.getMyOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            Order.find({ buyerId: req.user.id })
                .populate('listingId')
                .populate('sellerId', 'name phone profilePicture district')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Order.countDocuments({ buyerId: req.user.id })
        ]);

        res.json({
            orders,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).send('Server error');
    }
};

/**
 * getIncomingOrders (Received Orders)
 * -----------------------------------
 * STRICT ISOLATION: Only orders where current user is the seller.
 */
exports.getIncomingOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            Order.find({ sellerId: req.user.id })
                .populate('listingId')
                .populate('buyerId', 'name phone profilePicture district')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Order.countDocuments({ sellerId: req.user.id })
        ]);

        res.json({
            orders,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).send('Server error');
    }
};

/**
 * getOrderDetails
 * ---------------
 * IDOR PROTECTION: Only buyer or seller of this order can view it.
 */
exports.getOrderDetails = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('listingId')
            .populate('buyerId', 'name phone district')
            .populate('sellerId', 'name phone district');

        if (!order) {
            return res.status(404).json({ msg: 'Order not found' });
        }

        // Ownership check
        if (order.buyerId._id.toString() !== req.user.id && order.sellerId._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access Denied: You are not a party to this order.' });
        }

        res.json(order);
    } catch (err) {
        res.status(500).send('Server error');
    }
};

/**
 * updateOrderStatus
 * -----------------
 * IDOR PROTECTION: Only the seller can update status.
 */
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        // Find by ID and Seller ID to ensure ownership
        const order = await Order.findOneAndUpdate(
            { _id: req.params.id, sellerId: req.user.id },
            { status },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ msg: 'Order not found or unauthorized' });
        }

        // Notification to buyer
        await publishMessage('notifications', {
            type: 'ORDER_UPDATE',
            recipientId: order.buyerId,
            message: `Your order status has been updated to ${order.status}`
        });

        res.json(order);
    } catch (err) {
        res.status(500).send('Server error');
    }
};
