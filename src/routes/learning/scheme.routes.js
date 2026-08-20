const express = require('express');
const router = express.Router();
const governmentSchemeController = require('../../controllers/learning/governmentScheme.controller');
const { auth } = require('../../middleware/auth.middleware');
const { authorizeRoles } = require('../../middleware/role.middleware');

const adminAuth = [auth, authorizeRoles('admin', 'superadmin')];

router.get('/', governmentSchemeController.getSchemes);          // public
router.get('/:idOrSlug', governmentSchemeController.getSchemeById); // public


// CMS Endpoints
router.post('/', ...adminAuth, governmentSchemeController.createScheme);
router.put('/:id', ...adminAuth, governmentSchemeController.updateScheme);
router.delete('/:id', ...adminAuth, governmentSchemeController.deleteScheme);

module.exports = router;
