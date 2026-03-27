const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'fish_marketplace/listings',
        format: async (req, file) => {
            const ext = file.mimetype.split('/')[1];
            return ['jpg', 'png', 'jpeg', 'webp'].includes(ext) ? ext : 'jpg';
        },
        transformation: [{ width: 800, height: 800, crop: 'limit' }]
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = { cloudinary, upload };
