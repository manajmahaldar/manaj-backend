const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', default: null }, // Triggered from a quiz or course complete
    certificateId: { type: String, required: true, unique: true }, // Format: ML-LH-XXXXXX
    name: { type: String, required: true }, // User's full name printed on the cert
    course: { type: String, required: true }, // Name of the learning topic or module completed
    issuedAt: { type: Date, default: Date.now },
    qrCode: { type: String, default: '' }, // QR code image URL
    pdfUrl: { type: String, default: '' } // Cloudinary PDF URL
}, { timestamps: true });

certificateSchema.index({ userId: 1 });
certificateSchema.index({ certificateId: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', certificateSchema);
