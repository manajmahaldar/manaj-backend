const { processAIRequest } = require('../services/aiAgentEngine');

/**
 * AI Agent Process Endpoint Controller
 * POST /api/ai/process
 */
exports.handleAIProcess = async (req, res) => {
    try {
        const { message, context, history, language } = req.body;
        const user = req.user || null;

        if (!message && !context) {
            return res.status(400).json({ msg: 'Message or context is required.' });
        }

        const result = await processAIRequest({
            message: message || '',
            context: context || {},
            user,
            language: language || 'en'
        });

        return res.json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error('AI Controller Error:', err);
        return res.status(500).json({ msg: 'AI Processing Server Error', error: err.message });
    }
};
