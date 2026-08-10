const Listing = require('../models/Listing');
const User = require('../models/User'); // Added User import for role-based filtering
const { uploadToCloudinary } = require('../config/cloudinary');
const { clearCache } = require('../middleware/cache');
const FraudService = require('../services/FraudService');

exports.createListing = async (req, res) => {
    try {
        const { productName, category, price, district, localDistrict, policeStation, description, phoneNumber, quantity, unit } = req.body;
        
        if (!productName || !price || !district) {
            return res.status(400).json({ msg: 'Product Name, Price, and District are required.' });
        }

        // Upload files to Cloudinary, separating photos and video
        const photos = [];
        let video = '';
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const isVideo = file.mimetype.startsWith('video/');
                const url = await uploadToCloudinary(file.buffer, { resource_type: isVideo ? 'video' : 'image' }).then(r => r.secure_url);
                if (isVideo) {
                    video = url;
                } else {
                    photos.push(url);
                }
            }
        }

        // Only admins cannot list
        if (req.user.role === 'admin') {
            return res.status(403).json({ msg: 'Admin cannot list products' });
        }

        const validCategory = ['Spawn', 'Fingerling', 'Feed', 'Medicine', 'Fish', 'Equipment', 'Fresh Fish', 'Prawns', 'Crabs', 'Dry Fish', 'Shellfish'].includes(category)
            ? category
            : 'Fish';

        const fraudResult = await FraudService.detectListingSpam(req.user.id, {
            productName, category: validCategory, description: description || productName
        }, 'Listing');

        const newListing = new Listing({
            sellerId: req.user.id,
            productName,
            category: validCategory,
            price: String(price),
            district: district || 'West Bengal',
            localDistrict: localDistrict || '',
            policeStation: policeStation || '',
            description: description || `Listing for ${productName}`,
            photos,
            video,
            phoneNumber: phoneNumber || req.user.phone || 'Not provided',
            quantity: quantity || '1',
            unit: unit || 'kg',
            status: 'pending', // All listings need review
            isFlagged: fraudResult.isFlagged,
            fraudReason: fraudResult.reason,
            fraudScore: fraudResult.fraudScore
        });

        await newListing.save();
        clearCache('/api/listings');
        res.json(newListing);
    } catch (err) {
        console.error('Error creating listing:', err);
        res.status(500).json({ msg: err.message || 'Server error creating listing' });
    }
};

exports.getListings = async (req, res) => {
    try {
        const { category, district, search, minPrice, maxPrice, sellerRole, page = 1, limit = 12 } = req.query;
        let query = { status: 'approved' };
        
        if (category) {
            query.category = { $in: String(category).split(',') };
        }
        if (district) {
            query.district = String(district);
        }
        if (sellerRole) {
            const usersWithRole = await User.find({ role: String(sellerRole) }).select('_id').lean();
            const userIds = usersWithRole.map(u => u._id);
            query.sellerId = { $in: userIds };
        }
        if (search) {
            const searchStr = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex
            query.$or = [
                { productName: { $regex: searchStr, $options: 'i' } },
                { district: { $regex: searchStr, $options: 'i' } }
            ];
        }

        const pageNumber = Number.parseInt(page, 10);
        const limitNumber = Number.parseInt(limit, 10);
        const safePage = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
        const safeLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? limitNumber : 12;
        const skip = (safePage - 1) * safeLimit;

        const [listings, total] = await Promise.all([
            Listing.find(query)
                .populate('sellerId', 'name district localDistrict policeStation verifiedStatus role profilePicture')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(safeLimit)
                .lean(), // Performance: Reduce overhead by returning plain JS objects
            Listing.countDocuments(query)
        ]);

        res.json({
            listings,
            pagination: {
                total,
                page: safePage,
                pages: Math.ceil(total / safeLimit)
            }
        });
    } catch (err) {
        console.error('Error in getListings:', err);
        res.status(500).send('Server error');
    }
};

