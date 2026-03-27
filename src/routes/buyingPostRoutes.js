const express = require('express');
const router = express.Router();
const BuyingPost = require('../models/BuyingPost');
const { auth, admin } = require('../middlewares/auth');
const { upload, uploadToCloudinary } = require('../config/cloudinary');

// @route   POST api/posts
// @desc    Create a buying post
router.post('/', auth, (req, res, next) => {
    upload.array('photos', 3)(req, res, (err) => {
        if (err) {
            console.error('Multer/Cloudinary Error:', err);
            return res.status(500).json({ msg: 'Image upload failed', error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (req.user.role !== 'trader' && req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Only traders can create buying posts' });
        }

        const { category, fishName, size, requiredQuantity, buyingPrice, district, phoneNumber } = req.body;
        const photos = req.files && req.files.length > 0
            ? await Promise.all(req.files.map(file => uploadToCloudinary(file.buffer).then(r => r.secure_url)))
            : [];
        
        const newPost = new BuyingPost({
            traderId: req.user.id,
            category,
            fishName,
            size,
            requiredQuantity,
            buyingPrice,
            district,
            phoneNumber,
            photos
        });

        await newPost.save();
        res.json(newPost);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   GET api/posts/my-posts
// @desc    Get user's own buying posts
router.get('/my-posts', auth, async (req, res) => {
    try {
        const posts = await BuyingPost.find({ traderId: req.user.id }).sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   PUT api/posts/:id
// @desc    Update a buying post
router.put('/:id', auth, (req, res, next) => {
    upload.array('photos', 3)(req, res, (err) => {
        if (err) {
            console.error('Multer/Cloudinary Error:', err);
            return res.status(500).json({ msg: 'Image upload failed', error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        const { category, fishName, size, requiredQuantity, buyingPrice, district, phoneNumber } = req.body;
        
        let post = await BuyingPost.findOne({ _id: req.params.id, traderId: req.user.id });
        if (!post) {
            return res.status(404).json({ msg: 'Post not found or unauthorized' });
        }

        let updateFields = { category, fishName, size, requiredQuantity, buyingPrice, district, phoneNumber };
        if (req.files && req.files.length > 0) {
            updateFields.photos = await Promise.all(
                req.files.map(file => uploadToCloudinary(file.buffer).then(r => r.secure_url))
            );
        }

        post = await BuyingPost.findByIdAndUpdate(
            req.params.id,
            { $set: updateFields },
            { new: true }
        );

        res.json(post);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/posts/:id
// @desc    Delete a buying post
router.delete('/:id', auth, async (req, res) => {
    try {
        const post = await BuyingPost.findOneAndDelete({ _id: req.params.id, traderId: req.user.id });
        if (!post) {
            return res.status(404).json({ msg: 'Post not found or unauthorized' });
        }
        res.json({ msg: 'Post removed' });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   GET api/posts
// @desc    Get all approved posts
router.get('/', async (req, res) => {
    try {
        const { category, district, search } = req.query;
        let query = { status: 'approved' };
        
        if (category) {
            query.category = category.toLowerCase();
        }
        if (district) {
            query.district = district;
        }
        if (search) {
            query.$or = [
                { fishName: { $regex: search, $options: 'i' } },
                { district: { $regex: search, $options: 'i' } }
            ];
        }

        const posts = await BuyingPost.find(query).sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// @route   PUT api/posts/:id/status
// @desc    Update post status (Admin only)
router.put('/:id/status', auth, admin, async (req, res) => {
    try {
        const { status } = req.body;
        const post = await BuyingPost.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json(post);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

module.exports = router;
