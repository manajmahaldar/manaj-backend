const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ phone: '9593013549' });
        if (!user) {
            console.log('User not found!');
            return;
        }

        user.password = 'Password123!';
        await user.save();
        console.log('Successfully updated password of Hasibur Rahaman to "Password123!"');

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

run();
