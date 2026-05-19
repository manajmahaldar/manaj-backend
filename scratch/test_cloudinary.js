const dotenv = require('dotenv');
dotenv.config();

const { uploadToCloudinary } = require('../src/config/cloudinary');

const testUpload = async () => {
    try {
        console.log('Testing Cloudinary upload...');
        const buffer = Buffer.from('dummy image content');
        const result = await uploadToCloudinary(buffer, {
            folder: 'monaj/test',
            resource_type: 'image'
        });
        console.log('Upload successful! Result:', result.secure_url);
    } catch (err) {
        console.error('Upload failed with error:', err);
    }
};

testUpload();
