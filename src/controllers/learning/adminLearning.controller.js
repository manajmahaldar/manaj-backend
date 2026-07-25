const MediaLibrary = require('../../models/learning/MediaLibrary');
const Course = require('../../models/learning/Course');
const WebinarTraining = require('../../models/learning/WebinarTraining');
const LearningCategory = require('../../models/learning/LearningCategory');
const LearningContent = require('../../models/learning/LearningContent');
const LearningNotification = require('../../models/learning/LearningNotification');
const User = require('../../models/User');

// --- MEDIA LIBRARY CONTROLLER ---
exports.getMediaAssets = async (req, res) => {
    try {
        const { folder, fileType, search } = req.query;
        let query = {};
        if (folder) query.folder = folder;
        if (fileType) query.fileType = fileType;
        if (search) query.fileName = { $regex: search, $options: 'i' };

        const media = await MediaLibrary.find(query).sort({ createdAt: -1 });
        const folders = await MediaLibrary.distinct('folder');

        res.json({ success: true, data: media, folders: folders.length > 0 ? folders : ['General', 'Videos', 'PDFs', 'Images', 'Audio', 'Presentations'] });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

exports.uploadMediaAsset = async (req, res) => {
    try {
        const { fileName, fileUrl, fileType, folder, sizeBytes, mimeType, altText, tags } = req.body;
        const media = await MediaLibrary.create({
            fileName,
            fileUrl,
            fileType: fileType || 'image',
            folder: folder || 'General',
            sizeBytes: sizeBytes || 0,
            mimeType: mimeType || '',
            altText: altText || '',
            tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
            uploadedBy: req.user?._id
        });
        res.status(201).json({ success: true, data: media });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

exports.deleteMediaAsset = async (req, res) => {
    try {
        await MediaLibrary.findByIdAndDelete(req.params.id);
        res.json({ success: true, msg: 'Media asset deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

exports.replaceMediaAsset = async (req, res) => {
    try {
        const { newUrl } = req.body;
        const oldMedia = await MediaLibrary.findById(req.params.id);
        if (!oldMedia) return res.status(404).json({ success: false, msg: 'Asset not found' });

        const oldUrl = oldMedia.fileUrl;
        oldMedia.fileUrl = newUrl;
        await oldMedia.save();

        // Safe replace references across content
        await LearningContent.updateMany({ videoUrl: oldUrl }, { videoUrl: newUrl });
        await LearningContent.updateMany({ pdfUrl: oldUrl }, { pdfUrl: newUrl });
        await LearningContent.updateMany({ thumbnail: oldUrl }, { thumbnail: newUrl });

        res.json({ success: true, data: oldMedia, msg: 'Media asset replaced without breaking references' });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// --- COURSES & MODULES CONTROLLER ---
exports.getCourses = async (req, res) => {
    try {
        const courses = await Course.find().populate('categories').populate('modules.contents').sort({ createdAt: -1 });
        res.json({ success: true, data: courses });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

exports.createCourse = async (req, res) => {
    try {
        const { title, description, thumbnail, categories, level, language, modules, status, featured } = req.body;
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();
        
        const course = await Course.create({
            title,
            slug,
            description,
            thumbnail,
            categories,
            level,
            language,
            modules: modules || [],
            status: status || 'published',
            featured: featured || false
        });
        res.status(201).json({ success: true, data: course });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

exports.updateCourse = async (req, res) => {
    try {
        const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: course });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

exports.deleteCourse = async (req, res) => {
    try {
        await Course.findByIdAndDelete(req.params.id);
        res.json({ success: true, msg: 'Course deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// --- WEBINARS & TRAININGS CONTROLLER ---
exports.getWebinars = async (req, res) => {
    try {
        const webinars = await WebinarTraining.find().sort({ scheduledDate: 1 });
        res.json({ success: true, data: webinars });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

exports.createWebinar = async (req, res) => {
    try {
        const webinar = await WebinarTraining.create(req.body);
        res.status(201).json({ success: true, data: webinar });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

exports.updateWebinar = async (req, res) => {
    try {
        const webinar = await WebinarTraining.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: webinar });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

exports.deleteWebinar = async (req, res) => {
    try {
        await WebinarTraining.findByIdAndDelete(req.params.id);
        res.json({ success: true, msg: 'Event deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// --- BULK OPERATIONS & BROADCAST NOTIFICATIONS ---
exports.bulkActionContent = async (req, res) => {
    try {
        const { action, ids, updateData } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, msg: 'No content items selected' });
        }

        if (action === 'delete') {
            await LearningContent.deleteMany({ _id: { $in: ids } });
            return res.json({ success: true, msg: `${ids.length} items deleted permanently` });
        }

        if (action === 'archive') {
            await LearningContent.updateMany({ _id: { $in: ids } }, { status: 'archived' });
            return res.json({ success: true, msg: `${ids.length} items archived` });
        }

        if (action === 'publish') {
            await LearningContent.updateMany({ _id: { $in: ids } }, { status: 'published' });
            return res.json({ success: true, msg: `${ids.length} items published` });
        }

        if (action === 'update' && updateData) {
            await LearningContent.updateMany({ _id: { $in: ids } }, updateData);
            return res.json({ success: true, msg: `${ids.length} items updated` });
        }

        res.status(400).json({ success: false, msg: 'Invalid bulk action specified' });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

exports.sendBroadcastNotification = async (req, res) => {
    try {
        const { title, message, targetRole, actionUrl, type } = req.body;
        
        const notif = await LearningNotification.create({
            userId: null,
            title,
            message,
            targetRole: targetRole || 'all',
            actionUrl: actionUrl || '/learning',
            type: type || 'announcement',
            isBroadcast: true
        });

        res.status(201).json({ success: true, data: notif, msg: 'Broadcast notification sent successfully to all users!' });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};
