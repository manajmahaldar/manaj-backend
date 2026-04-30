const express = require('express');
const router = express.Router();
const Knowledge = require('../models/Knowledge');
const { auth, admin } = require('../middleware/auth.middleware');

// @route   GET api/knowledge
// @desc    Get all articles
router.get('/', async (req, res) => {
    try {
        const articles = await Knowledge.find().sort({ createdAt: -1 });
        res.json(articles);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   POST api/knowledge
// @desc    Create article (Admin only)
router.post('/', auth, admin, async (req, res) => {
    try {
        const { title, content, youtubeLink } = req.body;
        const article = new Knowledge({
            title,
            content,
            youtubeLink,
            authorId: req.user.id
        });
        await article.save();
        res.json(article);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

module.exports = router;
