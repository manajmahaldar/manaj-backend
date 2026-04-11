require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

// Connect Database
connectDB();

// Initialize RabbitMQ message broker
const { connectRabbitMQ } = require('./config/rabbitClient');
connectRabbitMQ();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
