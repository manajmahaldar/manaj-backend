const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const FormData = require('form-data');
const User = require('../src/models/User');

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ phone: '9876543210' });
        if (!user) {
            console.log('Test user "Trader Test" not found!');
            await mongoose.connection.close();
            return;
        }

        console.log('Signing token for user...');
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

        // 1x1 pixel transparent PNG in base64
        const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        const webmBuffer = Buffer.from('GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibW1kQoSAhEFVbkVIdXBCQ3VyQnVja0gAdVVCa1ZQc1pBaElBQVNBQUFBR0FBQURVQUFBQUNBQWdBQUFBQ0FBQUFB', 'base64'); // dummy webm header

        console.log('Building Form Data...');
        const form = new FormData();
        form.append('name', 'Trader Test Updated');
        form.append('email', 'tradertest@matsyalink.com');
        form.append('phone', '9876543210');
        form.append('district', 'West Bengal');
        form.append('localDistrict', 'Kalimpong');
        form.append('policeStation', 'haldia');

        form.append('profilePicture', pngBuffer, { filename: 'profile.png', contentType: 'image/png' });
        form.append('aadhaar', pngBuffer, { filename: 'aadhaar.png', contentType: 'image/png' });
        form.append('video', webmBuffer, { filename: 'video.webm', contentType: 'video/webm' });

        console.log('Sending PUT request to verify-profile API...');
        const response = await axios.put('http://localhost:5000/api/users/verify-profile', form, {
            headers: {
                ...form.getHeaders(),
                'x-auth-token': token
            }
        });

        console.log('API Response Status:', response.status);
        console.log('API Response Data:', JSON.stringify(response.data, null, 2));

        await mongoose.connection.close();
    } catch (err) {
        console.error('API Error:', err.response ? {
            status: err.response.status,
            data: err.response.data
        } : err.message);
        await mongoose.connection.close();
    }
};

run();
