const dotenv = require('dotenv');
dotenv.config();

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { uploadToCloudinary } = require('../src/config/cloudinary');

const run = async () => {
    try {
        console.log('Downloading a tiny valid MP4 video...');
        const response = await axios.get('https://www.w3schools.com/html/movie.mp4', { responseType: 'arraybuffer' });
        const videoBuffer = Buffer.from(response.data);
        console.log('Downloaded video size:', videoBuffer.length, 'bytes');

        // Test 1: Uploading without extension
        console.log('\n--- Test 1: Uploading WITHOUT file extension ---');
        try {
            const result1 = await uploadToCloudinary(videoBuffer, {
                folder: 'monaj/test/video',
                resource_type: 'video'
            });
            console.log('Test 1 Success! URL:', result1.secure_url);
        } catch (err) {
            console.error('Test 1 Failed:', err.message || err);
        }

        // Test 2: Uploading WITH file extension
        console.log('\n--- Test 2: Uploading WITH file extension ---');
        // We will modify uploadToCloudinary slightly in our test script here to force it to use .mp4
        const uploadToCloudinaryWithExt = async (buffer, ext) => {
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempFilePath = path.join(tempDir, `upload_test_${Date.now()}${ext}`);
            const cloudinary = require('cloudinary').v2;
            
            try {
                fs.writeFileSync(tempFilePath, buffer);
                const result = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_large(tempFilePath, {
                        chunk_size: 6000000,
                        folder: 'monaj/test/video',
                        resource_type: 'video'
                    }, (error, uploadResult) => {
                        if (error) return reject(error);
                        resolve(uploadResult);
                    });
                });
                return result;
            } finally {
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
            }
        };

        try {
            const result2 = await uploadToCloudinaryWithExt(videoBuffer, '.mp4');
            console.log('Test 2 Success! URL:', result2.secure_url);
        } catch (err) {
            console.error('Test 2 Failed:', err.message || err);
        }

    } catch (err) {
        console.error('Script error:', err.message);
    }
};

run();
