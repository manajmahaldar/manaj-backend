const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');

dotenv.config();

const printUsersDetails = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({ phone: { $in: ['8696285055', '9593013549'] } }).lean();

        users.forEach(u => {
            console.log(JSON.stringify(u, null, 2));
            console.log('-----------------------------------');
        });

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

printUsersDetails();
