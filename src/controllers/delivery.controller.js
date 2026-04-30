const Order = require('../models/Order');

// @desc    Get orders assigned to delivery partner
exports.getAssignedOrders = async (req, res) => {
    try {
        const orders = await Order.find({ deliveryBoyId: req.user.id })
            .populate('buyerId', 'name phone district')
            .populate('listingId', 'productName photos')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).send('Server error');
    }
};

// @desc    Update order status by delivery partner
exports.updateDeliveryStatus = async (req, res) => {
    try {
        const { status, note } = req.body;
        const validStatuses = ['packed', 'out-for-delivery', 'delivered'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ msg: 'Invalid status for delivery partner' });
        }

        const order = await Order.findOne({ _id: req.params.id, deliveryBoyId: req.user.id });
        if (!order) return res.status(404).json({ msg: 'Order not found or not assigned to you' });

        order.status = status;
        order.trackingHistory.push({
            status,
            note: note || `Order marked as ${status} by delivery partner.`
        });

        if (status === 'delivered') {
            order.paymentStatus = 'paid'; // Assuming COD is paid on delivery
        }

        await order.save();
        res.json(order);
    } catch (err) {
        res.status(500).send('Server error');
    }
};
