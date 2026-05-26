const SiteMedia    = require('../models/SiteMedia');
const HeroSettings = require('../models/HeroSettings');
const { cloudinary, uploadToCloudinary } = require('../config/cloudinary');
const { clearCache } = require('../middleware/cache');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Upload a file (image or video) to Cloudinary and save metadata in DB
// @route   POST /api/admin/media/upload
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file provided.' });
        }

        const isVideo  = req.file.mimetype.startsWith('video/');
        const folder   = 'fish_marketplace/admin_media';
        const caption  = req.body.caption || '';

        const uploadResult = await uploadToCloudinary(req.file.buffer, {
            folder,
            resource_type: isVideo ? 'video' : 'image',
            // For videos: use eager async transformation only in prod; keep simple here
        });

        const media = await SiteMedia.create({
            url:          uploadResult.secure_url,
            publicId:     uploadResult.public_id,
            resourceType: isVideo ? 'video' : 'image',
            format:       uploadResult.format    || '',
            bytes:        uploadResult.bytes      || 0,
            width:        uploadResult.width      || 0,
            height:       uploadResult.height     || 0,
            duration:     uploadResult.duration   || 0,
            caption,
            folder,
            uploadedBy: req.user.id,
        });

        logger.info('Admin uploaded media', { adminId: req.user.id, publicId: uploadResult.public_id });

        res.status(201).json({
            msg: 'Upload successful',
            media,
        });
    } catch (err) {
        logger.error('Media upload failed', { error: err.message });
        res.status(500).json({ msg: err.message || 'Upload failed' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all uploaded media (paginated), optionally filter by type
// @route   GET /api/admin/media?type=image|video&page=1&limit=20
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllMedia = async (req, res) => {
    try {
        const { type, page = 1, limit = 30 } = req.query;
        const query = type ? { resourceType: type } : {};

        const [media, total] = await Promise.all([
            SiteMedia.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(Number(limit))
                .lean(),
            SiteMedia.countDocuments(query),
        ]);

        res.json({ media, total, page: Number(page), limit: Number(limit) });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to fetch media' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Delete a media asset from Cloudinary and DB
// @route   DELETE /api/admin/media/:id
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteMedia = async (req, res) => {
    try {
        const media = await SiteMedia.findById(req.params.id);
        if (!media) return res.status(404).json({ msg: 'Media not found' });

        // Delete from Cloudinary
        await cloudinary.uploader.destroy(media.publicId, {
            resource_type: media.resourceType,
        });

        await SiteMedia.findByIdAndDelete(req.params.id);

        // Check and clear references in HeroSettings
        const heroSettings = await HeroSettings.findOne({});
        if (heroSettings) {
            let updated = false;
            if (heroSettings.video1Id === media.publicId || heroSettings.video1Url === media.url) {
                heroSettings.video1Url = '';
                heroSettings.video1Id = '';
                updated = true;
            }
            if (heroSettings.video2Id === media.publicId || heroSettings.video2Url === media.url) {
                heroSettings.video2Url = '';
                heroSettings.video2Id = '';
                updated = true;
            }
            if (heroSettings.heroImageId === media.publicId || heroSettings.heroImageUrl === media.url) {
                heroSettings.heroImageUrl = '';
                heroSettings.heroImageId = '';
                updated = true;
            }
            if (updated) {
                await heroSettings.save();
                logger.info('Cleared deleted media from hero settings', { publicId: media.publicId });
            }
        }

        logger.info('Admin deleted media', { adminId: req.user.id, publicId: media.publicId });
        res.json({ msg: 'Deleted successfully' });
    } catch (err) {
        logger.error('Media delete failed', { error: err.message });
        res.status(500).json({ msg: 'Delete failed' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update Hero section media settings (video1, video2, heroImage)
// @route   PUT /api/admin/hero-settings
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
exports.updateHeroSettings = async (req, res) => {
    try {
        const { video1Url, video1Id, video2Url, video2Id, heroImageUrl, heroImageId } = req.body;

        const settings = await HeroSettings.findOneAndUpdate(
            {},
            {
                ...(video1Url    !== undefined && { video1Url }),
                ...(video1Id     !== undefined && { video1Id }),
                ...(video2Url    !== undefined && { video2Url }),
                ...(video2Id     !== undefined && { video2Id }),
                ...(heroImageUrl !== undefined && { heroImageUrl }),
                ...(heroImageId  !== undefined && { heroImageId }),
                updatedAt: Date.now(),
                updatedBy: req.user.id,
            },
            { new: true, upsert: true }
        );

        clearCache('/api/hero-settings');
        logger.info('Admin updated hero settings', { adminId: req.user.id });
        res.json({ msg: 'Hero settings updated', settings });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to update hero settings' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get current Hero settings (public)
// @route   GET /api/hero-settings
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
exports.getHeroSettings = async (req, res) => {
    try {
        const settings = await HeroSettings.findOne({}).lean();
        res.json(settings || {});
    } catch (err) {
        res.status(500).json({ msg: 'Failed to fetch hero settings' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Generate Cloudinary upload signature for client-side direct uploads
// @route   POST /api/admin/media/generate-signature
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
exports.generateUploadSignature = async (req, res) => {
    try {
        const timestamp = Math.round((new Date()).getTime() / 1000);
        const folder = 'fish_marketplace/admin_media';
        
        // Generate signed upload parameters
        const signature = cloudinary.utils.api_sign_request(
            {
                timestamp: timestamp,
                folder: folder
            },
            process.env.CLOUDINARY_API_SECRET
        );

        res.json({
            signature,
            timestamp,
            folder,
            apiKey: process.env.CLOUDINARY_API_KEY,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME
        });
    } catch (err) {
        logger.error('Failed to generate upload signature', { error: err.message });
        res.status(500).json({ msg: 'Signature generation failed' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Register a successfully client-uploaded Cloudinary file in our database
// @route   POST /api/admin/media/register
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
exports.registerMedia = async (req, res) => {
    try {
        const { url, publicId, resourceType, format, bytes, width, height, duration, caption } = req.body;

        if (!url || !publicId || !resourceType) {
            return res.status(400).json({ msg: 'Missing required media metadata.' });
        }

        const media = await SiteMedia.create({
            url,
            publicId,
            resourceType,
            format: format || '',
            bytes: bytes || 0,
            width: width || 0,
            height: height || 0,
            duration: duration || 0,
            caption: caption || '',
            folder: 'fish_marketplace/admin_media',
            uploadedBy: req.user.id,
        });

        logger.info('Admin registered media uploaded directly to Cloudinary', { adminId: req.user.id, publicId });

        res.status(201).json({
            msg: 'Media registered successfully',
            media
        });
    } catch (err) {
        logger.error('Failed to register media', { error: err.message });
        res.status(500).json({ msg: 'Media registration failed' });
    }
};
