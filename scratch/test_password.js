const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../src/models/User');

dotenv.config();

const testPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'admin@matsyalink.com';
        const password = 'manajmatsya0934@';

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            console.log('User not found!');
            return;
        }

        console.log('User password hash:', user.password);
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match test:', isMatch);

        const isMatchMethod = await user.comparePassword(password);
        console.log('comparePassword method test:', isMatchMethod);

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

testPassword();
