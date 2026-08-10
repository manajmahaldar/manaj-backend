const express = require('express');
const router = express.Router();
const { handleAIProcess } = require('../controllers/ai.controller');
const { auth } = require('../middleware/auth.middleware');

// Optional Auth Middleware (attaches req.user if token present)
const optionalAuth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return next();
    return auth(req, res, next);
};

// POST /api/ai/process
router.post('/process', optionalAuth, handleAIProcess);

module.exports = router;
