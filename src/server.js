require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const mongoose = require('mongoose');

// Connect Database
connectDB();

// Initialize RabbitMQ message broker
const { connectRabbitMQ } = require('./config/rabbitClient');
connectRabbitMQ();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Configure HTTP Keep-Alive for better performance
server.keepAliveTimeout = 65000; // 65s (longer than typical ELB/Nginx timeout)
server.headersTimeout = 66000; // 66s (keepAliveTimeout + 1s)

// Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
    console.log(`\n[${signal}] Received. Shutting down gracefully...`);
    server.close(async () => {
        console.log('HTTP server closed.');
        try {
            await mongoose.connection.close();
            console.log('MongoDB connection closed.');
            process.exit(0);
        } catch (err) {
            console.error('Error during shutdown:', err);
            process.exit(1);
        }
    });

    // Force shutdown after 10s
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
