const amqp = require('amqplib');

let channel = null;
let isConnected = false;

const connectRabbitMQ = async () => {
    try {
        const url = process.env.RABBITMQ_URL || 'amqp://localhost';
        const connection = await amqp.connect(url);
        
        connection.on('error', (err) => {
            console.error('RabbitMQ Connection Error:', err.message);
            isConnected = false;
        });

        connection.on('close', () => {
            console.log('RabbitMQ Connection Closed');
            isConnected = false;
        });

        channel = await connection.createChannel();
        isConnected = true;
        
        // Assert Queues to ensure they exist
        await channel.assertQueue('order_processing', { durable: true });
        await channel.assertQueue('notifications', { durable: true });

        console.log('✅ Successfully connected to RabbitMQ and asserted queues');
    } catch (err) {
        isConnected = false;
        if (err.code === 'ECONNREFUSED') {
            console.error('❌ RabbitMQ Connection Refused. Ensure RabbitMQ is running via Docker.');
        } else {
            console.error('Failed to connect to RabbitMQ:', err.message);
        }
    }
};

/**
 * Publishes a message to a specific queue
 * @param {string} queueName - Name of the queue (e.g. 'order_processing')
 * @param {object} payload - The message payload to dispatch
 */
const publishMessage = async (queueName, payload) => {
    if (!channel || !isConnected) {
        console.error(`RabbitMQ: Cannot publish to ${queueName} - channel not available`);
        return;
    }
    
    try {
        channel.sendToQueue(
            queueName, 
            Buffer.from(JSON.stringify(payload)),
            { persistent: true } // Keeps messages across server restarts
        );
        console.log(`[x] Message published to ${queueName}`);
    } catch (err) {
        console.error('Error publishing message to RabbitMQ:', err.message);
    }
};

// Export the setup function and the publisher
module.exports = {
    connectRabbitMQ,
    publishMessage,
    isRabbitConnected: () => isConnected
};

