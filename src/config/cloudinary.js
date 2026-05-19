const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use memory storage — we stream the buffer directly to Cloudinary
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { 
        fileSize: 200 * 1024 * 1024 // 200MB limit for admin video uploads
    },
    fileFilter: (req, file, cb) => {
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        const allowedDocTypes   = ['application/pdf'];

        const isImage = allowedImageTypes.includes(file.mimetype);
        // Accept any video/* MIME type (handles video/webm, video/webm;codecs=vp9, video/mp4, etc.)
        const isVideo = file.mimetype.startsWith('video/');
        const isDoc   = allowedDocTypes.includes(file.mimetype);

        if (isImage || isVideo || isDoc) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, PNG, WebP, video files, and PDF are allowed.'), false);
        }
    }
});

/**
 * Upload a file buffer to Cloudinary.
 * Uses chunked upload_large for videos/large files (>10MB) to prevent timeouts.
 */
const uploadToCloudinary = async (buffer, options = {}) => {
    const isVideo = options.resource_type === 'video' || (options.file && options.file.mimetype && options.file.mimetype.startsWith('video/'));
    const uploadOptions = {
        folder: options.folder || 'fish_marketplace/listings',
        resource_type: options.resource_type || 'auto',
        ...options
    };

    if (isVideo || buffer.length > 10 * 1024 * 1024) {
        // Use upload_large with a temp file for videos and large files to prevent timeouts
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempFilePath = path.join(tempDir, `upload_${Date.now()}_${Math.round(Math.random() * 1e9)}`);
        
        try {
            await writeFileAsync(tempFilePath, buffer);
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_large(tempFilePath, {
                    chunk_size: 6000000, // 6MB chunks
                    ...uploadOptions
                }, (error, uploadResult) => {
                    if (error) return reject(error);
                    resolve(uploadResult);
                });
            });
            return result;
        } finally {
            if (fs.existsSync(tempFilePath)) {
                await unlinkAsync(tempFilePath);
            }
        }
    } else {
        // Fallback to standard stream upload for normal/small files
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            });
            Readable.from(buffer).pipe(stream);
        });
    }
};

module.exports = { cloudinary, upload, uploadToCloudinary };
