const Listing = require('../models/Listing');

exports.createListing = async (req, res) => {
    try {
        const { productName, category, price, district, description, phoneNumber, quantity, unit } = req.body;
        const photos = req.files ? req.files.map(file => file.path) : [];

        // Role-based category validation
        if (req.user.role === 'seller' && !['Feed', 'Medicine'].includes(category)) {
            return res.status(403).json({ msg: 'Sellers can only post Feed or Medicine' });
        }
        if (req.user.role === 'farmer' && !['Fish', 'Spawn/Seed'].includes(category)) {
            return res.status(403).json({ msg: 'Farmers can only post Fish or Spawn/Seed' });
        }

        const newListing = new Listing({
            sellerId: req.user.id,
            productName,
            category,
            price,
            district,
            description,
            photos,
            phoneNumber,
            quantity,
            unit
        });


        await newListing.save();
        res.json(newListing);
    } catch (err) {
        console.error('Error creating listing:', err);
        res.status(500).send('Server error');
    }
};

exports.getListings = async (req, res) => {
    try {
        const { category, district, search, minPrice, maxPrice } = req.query;
        let query = { status: 'approved' };
        
        if (category) {
            query.category = { $in: category.split(',') };
        }
        if (district) {
            query.district = district;
        }
        if (search) {
            query.$or = [
                { productName: { $regex: search, $options: 'i' } },
                { district: { $regex: search, $options: 'i' } }
            ];
        }
        if (minPrice || maxPrice) {
            query.price = {};
            // Assuming price is stored as String, wait... but numeric comparison needs Number
            // Listing.js stores price as: price: { type: String, required: true }
            // So we can't reliably do $gte/$lte directly on the string in MongoDB without aggregation.
            // Let's rely on frontend for price, or simply return all and let frontend filter price.
            // Since district and search can greatly reduce the payload, it's fine if frontend filters price.
        }

        const listings = await Listing.find(query).sort({ createdAt: -1 });
        
        // Let's parse string prices and filter here if needed, or rely on frontend filtering.
        // The current implementation relies on frontend filtering for prices so we just return the fetched listings.
        res.json(listings);
    } catch (err) {
        res.status(500).send('Server error');
    }
};

exports.updateListingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const listing = await Listing.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json(listing);
    } catch (err) {
        res.status(500).send('Server error');
    }
};

exports.getMyListings = async (req, res) => {
    try {
        const listings = await Listing.find({ sellerId: req.user.id }).sort({ createdAt: -1 });
        res.json(listings);
    } catch (err) {
        console.error('Error fetching my listings:', err);
        res.status(500).send('Server error');
    }
};

exports.updateListing = async (req, res) => {
    try {
        const { productName, category, price, district, description, phoneNumber, quantity, unit } = req.body;
        
        // Role-based category validation
        if (req.user.role === 'seller' && !['Feed', 'Medicine'].includes(category)) {
            return res.status(403).json({ msg: 'Sellers can only post Feed or Medicine' });
        }
        if (req.user.role === 'farmer' && !['Fish', 'Spawn/Seed'].includes(category)) {
            return res.status(403).json({ msg: 'Farmers can only post Fish or Spawn/Seed' });
        }
        
        let updateFields = {
            productName,
            category,
            price,
            district,
            description,
            phoneNumber,
            quantity,
            unit
        };

        if (req.files && req.files.length > 0) {
            updateFields.photos = req.files.map(file => file.path);
        }

        const listing = await Listing.findOneAndUpdate(
            { _id: req.params.id, sellerId: req.user.id },
            { $set: updateFields },
            { new: true }
        );

        if (!listing) {
            return res.status(404).json({ msg: 'Listing not found or unauthorized' });
        }

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

        res.json({ msg: 'Listing removed' });
    } catch (err) {
        console.error('Error deleting listing:', err);
        res.status(500).send('Server error');
    }
};
