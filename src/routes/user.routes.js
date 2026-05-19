const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware').auth;
const { upload, uploadToCloudinary } = require('../config/cloudinary');
const User = require('../models/User');

// @route   GET api/users/profile
// @desc    Get current authenticated user's profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

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
        const { name, district, localDistrict, policeStation, phone } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        if (name) user.name = name;
        if (district) user.district = district;
        if (localDistrict !== undefined) user.localDistrict = localDistrict;
        if (policeStation !== undefined) user.policeStation = policeStation;
        
        if (phone) {
            // Normalize and validate Indian mobile number
            const digits = phone.replace(/\D/g, '');
            let normalized = digits;
            if (digits.length === 12 && digits.startsWith('91')) {
                normalized = digits.slice(2);
            } else if (digits.length === 11 && digits.startsWith('0')) {
                normalized = digits.slice(1);
            }
            if (!/^[6-9]\d{9}$/.test(normalized)) {
                return res.status(400).json({ msg: 'Invalid Indian mobile number. Fake numbers are not allowed.' });
            }
            const phoneExists = await User.findOne({ phone: normalized, _id: { $ne: user._id } });
            if (phoneExists) {
                return res.status(400).json({ msg: 'This mobile number is already linked to another account.' });
            }
            user.phone = normalized;
        }

        await user.save();
        res.json({ msg: 'Profile updated successfully', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/users/verify-profile
// @desc    Submit verification documents (Profile Pic, Aadhaar and Video)
// @access  Private
const multerUpload = upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'aadhaar', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]);

router.put('/verify-profile', auth, (req, res, next) => {
    multerUpload(req, res, (err) => {
        if (err) {
            console.error('[verify-profile] Multer error:', err.message);
            return res.status(400).json({ msg: `File upload error: ${err.message}` });
        }
        next();
    });
}, async (req, res) => {
    try {
        const { name, email, phone, district, localDistrict, policeStation } = req.body;
        console.log('[verify-profile] Received body fields:', { name, email, phone, district, localDistrict, policeStation });
        console.log('[verify-profile] Received files:', Object.keys(req.files || {}).map(k => `${k} (${req.files[k][0]?.mimetype}, ${req.files[k][0]?.size} bytes)`));

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Update basic info if provided
        if (name) user.name = name;
        if (email) user.email = email;
        if (district) user.district = district;
        if (localDistrict !== undefined) user.localDistrict = localDistrict;
        if (policeStation !== undefined) user.policeStation = policeStation;

        if (phone) {
            // Normalize and validate Indian mobile number
            const digits = phone.replace(/\D/g, '');
            let normalized = digits;
            if (digits.length === 12 && digits.startsWith('91')) {
                normalized = digits.slice(2);
            } else if (digits.length === 11 && digits.startsWith('0')) {
                normalized = digits.slice(1);
            }
            if (!/^[6-9]\d{9}$/.test(normalized)) {
                return res.status(400).json({ msg: 'Invalid Indian mobile number. Fake numbers are not allowed.' });
            }
            const phoneExists = await User.findOne({ phone: normalized, _id: { $ne: user._id } });
            if (phoneExists) {
                return res.status(400).json({ msg: 'This mobile number is already linked to another account.' });
            }
            user.phone = normalized;
        }

        // Upload Profile Picture
        if (req.files && req.files['profilePicture']) {
            console.log('[verify-profile] Uploading profile picture...');
            const result = await uploadToCloudinary(req.files['profilePicture'][0].buffer, { 
                folder: 'monaj/profiles',
                resource_type: 'image'
            });
            user.profilePicture = result.secure_url;
            console.log('[verify-profile] Profile picture uploaded:', result.secure_url);
        }

        // Upload Aadhaar
        if (req.files && req.files['aadhaar']) {
            console.log('[verify-profile] Uploading Aadhaar...');
            const result = await uploadToCloudinary(req.files['aadhaar'][0].buffer, { 
                folder: 'monaj/verifications/aadhaar',
                resource_type: 'image'
            });
            user.aadhaarCard = result.secure_url;
            console.log('[verify-profile] Aadhaar uploaded:', result.secure_url);
        }

        // Upload Video
        if (req.files && req.files['video']) {
            console.log('[verify-profile] Uploading verification video...');
            const result = await uploadToCloudinary(req.files['video'][0].buffer, { 
                folder: 'monaj/verifications/videos',
                resource_type: 'video'
            });
            user.verificationVideo = result.secure_url;
            console.log('[verify-profile] Video uploaded:', result.secure_url);
        }

        user.accountStatus = 'pending';
        user.verificationRejectedReason = '';

        await user.save();
        console.log(`[verify-profile] User ${user._id} (${user.name}) submitted verification successfully.`);
        console.log(`  aadhaarCard: ${user.aadhaarCard}`);
        console.log(`  verificationVideo: ${user.verificationVideo}`);
        res.json({ msg: 'Verification documents submitted successfully', user });
    } catch (err) {
        console.error('[verify-profile] Error:', err.message);
        res.status(500).json({ msg: 'Server error during verification upload. Please try again.' });
    }
});

module.exports = router;
