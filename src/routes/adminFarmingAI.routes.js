const express = require('express');
const router = express.Router();
const {
    getKnowledgeItems,
    createKnowledgeItem,
    updateKnowledgeItem,
    deleteKnowledgeItem,
    getAIAnalyticsDashboard
} = require('../controllers/adminFarmingAI.controller');
const { auth, admin } = require('../middleware/auth.middleware');

// All routes require Auth + Admin role
router.use(auth, admin);

// Knowledge management
router.get('/knowledge', getKnowledgeItems);
router.post('/knowledge', createKnowledgeItem);
router.put('/knowledge/:id', updateKnowledgeItem);
router.delete('/knowledge/:id', deleteKnowledgeItem);

// Analytics
router.get('/analytics', getAIAnalyticsDashboard);

module.exports = router;
