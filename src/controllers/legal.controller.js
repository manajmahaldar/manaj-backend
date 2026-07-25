const LegalPolicy = require('../models/LegalPolicy');
const UserConsentLog = require('../models/UserConsentLog');
const DataPrivacyRequest = require('../models/DataPrivacyRequest');
const User = require('../models/User');
const Listing = require('../models/Listing');
const BuyingPost = require('../models/BuyingPost');
const Order = require('../models/Order');

// @desc    Get active legal policy by slug
exports.getPolicyBySlug = async (req, res) => {
    try {
        const policy = await LegalPolicy.findOne({ slug: req.params.slug, isPublished: true }).lean();
        if (!policy) {
            return res.status(404).json({ msg: 'Policy not found' });
        }
        res.json(policy);
    } catch (err) {
        console.error('Error fetching policy:', err);
        res.status(500).send('Server error');
    }
};

// @desc    Get policy version history
exports.getPolicyVersions = async (req, res) => {
    try {
        const policy = await LegalPolicy.findOne({ slug: req.params.slug }).select('slug title version effectiveDate lastUpdated history').lean();
        if (!policy) {
            return res.status(404).json({ msg: 'Policy not found' });
        }
        res.json(policy);
    } catch (err) {
        console.error('Error fetching policy versions:', err);
        res.status(500).send('Server error');
    }
};

// @desc    Record or update user consent (DPDP Sec 6)
exports.recordConsent = async (req, res) => {
    try {
        const { consents } = req.body; // Array of { consentType, granted, policyVersion }
        if (!Array.isArray(consents)) {
            return res.status(400).json({ msg: 'Invalid consent payload' });
        }

        const logs = [];
        for (const item of consents) {
            const log = new UserConsentLog({
                userId: req.user.id,
                consentType: item.consentType,
                granted: !!item.granted,
                policyVersion: item.policyVersion || '1.0.0',
                ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
                userAgent: req.headers['user-agent'] || ''
            });
            await log.save();
            logs.push(log);
        }

        res.json({ success: true, count: logs.length });
    } catch (err) {
        console.error('Error recording consent:', err);
        res.status(500).send('Server error');
    }
};

// @desc    Get current user consents
exports.getUserConsents = async (req, res) => {
    try {
        const logs = await UserConsentLog.aggregate([
            { $match: { userId: req.user._id } },
            { $sort: { timestamp: -1 } },
            { 
                $group: {
                    _id: '$consentType',
                    granted: { $first: '$granted' },
                    policyVersion: { $first: '$policyVersion' },
                    updatedAt: { $first: '$timestamp' }
                }
            }
        ]);
        res.json(logs);
    } catch (err) {
        console.error('Error fetching user consents:', err);
        res.status(500).send('Server error');
    }
};

// @desc    Export User Personal Data (DPDP Sec 11 - Right to Access)
exports.exportUserData = async (req, res) => {
    try {
        const userId = req.user.id;
        const [user, listings, posts, orders] = await Promise.all([
            User.findById(userId).select('-password').lean(),
            Listing.find({ sellerId: userId }).lean(),
            BuyingPost.find({ traderId: userId }).lean(),
            Order.find({ $or: [{ buyerId: userId }, { sellerId: userId }] }).lean()
        ]);

        const exportData = {
            exportDate: new Date().toISOString(),
            platform: 'MatsyaLink India',
            profile: user,
            myListings: listings,
            myBuyingPosts: posts,
            orderHistory: orders,
            legalNotice: 'Exported under DPDP Act 2023 Section 11 Right to Access'
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=matsyalink_user_data_${userId}.json`);
        res.json(exportData);
    } catch (err) {
        console.error('Error exporting user data:', err);
        res.status(500).send('Server error');
    }
};

// @desc    Request Account Deletion & Erasure (DPDP Sec 12)
exports.requestAccountDeletion = async (req, res) => {
    try {
        const { reason } = req.body;
        const existing = await DataPrivacyRequest.findOne({ userId: req.user.id, requestType: 'delete_account', status: 'pending' });
        if (existing) {
            return res.status(400).json({ msg: 'Deletion request already pending approval' });
        }

        const privacyReq = new DataPrivacyRequest({
            userId: req.user.id,
            requestType: 'delete_account',
            reason: reason || 'User requested account termination and data erasure',
            status: 'pending'
        });

        await privacyReq.save();
        res.json({ success: true, msg: 'Account deletion request submitted to Grievance Officer' });
    } catch (err) {
        console.error('Error submitting deletion request:', err);
        res.status(500).send('Server error');
    }
};

// @desc    Submit Grievance Redressal Complaint (DPDP Sec 13)
exports.submitGrievance = async (req, res) => {
    try {
        const { name, email, phone, category, complaintDetails } = req.body;
        if (!name || !email || !complaintDetails) {
            return res.status(400).json({ msg: 'Please provide all required grievance fields' });
        }

        const grievance = new DataPrivacyRequest({
            userId: req.user ? req.user.id : null,
            requestType: 'grievance',
            reason: `[${category || 'General'}] ${complaintDetails}`,
            details: { name, email, phone, category },
            status: 'pending'
        });

        await grievance.save();
        res.json({ success: true, ticketId: grievance._id, msg: 'Grievance ticket created. SLA response time is 72 hours.' });
    } catch (err) {
        console.error('Error submitting grievance:', err);
        res.status(500).send('Server error');
    }
};
