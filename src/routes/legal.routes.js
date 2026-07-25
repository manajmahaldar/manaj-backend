const express = require('express');
const router = express.Router();
const legalController = require('../controllers/legal.controller');
const { auth } = require('../middleware/auth.middleware');

// Public policy & grievance endpoints
router.get('/policies/:slug', legalController.getPolicyBySlug);
router.get('/policies/:slug/versions', legalController.getPolicyVersions);
router.post('/grievance', legalController.submitGrievance);

// Auth protected user privacy rights endpoints
router.post('/consent', auth, legalController.recordConsent);
router.get('/consent/my-consents', auth, legalController.getUserConsents);
router.get('/user-data/export', auth, legalController.exportUserData);
router.post('/user-data/delete-request', auth, legalController.requestAccountDeletion);

module.exports = router;
