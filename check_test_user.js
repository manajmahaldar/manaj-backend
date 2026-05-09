const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

dotenv.config();

const checkUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({ 
            $or: [
                { email: /duplicate/i },
                { phone: /9876543210/ }
            ]
        });

        console.log('Matching users found:', users.length);
        users.forEach(u => {
            console.log(`ID: ${u._id}, Email: ${u.email}, Phone: ${u.phone}`);
        });

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

checkUser();
