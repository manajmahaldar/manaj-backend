const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { Readable } = require('stream');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use memory storage — we stream the buffer directly to Cloudinary
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * Upload a file buffer to Cloudinary via a stream.
 * Returns a Promise resolving to the Cloudinary upload result.
 */
const uploadToCloudinary = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder: 'fish_marketplace/listings',
            transformation: [{ width: 800, height: 800, crop: 'limit' }],
            ...options
        };
        const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });
        Readable.from(buffer).pipe(stream);
    });
};

module.exports = { cloudinary, upload, uploadToCloudinary };
