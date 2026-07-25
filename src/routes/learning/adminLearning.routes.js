const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth.middleware');
const { authorizeRoles } = require('../../middleware/role.middleware');
const adminLearningController = require('../../controllers/learning/adminLearning.controller');

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

module.exports = router;
