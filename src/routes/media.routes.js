const express = require('express');
const router  = express.Router();
const { auth, admin } = require('../middleware/auth.middleware');
const { upload } = require('../config/cloudinary');
const {
    uploadMedia,
    getAllMedia,
    deleteMedia,
    updateHeroSettings,
    getHeroSettings,
    generateUploadSignature,
    registerMedia,
} = require('../controllers/media.controller');

// ── Admin-protected media routes ──────────────────────────────────────────────

// Upload a single file (image or video)
router.post('/upload', auth, admin, upload.single('file'), uploadMedia);

// Direct signed client-side upload helper endpoints
router.post('/generate-signature', auth, admin, generateUploadSignature);
router.post('/register', auth, admin, registerMedia);

// Get all media (with optional ?type=image|video filter)
router.get('/', auth, admin, getAllMedia);

// Delete a media asset
router.delete('/:id', auth, admin, deleteMedia);

// Update Hero section settings (which video/image to display)
router.put('/hero-settings', auth, admin, updateHeroSettings);

// ── Public route ──────────────────────────────────────────────────────────────

// Fetch current Hero settings (read-only, no auth)
router.get('/hero-settings', getHeroSettings);

module.exports = router;
