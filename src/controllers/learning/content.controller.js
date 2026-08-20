const LearningContent = require('../../models/learning/LearningContent');
const LearningCategory = require('../../models/learning/LearningCategory');
const LearningNotification = require('../../models/learning/LearningNotification');
const User = require('../../models/User');

const buildSlug = (title, suffix = '') => {
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    return suffix ? `${base}-${suffix}` : base;
};


// @desc    Get all learning content (paginated, searched, filtered)
exports.getAllContent = async (req, res) => {
    try {
        const { 
            type, categories, language, level, search, sort, 
            featured, pinned, isTrending, page = 1, limit = 12 
        } = req.query;
        
        // Admin bypass: if isAdmin query param or user is admin, show all statuses
        const isAdminQuery = req.query.isAdmin === 'true' || req.user?.role === 'admin';
        const query = isAdminQuery ? {} : { status: 'published' };
        
        if (type) query.type = type;
        if (language) query.language = language;
        if (level) query.level = level;
        if (featured) query.featured = featured === 'true';
        if (pinned) query.pinned = pinned === 'true';
        if (isTrending) query.isTrending = isTrending === 'true';
        
        if (categories) {
            const catArray = categories.split(',');
            query.categories = { $in: catArray };
        }
        
        if (search) {
            query.$text = { $search: search };
        }
        
        let sortOption = { publishAt: -1 };
        if (sort === 'oldest') sortOption = { publishAt: 1 };
        else if (sort === 'most_viewed') sortOption = { viewCount: -1 };
        else if (sort === 'most_popular') sortOption = { viewCount: -1, downloadCount: -1 };
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const contents = await LearningContent.find(query)
            .populate('categories', 'name slug color icon')
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await LearningContent.countDocuments(query);
        
        res.json({
            success: true,
            data: contents,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Get content by ID or Slug
exports.getContentById = async (req, res) => {
    try {
        const { idOrSlug } = req.params;
        const query = idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? { _id: idOrSlug } : { slug: idOrSlug };
        
        const content = await LearningContent.findOneAndUpdate(
            query,
            { $inc: { viewCount: 1 } },
            { new: true }
        ).populate('categories', 'name slug color icon');
        
        if (!content) {
            return res.status(404).json({ success: false, msg: 'Content not found' });
        }
        
        res.json({ success: true, data: content });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Get autocomplete suggestions for learning search
exports.getSearchSuggestions = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || query.length < 2) {
            return res.json({ success: true, suggestions: [] });
        }
        
        const contents = await LearningContent.find(
            { title: { $regex: query, $options: 'i' }, status: 'published' },
            { title: 1, type: 1, slug: 1 }
        ).limit(5);
        
        const categories = await LearningCategory.find(
            { name: { $regex: query, $options: 'i' } },
            { name: 1, slug: 1 }
        ).limit(3);
        
        res.json({
            success: true,
            suggestions: [
                ...contents.map(c => ({ text: c.title, type: c.type, link: `/learning/${c.type}s/${c.slug}` })),
                ...categories.map(c => ({ text: c.name, type: 'category', link: `/learning/categories/${c.slug}` }))
            ]
        });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Create content (Admin only)
exports.createContent = async (req, res) => {
    try {
        const {
            title, type, categories, content, language, level, status, publishAt,
            videoUrl, videoSource, pdfUrl, externalLink, duration, readingTime,
            featured, pinned, isTrending, tags, author,
            thumbnail, mediaUrl, subcategory
        } = req.body;

        // Generate a unique slug by appending a short timestamp
        const slug = buildSlug(title, Date.now().toString(36));

        const newContent = new LearningContent({
            title,
            slug,
            type,
            categories,
            content,
            language:     language     || 'en',
            level:        level        || 'beginner',
            status:       status       || 'published',
            publishAt,
            author: {
                name:   author?.name   || 'MatsyaLink Expert',
                avatar: author?.avatar || '',
                bio:    author?.bio    || ''
            },
            thumbnail:    thumbnail    || '',
            subcategory:  subcategory  || '',
            videoUrl:     videoUrl     || '',
            videoSource:  videoSource  || '',
            pdfUrl:       pdfUrl       || '',
            mediaUrl:     mediaUrl     || '',
            externalLink: externalLink || '',
            duration:     duration     || 0,
            readingTime:  readingTime  || 0,
            featured:     !!featured,
            pinned:       !!pinned,
            isTrending:   !!isTrending,
            tags:         Array.isArray(tags) ? tags : []
        });

        await newContent.save();

        // Trigger notification if published
        if (status === 'published') {
            const users = await User.find({ role: { $in: ['farmer', 'seller', 'trader', 'hatchery'] } }, '_id');
            const notificationType = type === 'video' ? 'new_video' : type === 'blog' ? 'new_blog' : 'new_article';
            const notifications = users.map(user => ({
                userId: user._id,
                type: notificationType,
                title: `New ${type} available!`,
                message: `Check out our latest ${type}: "${title}"`,
                contentId: newContent._id
            }));
            await LearningNotification.insertMany(notifications);
        }

        res.status(201).json({ success: true, data: newContent });
    } catch (err) {
        console.error('[createContent error]', err.message);
        res.status(500).json({ success: false, msg: err.message });
    }
};


// @desc    Update content (Admin only)
exports.updateContent = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Regenerate slug with the existing doc's suffix (or a new one) to stay unique
        if (updates.title) {
            const existing = await LearningContent.findById(id, 'slug');
            // Keep existing slug suffix if title hasn't changed radically
            const existingSuffix = existing?.slug?.split('-').pop();
            updates.slug = buildSlug(updates.title, existingSuffix || Date.now().toString(36));
        }

        // Ensure author object is always valid
        if (updates.author) {
            updates.author = {
                name:   updates.author.name   || 'MatsyaLink Expert',
                avatar: updates.author.avatar || '',
                bio:    updates.author.bio    || ''
            };
        }

        const content = await LearningContent.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        if (!content) {
            return res.status(404).json({ success: false, msg: 'Content not found' });
        }

        res.json({ success: true, data: content });
    } catch (err) {
        console.error('[updateContent error]', err.message);
        res.status(500).json({ success: false, msg: err.message });
    }
};


// @desc    Delete content (Admin only)
exports.deleteContent = async (req, res) => {
    try {
        const { id } = req.params;
        const content = await LearningContent.findByIdAndDelete(id);
        if (!content) {
            return res.status(404).json({ success: false, msg: 'Content not found' });
        }
        res.json({ success: true, msg: 'Content deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Bulk action (publish, archive, delete) for admin panel
exports.bulkAction = async (req, res) => {
    try {
        const { action, ids } = req.body;
        if (!ids || !ids.length) {
            return res.status(400).json({ success: false, msg: 'No IDs provided' });
        }
        
        if (action === 'delete') {
            await LearningContent.deleteMany({ _id: { $in: ids } });
            return res.json({ success: true, msg: 'Content deleted in bulk' });
        }
        
        if (['published', 'draft', 'archived'].includes(action)) {
            await LearningContent.updateMany({ _id: { $in: ids } }, { status: action });
            return res.json({ success: true, msg: `Content status updated to ${action} in bulk` });
        }
        
        res.status(400).json({ success: false, msg: 'Invalid bulk action' });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Get category listings
exports.getCategories = async (req, res) => {
    try {
        const categories = await LearningCategory.find({ isActive: true }).sort({ order: 1 });
        res.json({ success: true, data: categories });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Create category (Admin only)
exports.createCategory = async (req, res) => {
    try {
        const { name, description, icon, color, parentCategory, order, subcategories } = req.body;
        const slug = buildSlug(name);
        const category = new LearningCategory({
            name, slug, description, icon, color, parentCategory, order,
            subcategories: Array.isArray(subcategories) ? subcategories : (subcategories ? subcategories.split(',').map(s => s.trim()).filter(Boolean) : [])
        });
        await category.save();
        res.status(201).json({ success: true, data: category });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Update category (Admin only)
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (updates.name) updates.slug = buildSlug(updates.name);
        if (updates.subcategories && !Array.isArray(updates.subcategories)) {
            updates.subcategories = updates.subcategories.split(',').map(s => s.trim()).filter(Boolean);
        }
        const category = await LearningCategory.findByIdAndUpdate(id, updates, { new: true });
        if (!category) return res.status(404).json({ success: false, msg: 'Category not found' });
        res.json({ success: true, data: category });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Delete category (Admin only)
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await LearningCategory.findByIdAndDelete(id);
        if (!category) return res.status(404).json({ success: false, msg: 'Category not found' });
        res.json({ success: true, msg: 'Category deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};
