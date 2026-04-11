const { client, isConnected } = require('../config/redisClient');

/**
 * Middleware to check cache for GET requests
 * Time to live defaults to 3600 seconds (1 hour)
 */
const cache = (ttl = 3600) => {
    return async (req, res, next) => {
        // Skip caching if Redis is not connected
        if (!isConnected()) {
            return next();
        }

        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Use the originalUrl as the cache key to account for queries like ?category=...
        const key = `cache:${req.originalUrl}`;

        try {
            // Check if key exists in Redis
            const cachedResponse = await client.get(key);

            if (cachedResponse) {
                // If it exists, parse and return the cached data immediately
                return res.json(JSON.parse(cachedResponse));
            } else {
                // If not, we override res.json to intercept the response and cache it
                const originalJson = res.json.bind(res);

                res.json = (body) => {
                    // Cache the successful response
                    client.setEx(key, ttl, JSON.stringify(body));
                    // Send it using the original res.json
                    return originalJson(body);
                };

                next();
            }
        } catch (err) {
            console.error('Redis Cache Error: ', err);
            // If redis fails, just proceed to DB
            next();
        }
    };
};

/**
 * Helper function to clear cache globally or for a specific prefix
 * Examples: clearCache('/api/listings'), clearCache('/api/posts')
 */
const clearCache = async (prefix) => {
    if (!isConnected()) return;
    
    try {
        const keys = await client.keys(`cache:${prefix}*`);
        if (keys.length > 0) {
            await client.del(keys);
        }
    } catch (err) {
        console.error('Redis Clear Cache Error: ', err);
    }
};

module.exports = {
    cache,
    clearCache
};

