const FarmingAIKnowledge = require('../models/FarmingAIKnowledge');
const FarmingAIAnalytics = require('../models/FarmingAIAnalytics');

/**
 * Get all AI Knowledge Items
 * GET /api/admin/farming-ai/knowledge
 */
exports.getKnowledgeItems = async (req, res) => {
    try {
        const { category, search } = req.query;
        let filter = {};
        if (category && category !== 'all') filter.category = category;
        if (search) {
            filter.$text = { $search: search };
        }
        const items = await FarmingAIKnowledge.find(filter).sort({ createdAt: -1 });
        return res.json({ success: true, data: items });
    } catch (err) {
        return res.status(500).json({ success: false, msg: 'Failed to fetch AI knowledge items' });
    }
};

/**
 * Create custom AI Knowledge Item / Uploaded Content
 * POST /api/admin/farming-ai/knowledge
 */
exports.createKnowledgeItem = async (req, res) => {
    try {
        const { title, content, category, sourceType, pdfUrl, tags } = req.body;
        if (!title || !content) {
            return res.status(400).json({ success: false, msg: 'Title and content are required' });
        }

        const tagList = Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean);

        const newItem = new FarmingAIKnowledge({
            title,
            content,
            category: category || 'general',
            sourceType: sourceType || 'custom_guideline',
            pdfUrl: pdfUrl || null,
            tags: tagList,
            isApproved: true,
            createdBy: req.user.id
        });

        await newItem.save();
        return res.status(201).json({ success: true, data: newItem });
    } catch (err) {
        return res.status(500).json({ success: false, msg: 'Error creating AI knowledge item' });
    }
};

/**
 * Update AI Knowledge Item
 * PUT /api/admin/farming-ai/knowledge/:id
 */
exports.updateKnowledgeItem = async (req, res) => {
    try {
        const { title, content, category, isApproved, tags } = req.body;
        const item = await FarmingAIKnowledge.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, msg: 'Item not found' });

        if (title !== undefined) item.title = title;
        if (content !== undefined) item.content = content;
        if (category !== undefined) item.category = category;
        if (isApproved !== undefined) item.isApproved = isApproved;
        if (tags !== undefined) {
            item.tags = Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean);
        }

        await item.save();
        return res.json({ success: true, data: item });
    } catch (err) {
        return res.status(500).json({ success: false, msg: 'Error updating knowledge item' });
    }
};

/**
 * Delete AI Knowledge Item
 * DELETE /api/admin/farming-ai/knowledge/:id
 */
exports.deleteKnowledgeItem = async (req, res) => {
    try {
        await FarmingAIKnowledge.findByIdAndDelete(req.params.id);
        return res.json({ success: true, msg: 'Knowledge item deleted' });
    } catch (err) {
        return res.status(500).json({ success: false, msg: 'Error deleting knowledge item' });
    }
};

/**
 * Get AI Assistant Telemetry Analytics Dashboard Stats
 * GET /api/admin/farming-ai/analytics
 */
exports.getAIAnalyticsDashboard = async (req, res) => {
    try {
        const totalQueries = await FarmingAIAnalytics.countDocuments();
        const imageQueries = await FarmingAIAnalytics.countDocuments({ hasImages: true });
        const voiceQueries = await FarmingAIAnalytics.countDocuments({ hasVoice: true });

        // Popular topics
        const popularTopics = await FarmingAIAnalytics.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // Recent queries
        const recentQueries = await FarmingAIAnalytics.find()
            .populate('userId', 'name email role')
            .sort({ createdAt: -1 })
            .limit(20);

        return res.json({
            success: true,
            data: {
                totalQueries,
                imageQueries,
                voiceQueries,
                popularTopics,
                recentQueries
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, msg: 'Error loading AI analytics' });
    }
};
