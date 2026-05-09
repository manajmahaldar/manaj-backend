const redis = require('redis');

const useRedis = process.env.USE_REDIS === 'true';

// Create Redis Client (only if enabled)
const client = useRedis ? redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 5) {
                console.log('Redis: Reconnection paused to avoid logs noise. Caching disabled.');
                return false; // Stop reconnecting after 5 attempts
            }
            return Math.min(retries * 500, 5000); 
        }
    }
}) : null;

// Flag to track connection status
let isConnected = false;

if (client) {
    client.on('connect', () => {
        isConnected = true;
        console.log('✅ Redis client connected');
    });

    client.on('error', (err) => {
        isConnected = false;
        // Reduce noise for common connection issues
        if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
            // Silently handle these, just log once or briefly
            return; 
        }
        console.error('Redis Client Error', err.message);
    });

    client.on('ready', () => {
        isConnected = true;
        console.log('✅ Redis client ready');
    });

    client.on('end', () => {
        isConnected = false;
        console.log('Redis client disconnected');
    });

    // Connect to Redis
    const connectToRedis = async () => {
        try {
            if (!client.isOpen) {
                await client.connect();
            }
        } catch (err) {
            // Noisy logs are avoided here
        }
    };

    connectToRedis();
} else {
    console.log('ℹ️ Redis is disabled via USE_REDIS flag');
}

module.exports = {
    client,
    isConnected: () => isConnected && useRedis
};

