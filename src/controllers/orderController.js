const Order = require('../models/Order');
const Listing = require('../models/Listing');

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

        res.json(order);
    } catch (err) {
        res.status(500).send('Server error');
    }
};
