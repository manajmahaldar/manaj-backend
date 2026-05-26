const User = require('../models/User');
const Listing = require('../models/Listing');
const BuyingPost = require('../models/BuyingPost');

class FraudService {
    // Basic list of known disposable email domains
    static DISPOSABLE_DOMAINS = [
        'mailinator.com', '10minutemail.com', 'tempmail.com', 'guerrillamail.com',
        'yopmail.com', 'temp-mail.org', 'throwawaymail.com', 'fakeinbox.com'
    ];

    /**
     * Check if a user's registration looks suspicious.
     * @param {Object} userData - name, email, phone, etc.
     * @param {String} ip - The user's IP address.
     * @returns {Object} { isFlagged: boolean, reason: string, trustScore: number }
     */
    static async detectFakeUser(userData, ip) {
        let isFlagged = false;
        let reason = [];
        let trustScore = 100;

        // 1. Check disposable email
        if (userData.email) {
            const domain = userData.email.split('@')[1]?.toLowerCase();
            if (this.DISPOSABLE_DOMAINS.includes(domain)) {
                isFlagged = true;
                reason.push('Disposable email used');
                trustScore -= 50;
            }
        }

        // 2. Check for multiple registrations from the same IP (if IP is provided)
        if (ip) {
            // Count users registered with this IP in the last 24 hours
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const accountsFromIp = await User.countDocuments({
                registrationIp: ip,
                createdAt: { $gte: yesterday }
            });

            if (accountsFromIp >= 3) {
                isFlagged = true;
                reason.push('Too many accounts registered from this IP recently');
                trustScore -= 30;
            }
        }

        return {
            isFlagged,
            reason: reason.join(', '),
            trustScore: Math.max(0, trustScore)
        };
    }

    /**
     * Check if a listing looks like spam.
     * @param {String} userId - The ID of the seller
     * @param {Object} listingData - title, description, category
     * @param {String} modelType - 'Listing' or 'BuyingPost'
     * @returns {Object} { isFlagged: boolean, reason: string, fraudScore: number }
     */
    static async detectListingSpam(userId, listingData, modelType = 'Listing') {
        let isFlagged = false;
        let reason = [];
        let fraudScore = 0;

        const Model = modelType === 'Listing' ? Listing : BuyingPost;
        const userField = modelType === 'Listing' ? 'sellerId' : 'traderId';

        // 1. High Velocity Check (User posted > 5 listings in last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentPostsCount = await Model.countDocuments({
            [userField]: userId,
            createdAt: { $gte: oneHourAgo }
        });

        if (recentPostsCount >= 5) {
            isFlagged = true;
            reason.push('High velocity posting (>5 per hour)');
            fraudScore += 60;
        }

        // 2. Exact Duplicate Check (User has a listing with same title/category)
        const titleField = modelType === 'Listing' ? 'productName' : 'fishType';
        
        // Some rudimentary similarity check: check if same title was posted recently
        if (listingData[titleField]) {
            const duplicate = await Model.findOne({
                [userField]: userId,
                [titleField]: listingData[titleField],
                createdAt: { $gte: oneHourAgo }
            });
            if (duplicate) {
                isFlagged = true;
                reason.push('Exact duplicate listing created recently');
                fraudScore += 50;
            }
        }

        return {
            isFlagged,
            reason: reason.join(', '),
            fraudScore: Math.min(100, fraudScore)
        };
    }
}

module.exports = FraudService;
