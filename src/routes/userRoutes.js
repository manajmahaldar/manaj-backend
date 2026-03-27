const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth').auth;
const { upload } = require('../config/cloudinary');
const User = require('../models/User');

// @route   POST api/users/profile-picture
// @desc    Upload profile picture
// @access  Private
router.post('/profile-picture', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        user.profilePicture = req.file.path;
        await user.save();

        res.json({ 
            msg: 'Profile picture updated successfully', 
            profilePicture: req.file.path 
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/users/profile
// @desc    Update user profile data
// @access  Private
router.put('/profile', auth, async (req, res) => {
    try {
        const { name, district, phone } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        if (name) user.name = name;
        if (district) user.district = district;
        if (phone) user.phone = phone;

        await user.save();
        res.json({ msg: 'Profile updated successfully', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
