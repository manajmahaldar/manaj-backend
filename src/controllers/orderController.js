const Order = require('../models/Order');
const Listing = require('../models/Listing');
const { publishMessage } = require('../config/rabbitClient');

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

        // Dispatch background job to process the order
        await publishMessage('order_processing', {
            action: 'CREATE_ORDER',
            orderId: newOrder._id,
            buyerId: newOrder.buyerId,
            sellerId: newOrder.sellerId,
            listingId: newOrder.listingId,
            totalAmount: newOrder.totalAmount
        });

        // Optional: Dispatch a notification event
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

exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ buyerId: req.user.id })
            .populate('listingId')
            .populate('sellerId', 'name phone')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).send('Server error');
    }
};

exports.getIncomingOrders = async (req, res) => {
    try {
        const orders = await Order.find({ sellerId: req.user.id })
            .populate('listingId')
            .populate('buyerId', 'name phone')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).send('Server error');
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findOneAndUpdate(
            { _id: req.params.id, sellerId: req.user.id },
            { status },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ msg: 'Order not found or unauthorized' });
        }

        // Dispatch background job for payment updates or status hooks
        await publishMessage('order_processing', {
            action: 'UPDATE_STATUS',
            orderId: order._id,
            status: order.status
        });

        // Dispatch notification directly to queue
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
