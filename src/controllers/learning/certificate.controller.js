const Certificate = require('../../models/learning/Certificate');
const Quiz = require('../../models/learning/Quiz');
const QuizAttempt = require('../../models/learning/QuizAttempt');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary from existing envs
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dvk7pvhpy',
    api_key: process.env.CLOUDINARY_API_KEY || '864771239923838',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'g3rJg_t7kXWj1HjS12-d-T4252o'
});

// @desc    Get user's generated certificates
exports.getCertificates = async (req, res) => {
    try {
        const userId = req.user.id;
        const certs = await Certificate.find({ userId }).populate('quizId', 'title');
        res.json({ success: true, data: certs });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Generate a custom PDF certificate with QR verification Code, upload it, and save to DB
exports.generateCertificate = async (req, res) => {
    try {
        const userId = req.user.id;
        const userName = req.user.name;
        const { quizId } = req.body;
        
        // 1. Validate if user passed the quiz
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ success: false, msg: 'Quiz not found' });
        }
        
        const latestAttempt = await QuizAttempt.findOne({ userId, quizId, passed: true })
            .sort({ score: -1 });
            
        if (!latestAttempt) {
            return res.status(400).json({ success: false, msg: 'You must pass the quiz to generate a certificate.' });
        }
        
        // Check if certificate already exists
        const existingCert = await Certificate.findOne({ userId, quizId });
        if (existingCert) {
            return res.json({ success: true, data: existingCert });
        }
        
        // Generate Certificate Code
        const certificateId = `ML-LH-${Math.floor(100000 + Math.random() * 900000)}`;
        const verifyUrl = `${req.protocol}://${req.get('host')}/verify-certificate/${certificateId}`;
        
        // Generate QR code base64
        const qrCodeBase64 = await QRCode.toDataURL(verifyUrl);
        
        // 2. Create Certificate PDF in memory
        const doc = new PDFDocument({
            layout: 'landscape',
            size: 'A4',
            margin: 0
        });
        
        const tempPdfPath = path.join(__dirname, `../../../../tmp/cert-${certificateId}.pdf`);
        const writeStream = fs.createWriteStream(tempPdfPath);
        doc.pipe(writeStream);
        
        // Build Certificate PDF Design
        // Outer border
        doc.rect(20, 20, 802, 555).lineWidth(4).stroke('#0066cc');
        doc.rect(28, 28, 786, 539).lineWidth(1.5).stroke('#33bbff');
        
        // Title
        doc.fontSize(40).font('Helvetica-Bold').fillColor('#0066cc')
            .text('MATSYALINK ACADEMY', 0, 70, { align: 'center' });
            
        doc.fontSize(16).font('Helvetica-Oblique').fillColor('#333')
            .text('Certificate of Completion', 0, 130, { align: 'center' });
            
        doc.fontSize(18).font('Helvetica').fillColor('#555')
            .text('This is proudly presented to', 0, 190, { align: 'center' });
            
        // Candidate Name
        doc.fontSize(32).font('Helvetica-Bold').fillColor('#111')
            .text(userName.toUpperCase(), 0, 240, { align: 'center' });
            
        doc.fontSize(16).font('Helvetica').fillColor('#555')
            .text(`for successfully completing the learning module and passing the quiz on`, 0, 310, { align: 'center' });
            
        // Course name
        doc.fontSize(22).font('Helvetica-Bold').fillColor('#0066cc')
            .text(`"${quiz.title}"`, 0, 350, { align: 'center' });
            
        doc.fontSize(14).font('Helvetica').fillColor('#666')
            .text(`Issued Date: ${new Date().toLocaleDateString()}  |  Certificate ID: ${certificateId}`, 0, 410, { align: 'center' });
            
        // Add verification QR code
        doc.image(qrCodeBase64, 370, 440, { width: 90, height: 90 });
        
        // Signatures
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#333')
            .text('Director, MatsyaLink', 80, 480, { align: 'left' });
        doc.line(50, 470, 250, 470).lineWidth(1).stroke('#999');
        
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#333')
            .text('Head of Education', 650, 480, { align: 'left' });
        doc.line(600, 470, 780, 470).lineWidth(1).stroke('#999');
        
        doc.end();
        
        // Wait for PDF to compile
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
        
        // 3. Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(tempPdfPath, {
            folder: 'matsyalink/certificates',
            resource_type: 'raw' // PDF files are uploaded as 'raw' resource type in Cloudinary
        });
        
        // Clean up local temp file
        fs.unlinkSync(tempPdfPath);
        
        // 4. Save certificate data to Database
        const newCertificate = new Certificate({
            userId,
            quizId,
            certificateId,
            name: userName,
            course: quiz.title,
            qrCode: qrCodeBase64,
            pdfUrl: uploadResult.secure_url
        });
        
        await newCertificate.save();
        
        res.json({ success: true, data: newCertificate });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Verify certificate publicly (via QR code verification flow)
exports.verifyCertificate = async (req, res) => {
    try {
        const { certificateId } = req.params;
        const cert = await Certificate.findOne({ certificateId }).populate('userId', 'name role');
        if (!cert) {
            return res.status(404).json({ success: false, msg: 'Invalid Certificate' });
        }
        res.json({ success: true, data: cert });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};
