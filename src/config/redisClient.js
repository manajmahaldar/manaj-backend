const redis = require('redis');

// Create Redis Client
const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.log('Redis: Max retries reached. Stopping reconnection attempts.');
                return new Error('Max retries reached');
            }
            return Math.min(retries * 100, 3000); // Backoff strategy
        }
    }
});

// Flag to track connection status
let isConnected = false;

client.on('connect', () => {
    isConnected = true;
    console.log('✅ Redis client connected');
});

client.on('error', (err) => {
    isConnected = false;
    // Log error but don't crash
    if (err.code === 'ECONNREFUSED') {
        console.error('❌ Redis Connection Refused. Ensure Redis is running via Docker.');
    } else {
        console.error('Redis Client Error', err);
    }
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
        console.error('Failed to connect to Redis initially:', err.message);
    }
};

connectToRedis();

module.exports = {
    client,
    isConnected: () => isConnected
};

