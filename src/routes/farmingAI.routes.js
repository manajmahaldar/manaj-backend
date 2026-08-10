const express = require('express');
const router = express.Router();
const {
    handleFarmingAIChat,
    getUserConversations,
    getConversationById,
    deleteConversation,
    clearAllConversations,
    trackResourceClick
} = require('../controllers/farmingAI.controller');
const { auth } = require('../middleware/auth.middleware');

// All endpoints require authentication (available to Farmer, Seller, Trader, Hatchery)
router.use(auth);

// Chat & AI Processing
router.post('/chat', handleFarmingAIChat);

// Conversation management
router.get('/conversations', getUserConversations);
router.get('/conversations/:id', getConversationById);
router.delete('/conversations/:id', deleteConversation);
router.delete('/conversations', clearAllConversations);

// Telemetry & analytics tracking
router.post('/analytics/click', trackResourceClick);

module.exports = router;
