const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware').auth;
const { upload, uploadToCloudinary } = require('../config/cloudinary');
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

        const result = await uploadToCloudinary(req.file.buffer, { folder: 'fish_marketplace/profiles' });
        const imageUrl = result.secure_url;

        user.profilePicture = imageUrl;
        await user.save();

        res.json({ 
            msg: 'Profile picture updated successfully', 
            profilePicture: imageUrl
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

// @route   PUT api/users/verify-profile
// @desc    Submit verification documents (Aadhaar and Video)
// @access  Private
router.put('/verify-profile', auth, upload.fields([
    { name: 'aadhaar', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]), async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Update basic info if provided
        if (name) user.name = name;
        if (email) user.email = email;
        if (phone) user.phone = phone;

        // Upload Aadhaar
        if (req.files['aadhaar']) {
            const result = await uploadToCloudinary(req.files['aadhaar'][0].buffer, { 
                folder: 'monaj/verifications/aadhaar',
                resource_type: 'image'
            });
            user.aadhaarCard = result.secure_url;
        }

        // Upload Video
        if (req.files['video']) {
            const result = await uploadToCloudinary(req.files['video'][0].buffer, { 
                folder: 'monaj/verifications/videos',
                resource_type: 'video'
            });
            user.verificationVideo = result.secure_url;
        }

        user.accountStatus = 'pending'; // Reset to pending if they re-submit
        user.verificationRejectedReason = ""; // Clear reason on re-submission

        await user.save();
        res.json({ msg: 'Verification documents submitted successfully', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
