const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fish-marketplace');
        console.log(`Connected to MongoDB: ${conn.connection.host}`);
    } catch (err) {
        console.error(`Error connecting to MongoDB: ${err.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
