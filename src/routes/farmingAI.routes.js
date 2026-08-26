const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
    handleFarmingAIChat,
    getUserConversations,
    getConversationById,
    deleteConversation,
    clearAllConversations,
    trackResourceClick
} = require('../controllers/farmingAI.controller');
const { auth } = require('../middleware/auth.middleware');

// Rate limiter specifically for farming AI queries (max 20 questions per minute)
const farmingChatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, msg: 'Too many farming queries. Please slow down and try again in a minute.' }
});

// All endpoints require authentication (available to Farmer, Seller, Trader, Hatchery)
router.use(auth);

// Chat & AI Processing
router.post('/chat', farmingChatLimiter, handleFarmingAIChat);

// Conversation management
router.get('/conversations', getUserConversations);
router.get('/conversations/:id', getConversationById);
router.delete('/conversations/:id', deleteConversation);
router.delete('/conversations', clearAllConversations);

// Telemetry & analytics tracking
router.post('/analytics/click', trackResourceClick);

module.exports = router;
