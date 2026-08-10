const FarmingAIConversation = require('../models/FarmingAIConversation');
const FarmingAIAnalytics = require('../models/FarmingAIAnalytics');
const { processFarmingAI } = require('../services/farmingAIService');

/**
 * Handle user chat message / image upload / farm context
 * POST /api/farming-ai/chat
 */
exports.handleFarmingAIChat = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role || 'Farmer';
        const {
            message = '',
            imageUrls = [],
            hasVoice = false,
            conversationId = null,
            farmContext = {}
        } = req.body;

        if (!message && imageUrls.length === 0) {
            return res.status(400).json({ success: false, msg: 'Please provide a text question or upload an image.' });
        }

        // 1. Get or create conversation session
        let conversation = null;
        if (conversationId) {
            conversation = await FarmingAIConversation.findOne({ _id: conversationId, userId });
        }

        if (!conversation) {
            const titleSnippet = message ? message.substring(0, 30) + '...' : 'Fish Visual Inspection';
            conversation = new FarmingAIConversation({
                userId,
                title: titleSnippet,
                farmContext: farmContext || {},
                messages: []
            });
        } else if (farmContext && Object.keys(farmContext).length > 0) {
            conversation.farmContext = { ...conversation.farmContext, ...farmContext };
        }

        // 2. Add user message to conversation history
        const userMsg = {
            role: 'user',
            text: message,
            imageUrls,
            hasAudio: !!hasVoice
        };
        conversation.messages.push(userMsg);

        // 3. Process AI advice with RAG & safety checks
        const aiResult = await processFarmingAI({
            message,
            imageUrls,
            farmContext: conversation.farmContext || {},
            conversationHistory: conversation.messages,
            userRole
        });

        // 4. Add assistant response to conversation history
        const assistantMsg = {
            role: 'assistant',
            text: aiResult.answer,
            recommendations: aiResult.recommendations || [],
            visualObservations: aiResult.visualObservations || [],
            possibleCauses: aiResult.possibleCauses || [],
            confidence: aiResult.confidence || 'medium',
            safeNextSteps: aiResult.safeNextSteps || []
        };
        conversation.messages.push(assistantMsg);

        await conversation.save();

        // 5. Log telemetry analytics
        try {
            await FarmingAIAnalytics.create({
                userId,
                userRole,
                queryText: message.substring(0, 200),
                category: req.body.category || 'general',
                hasImages: imageUrls.length > 0,
                hasVoice: !!hasVoice,
                confidenceScore: aiResult.confidence || 'medium',
                recommendationsCount: (aiResult.recommendations || []).length
            });
        } catch (analyticsErr) {
            console.error('Analytics log failed:', analyticsErr.message);
        }

        return res.json({
            success: true,
            conversationId: conversation._id,
            conversationTitle: conversation.title,
            farmContext: conversation.farmContext,
            message: assistantMsg
        });

    } catch (err) {
        console.error('Farming AI Controller Error:', err);
        return res.status(500).json({ success: false, msg: 'Server error processing Farming AI query', error: err.message });
    }
};

/**
 * Get user's conversation sessions
 * GET /api/farming-ai/conversations
 */
exports.getUserConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const conversations = await FarmingAIConversation.find({ userId })
            .select('title farmContext updatedAt createdAt messages')
            .sort({ updatedAt: -1 });

        const formatted = conversations.map(c => ({
            _id: c._id,
            title: c.title,
            updatedAt: c.updatedAt,
            messageCount: c.messages.length,
            lastMessage: c.messages[c.messages.length - 1]?.text?.substring(0, 60) || ''
        }));

        return res.json({ success: true, data: formatted });
    } catch (err) {
        return res.status(500).json({ success: false, msg: 'Failed to fetch conversations' });
    }
};

/**
 * Get single conversation by ID
 * GET /api/farming-ai/conversations/:id
 */
exports.getConversationById = async (req, res) => {
    try {
        const userId = req.user.id;
        const conversation = await FarmingAIConversation.findOne({ _id: req.params.id, userId });
        if (!conversation) {
            return res.status(404).json({ success: false, msg: 'Conversation not found' });
        }
        return res.json({ success: true, data: conversation });
    } catch (err) {
        return res.status(500).json({ success: false, msg: 'Error fetching conversation' });
    }
};

/**
 * Delete single conversation
 * DELETE /api/farming-ai/conversations/:id
 */
exports.deleteConversation = async (req, res) => {
    try {
        const userId = req.user.id;
        await FarmingAIConversation.findOneAndDelete({ _id: req.params.id, userId });
        return res.json({ success: true, msg: 'Conversation deleted' });
    } catch (err) {
        return res.status(500).json({ success: false, msg: 'Error deleting conversation' });
    }
};

/**
 * Clear all conversations
 * DELETE /api/farming-ai/conversations
 */
exports.clearAllConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        await FarmingAIConversation.deleteMany({ userId });
        return res.json({ success: true, msg: 'All conversations cleared' });
    } catch (err) {
        return res.status(500).json({ success: false, msg: 'Error clearing conversations' });
    }
};

/**
 * Track Learning Resource Link Click
 * POST /api/farming-ai/analytics/click
 */
exports.trackResourceClick = async (req, res) => {
    try {
        const { resourceId, resourceTitle } = req.body;
        await FarmingAIAnalytics.create({
            userId: req.user.id,
            userRole: req.user.role || 'Farmer',
            resourceClicked: `${resourceTitle || 'Resource'} (${resourceId || ''})`
        });
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ success: false });
    }
};