exports.getListingById = async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.id)
            .populate('sellerId', 'name district localDistrict policeStation verifiedStatus role profilePicture')
            .lean();
        if (!listing) return res.status(404).json({ msg: 'Listing not found' });
        res.json(listing);
    } catch (err) {
        console.error('Error in getListingById:', err);
        res.status(500).send('Server error');
    }
};

exports.getHomeSummary = async (req, res) => {
    try {
        const [fishListings, feedMedicineListings, buyingPosts] = await Promise.all([
            Listing.find({ status: 'approved', category: { $in: ['Fish', 'Spawn/Seed', 'মাছ', 'পোনা'] } })
                .populate('sellerId', 'name district localDistrict policeStation verifiedStatus role profilePicture')
                .sort({ createdAt: -1 })
                .limit(8)
                .lean(),
            Listing.find({ status: 'approved', category: { $in: ['Feed', 'Medicine', 'ফিড', 'ওষুধ'] } })
                .populate('sellerId', 'name district localDistrict policeStation verifiedStatus role profilePicture')
                .sort({ createdAt: -1 })
                .limit(8)
                .lean(),
            require('../models/BuyingPost').find({ status: 'approved' })
                .populate('traderId', 'name district verifiedStatus role profilePicture')
                .sort({ createdAt: -1 })
                .limit(8)
                .lean()
        ]);

        res.json({
            fishListings,
            feedMedicineListings,
            buyingPosts
        });
    } catch (err) {
        console.error('Error in getHomeSummary:', err);
        res.status(500).send('Server error');
    }
};

exports.updateListingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const listing = await Listing.findByIdAndUpdate(req.params.id, { status }, { new: true });
        clearCache('/api/listings');
        res.json(listing);
    } catch (err) {
        res.status(500).send('Server error');
    }
};

exports.getMyListings = async (req, res) => {
    try {
        const listings = await Listing.find({ sellerId: req.user.id }).sort({ createdAt: -1 }).lean();
        res.json(listings);
    } catch (err) {
        console.error('Error fetching my listings:', err);
        res.status(500).send('Server error');
    }
};

exports.updateListing = async (req, res) => {
    try {
        const { productName, category, price, district, localDistrict, policeStation, description, phoneNumber, quantity, unit } = req.body;
        
        // Only admins cannot list
        if (req.user.role === 'admin') {
            return res.status(403).json({ msg: 'Admin cannot list products' });
        }
        
        let updateFields = {
            productName,
            category,
            price,
            district,
            localDistrict,
            policeStation,
            description,
            phoneNumber,
            quantity,
            unit
        };

        if (req.files && req.files.length > 0) {
            const photos = [];
            let video = '';
            for (const file of req.files) {
                const isVideo = file.mimetype.startsWith('video/');
                const url = await uploadToCloudinary(file.buffer, { resource_type: isVideo ? 'video' : 'image' }).then(r => r.secure_url);
                if (isVideo) {
                    video = url;
                } else {
                    photos.push(url);
                }
            }
            if (photos.length > 0) updateFields.photos = photos;
            if (video) updateFields.video = video;
        }

        const listing = await Listing.findOneAndUpdate(
            { _id: req.params.id, sellerId: req.user.id },
            { $set: updateFields },
            { new: true }
        );

        if (!listing) {
            return res.status(404).json({ msg: 'Listing not found or unauthorized' });
        }

        clearCache('/api/listings');
        res.json(listing);
    } catch (err) {
        console.error('Error updating listing:', err);
        res.status(500).send('Server error');
    }
};

exports.deleteListing = async (req, res) => {
    try {
        const listing = await Listing.findOneAndDelete({ _id: req.params.id, sellerId: req.user.id });

        if (!listing) {
            return res.status(404).json({ msg: 'Listing not found or unauthorized' });
        }

        clearCache('/api/listings');
        res.json({ msg: 'Listing removed' });
    } catch (err) {
        console.error('Error deleting listing:', err);
        res.status(500).send('Server error');
    }
};
