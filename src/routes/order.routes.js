const express = require('express');
const router = express.Router();
const { auth, isVerified } = require('../middleware/auth.middleware');
const orderController = require('../controllers/order.controller');

// @route   POST api/orders
// @desc    Create an order (Anyone can buy)
router.post('/', auth, orderController.createOrder);

// @route   GET api/orders/my-orders
// @desc    Get orders placed by user (Buyer)
router.get('/my-orders', auth, orderController.getMyOrders);

// @route   GET api/orders/incoming
// @desc    Get orders received by user (Seller)
router.get('/incoming', auth, orderController.getIncomingOrders);

// @route   GET api/orders/:id
// @desc    Get single order details (Buyer or Seller only)
router.get('/:id', auth, orderController.getOrderDetails);

// @route   PATCH api/orders/:id/status
// @desc    Update order status (Verified Seller only)
router.patch('/:id/status', auth, isVerified, orderController.updateOrderStatus);

module.exports = router;
