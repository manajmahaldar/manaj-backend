const BuyingPost = require('../models/BuyingPost');
const { uploadToCloudinary } = require('../config/cloudinary');
const { clearCache } = require('../middleware/cache');
const FraudService = require('../services/FraudService');

exports.createPost = async (req, res) => {
    try {
        const {
            category,
            fishName,
            // Fish-specific
            size,
            // Feed-specific
            feedType,
            // Medicine-specific
            medicineType,
            strength,
            // Feed & Medicine shared
            packingSize,
            // Common
            requiredQuantity,
            buyingPrice,
            district,
            localDistrict,
            policeStation,
            phoneNumber,
            additionalRequirement
        } = req.body;

        const photos = req.files && req.files.length > 0
            ? await Promise.all(req.files.map(file => uploadToCloudinary(file.buffer).then(r => r.secure_url)))
            : [];

        const fraudResult = await FraudService.detectListingSpam(req.user.id, {
            fishName, category
        }, 'BuyingPost');

        const newPost = new BuyingPost({
            traderId: req.user.id,
            category: category || 'fish',
            fishName,
            // Fish-specific
            size: size || '',
            // Feed-specific
            feedType: feedType || '',
            // Medicine-specific
            medicineType: medicineType || '',
            strength: strength || '',
            // Feed & Medicine shared
            packingSize: packingSize || '',
            // Common
            requiredQuantity,
            buyingPrice,
            district,
            localDistrict: localDistrict || '',
            policeStation: policeStation || '',
            phoneNumber,
            additionalRequirement: additionalRequirement || '',
            photos,
            isFlagged: fraudResult.isFlagged,
            fraudReason: fraudResult.reason,
            fraudScore: fraudResult.fraudScore,
            status: fraudResult.isFlagged ? 'pending' : 'approved'
        });

        await newPost.save();
        clearCache('/api/posts');
        res.json(newPost);
    } catch (err) {
        console.error('Error creating post:', err);
        res.status(500).send('Server error');
    }
};

exports.getMyPosts = async (req, res) => {
    try {
        // STRICT ISOLATION: Always filter by authenticated user ID
        const posts = await BuyingPost.find({ traderId: req.user.id }).sort({ createdAt: -1 }).lean();
        res.json(posts);
    } catch (err) {
        console.error(err); res.status(500).send('Server error');
    }
};

exports.updatePost = async (req, res) => {
    try {
        const {
            category,
            fishName,
            size,
            feedType,
            medicineType,
            strength,
            packingSize,
            requiredQuantity,
            buyingPrice,
            district,
            localDistrict,
            policeStation,
            phoneNumber,
            additionalRequirement
        } = req.body;

        // IDOR PREVENTION: Check ownership in the query
        let post = await BuyingPost.findOne({ _id: req.params.id, traderId: req.user.id });
        if (!post) {
            return res.status(404).json({ msg: 'Post not found or unauthorized' });
        }

        let updateFields = {
            category,
            fishName,
            size: size || '',
            feedType: feedType || '',
            medicineType: medicineType || '',
            strength: strength || '',
            packingSize: packingSize || '',
            requiredQuantity,
            buyingPrice,
            district,
            localDistrict: localDistrict || '',
            policeStation: policeStation || '',
            phoneNumber,
            additionalRequirement: additionalRequirement || ''
        };

        if (req.files && req.files.length > 0) {
            updateFields.photos = await Promise.all(
                req.files.map(file => uploadToCloudinary(file.buffer).then(r => r.secure_url))
            );
        }

        post = await BuyingPost.findByIdAndUpdate(
            req.params.id,
            { $set: updateFields },
            { new: true }
        );

        clearCache('/api/posts');
        res.json(post);
    } catch (err) {
        console.error('Error updating post:', err);
        if (err.http_code === 401 || err.http_code === 400 || (err.message && err.message.includes('api_key'))) {
            return res.status(500).json({ msg: 'Image upload failed: Invalid Cloudinary API Key or Configuration. Please check your backend .env file.' });
        }
        res.status(500).send('Server error');
    }
};

exports.deletePost = async (req, res) => {
    try {
        // IDOR PREVENTION: Check ownership in the query
        const post = await BuyingPost.findOneAndDelete({ _id: req.params.id, traderId: req.user.id });
        if (!post) {
            return res.status(404).json({ msg: 'Post not found or unauthorized' });
        }
        clearCache('/api/posts');
        res.json({ msg: 'Post removed' });
    } catch (err) {
        console.error(err); res.status(500).send('Server error');
    }
};

exports.getAllPosts = async (req, res) => {
    try {
        const { category, district, search, page = 1, limit = 12 } = req.query;
        let query = { status: 'approved' };

        if (category) query.category = String(category).toLowerCase();
        if (district) query.district = String(district);
        if (search) {
            const searchStr = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex
            query.$or = [
                { fishName: { $regex: searchStr, $options: 'i' } },
                { district: { $regex: searchStr, $options: 'i' } }
            ];
        }

        const pageNumber = Number.parseInt(page, 10);
        const limitNumber = Number.parseInt(limit, 10);
        const safePage = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
        const safeLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? limitNumber : 12;
        const skip = (safePage - 1) * safeLimit;

        const [posts, total] = await Promise.all([
            BuyingPost.find(query)
                .populate('traderId', 'name district verifiedStatus role profilePicture') // Sanitize: Only public fields
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(safeLimit)
                .lean(),
            BuyingPost.countDocuments(query)
        ]);

        res.json({
            posts,
            pagination: {
                total,
                page: safePage,
                pages: Math.ceil(total / safeLimit)
            }
        });
    } catch (err) {
        console.error(err); res.status(500).send('Server error');
    }
};

exports.updatePostStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const post = await BuyingPost.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!post) return res.status(404).json({ msg: 'Post not found' });
        clearCache('/api/posts');
        res.json(post);
    } catch (err) {
        console.error(err); res.status(500).send('Server error');
    }
};

exports.getPostById = async (req, res) => {
    try {
        const post = await BuyingPost.findById(req.params.id)
            .populate('traderId', 'name district verifiedStatus role profilePicture')
            .lean();
        if (!post) return res.status(404).json({ msg: 'Post not found' });
        res.json(post);
    } catch (err) {
        console.error('Error in getPostById:', err);
        res.status(500).send('Server error');
    }
};
