const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth.middleware');
const { authorizeRoles } = require('../../middleware/role.middleware');
const adminLearningController = require('../../controllers/learning/adminLearning.controller');
const { upload, uploadToCloudinary } = require('../../config/cloudinary');


// Enforce Main Admin authentication for all admin CMS endpoints
router.use(auth);
router.use(authorizeRoles('admin', 'superadmin'));

// Media Library
router.get('/media', adminLearningController.getMediaAssets);
router.post('/media', adminLearningController.uploadMediaAsset);
router.delete('/media/:id', adminLearningController.deleteMediaAsset);
router.put('/media/:id/replace', adminLearningController.replaceMediaAsset);

// Courses & Modules
router.get('/courses', adminLearningController.getCourses);
router.post('/courses', adminLearningController.createCourse);
router.put('/courses/:id', adminLearningController.updateCourse);
router.delete('/courses/:id', adminLearningController.deleteCourse);

// Webinars & Training Programs
router.get('/webinars', adminLearningController.getWebinars);
router.post('/webinars', adminLearningController.createWebinar);
router.put('/webinars/:id', adminLearningController.updateWebinar);
router.delete('/webinars/:id', adminLearningController.deleteWebinar);

// Bulk Management & Broadcast Notifications
router.post('/bulk-action', adminLearningController.bulkActionContent);
router.post('/notifications/broadcast', adminLearningController.sendBroadcastNotification);

// ── Video / File Upload to Cloudinary ───────────────────────────────────────
router.post('/upload-video', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, msg: 'No file provided' });

        const isVideo = req.file.mimetype.startsWith('video/');
        const result = await uploadToCloudinary(req.file.buffer, {
            folder: 'learning/videos',
            resource_type: isVideo ? 'video' : 'auto',
            file: req.file
        });

        res.json({ success: true, url: result.secure_url, publicId: result.public_id, format: result.format, duration: result.duration || 0 });
    } catch (err) {
        console.error('[Upload Video Error]', err);
        res.status(500).json({ success: false, msg: err.message });
    }
});


module.exports = router;
