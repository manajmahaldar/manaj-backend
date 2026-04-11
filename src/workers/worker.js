require('dotenv').config();
const amqp = require('amqplib');

// Connect Database if the worker needs direct DB access
const connectDB = require('../config/db');

const processJobs = async () => {
    try {
        await connectDB();
        
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        const channel = await connection.createChannel();
        
        // Assert Queues to ensure they exist
        await channel.assertQueue('order_processing', { durable: true });
        await channel.assertQueue('notifications', { durable: true });

        // Ensure fair dispatch (process 1 message at a time per worker)
        channel.prefetch(1);

        console.log('[*] Worker waiting for messages in order_processing & notifications queues. To exit press CTRL+C');

        // Consume Order Processing Queue
        channel.consume('order_processing', async (msg) => {
            if (msg !== null) {
                const payload = JSON.parse(msg.content.toString());
                console.log(`[x] Received Job on order_processing:`, payload.action);
                
                // Simulate Heavy Processing (e.g. Updating Payment Gateways, Interacting with Banks)
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                console.log(`[✓] Completed Job on order_processing: ${payload.orderId}`);
                channel.ack(msg); // Acknowledge message completion
            }
        });

        // Consume Notifications Queue
        channel.consume('notifications', async (msg) => {
            if (msg !== null) {
                const payload = JSON.parse(msg.content.toString());
                console.log(`[x] Received Job on notifications:`, payload.type);
                
                // Simulate sending an Email or SMS Notification
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                console.log(`[✓] Sent notification to ${payload.recipientId}`);
                channel.ack(msg); // Acknowledge message completion
            }
        });

    } catch (err) {
        console.error('Worker Error:', err);
    }
};

// Start the worker
processJobs();
