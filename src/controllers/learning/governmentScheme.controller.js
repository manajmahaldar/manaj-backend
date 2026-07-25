const GovernmentScheme = require('../../models/learning/GovernmentScheme');

const buildSlug = (title) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

// @desc    Get all government schemes
exports.getSchemes = async (req, res) => {
    try {
        const { category, search } = req.query;
        const query = { isActive: true };
        
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { schemeName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        const schemes = await GovernmentScheme.find(query).sort({ createdAt: -1 });
        res.json({ success: true, data: schemes });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Get scheme by ID or Slug
exports.getSchemeById = async (req, res) => {
    try {
        const { idOrSlug } = req.params;
        const query = idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? { _id: idOrSlug } : { slug: idOrSlug };
        
        const scheme = await GovernmentScheme.findOne(query);
        if (!scheme) {
            return res.status(404).json({ success: false, msg: 'Scheme not found' });
        }
        res.json({ success: true, data: scheme });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Create government scheme (Admin only)
exports.createScheme = async (req, res) => {
    try {
        const { title, schemeName, description, ministry, category, eligibility, benefits, applicationLink, documentsRequired, deadline } = req.body;
        const slug = buildSlug(title);
        
        const newScheme = new GovernmentScheme({
            title,
            slug,
            schemeName,
            description,
            ministry,
            category,
            eligibility,
            benefits,
            applicationLink,
            documentsRequired,
            deadline
        });
        await newScheme.save();
        res.status(201).json({ success: true, data: newScheme });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Update government scheme (Admin only)
exports.updateScheme = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (updates.title) updates.slug = buildSlug(updates.title);
        
        const scheme = await GovernmentScheme.findByIdAndUpdate(id, updates, { new: true });
        if (!scheme) {
            return res.status(404).json({ success: false, msg: 'Scheme not found' });
        }
        res.json({ success: true, data: scheme });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Delete government scheme (Admin only)
exports.deleteScheme = async (req, res) => {
    try {
        const { id } = req.params;
        const scheme = await GovernmentScheme.findByIdAndDelete(id);
        if (!scheme) {
            return res.status(404).json({ success: false, msg: 'Scheme not found' });
        }
        res.json({ success: true, msg: 'Scheme deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};
