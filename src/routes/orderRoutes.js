const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const orderController = require('../controllers/orderController');

// @route   POST api/orders
// @desc    Create an order (Trader only)
router.post('/', auth, orderController.createOrder);

// @route   GET api/orders/my-orders
// @desc    Get orders placed by user (Buyer)
router.get('/my-orders', auth, orderController.getMyOrders);

// @route   GET api/orders/incoming
// @desc    Get orders received by user (Seller)
router.get('/incoming', auth, orderController.getIncomingOrders);

// @route   PATCH api/orders/:id/status
// @desc    Update order status (Seller only)
router.patch('/:id/status', auth, orderController.updateOrderStatus);

module.exports = router;
