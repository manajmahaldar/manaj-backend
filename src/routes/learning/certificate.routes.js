const express = require('express');
const router = express.Router();
const certificateController = require('../../controllers/learning/certificate.controller');
const { auth } = require('../../middleware/auth.middleware');

router.get('/', auth, certificateController.getCertificates);
router.post('/generate', auth, certificateController.generateCertificate);
router.get('/verify/:certificateId', certificateController.verifyCertificate); // Publicly accessible for verification

module.exports = router;
