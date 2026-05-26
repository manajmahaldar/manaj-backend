const express = require('express');
const router = express.Router();
const { auth, admin, isVerified, authorizeRoles } = require('../middleware/auth.middleware');
const { upload } = require('../config/cloudinary');
const { cache } = require('../middleware/cache');
const postController = require('../controllers/buyingPost.controller');

// @route   POST api/posts
// @desc    Create a buying post
router.post('/', auth, isVerified, authorizeRoles('trader', 'admin'), (req, res, next) => {
    upload.array('photos', 3)(req, res, (err) => {
        if (err) {
            console.error('Multer/Cloudinary Error:', err);
            return res.status(500).json({ msg: 'Image upload failed', error: err.message });
        }
        next();
    });
}, postController.createPost);

// @route   GET api/posts/my-posts
// @desc    Get user's own buying posts
router.get('/my-posts', auth, authorizeRoles('trader'), postController.getMyPosts);

// @route   PUT api/posts/:id
// @desc    Update a buying post
router.put('/:id', auth, isVerified, authorizeRoles('trader', 'admin'), (req, res, next) => {
    upload.array('photos', 3)(req, res, (err) => {
        if (err) {
            console.error('Multer/Cloudinary Error:', err);
            return res.status(500).json({ msg: 'Image upload failed', error: err.message });
        }
        next();
    });
}, postController.updatePost);

// @route   DELETE api/posts/:id
// @desc    Delete a buying post
router.delete('/:id', auth, authorizeRoles('trader', 'admin'), postController.deletePost);

// @route   GET api/posts
// @desc    Get all approved posts
router.get('/', cache(3600), postController.getAllPosts);

// @route   PUT api/posts/:id/status
// @desc    Update post status (Admin only)
router.put('/:id/status', auth, admin, postController.updatePostStatus);

module.exports = router;
