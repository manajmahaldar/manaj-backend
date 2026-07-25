const express = require('express');
const router = express.Router();
const contentController = require('../../controllers/learning/content.controller');
const { auth } = require('../../middleware/auth.middleware');
const { authorizeRoles } = require('../../middleware/role.middleware');

const adminAuth = [auth, authorizeRoles('admin', 'superadmin')];

// Public / End-user learning content routes (auth required for tracking)
router.get('/', auth, contentController.getAllContent);
router.get('/suggestions', auth, contentController.getSearchSuggestions);
router.get('/categories', auth, contentController.getCategories);
router.get('/:idOrSlug', auth, contentController.getContentById);

// Admin CMS Content Management Endpoints
router.post('/', ...adminAuth, contentController.createContent);
router.put('/:id', ...adminAuth, contentController.updateContent);
router.delete('/:id', ...adminAuth, contentController.deleteContent);
router.post('/bulk', ...adminAuth, contentController.bulkAction);

// Admin Category Management Endpoints
router.post('/categories', ...adminAuth, contentController.createCategory);
router.put('/categories/:id', ...adminAuth, contentController.updateCategory);
router.delete('/categories/:id', ...adminAuth, contentController.deleteCategory);

module.exports = router;
