const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authController = require('../controllers/authController');
require('dotenv').config();

// @route   POST api/auth/register
// @desc    Register user
router.post('/register', authController.register);

// @route   POST api/auth/login
// @desc    Login user
router.post('/login', authController.login);

// @route   POST api/auth/google-login
// @desc    Google login
router.post('/google-login', authController.googleLogin);

// @route   POST api/auth/forgot-password
// @desc    Forgot password
router.post('/forgot-password', authController.forgotPassword);

// @route   POST api/auth/reset-password/:token
// @desc    Reset password
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;
