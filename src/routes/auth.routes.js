const express    = require('express');
const router     = express.Router();
const rateLimit  = require('express-rate-limit');
const authCtrl   = require('../controllers/auth.controller');
const { auth }   = require('../middleware/auth.middleware');

// ── Rate limiters ─────────────────────────────────────────────────────────────

// Increased: 100 attempts per 1 min per IP for login / register
const strictAuthLimiter = rateLimit({
    windowMs:       1 * 60 * 1000,
    max:            100,
    standardHeaders: true,
    legacyHeaders:  false,
    message: { msg: 'Too many attempts. Please try again in 1 minute.' }
});

// Increased: 50 per 1 min for password-related flows
const passwordLimiter = rateLimit({
    windowMs:       1 * 60 * 1000,
    max:            50,
    standardHeaders: true,
    legacyHeaders:  false,
    message: { msg: 'Too many password reset requests. Please try again later.' }
});

// Increased: 500 per 1 min for refresh token
const refreshLimiter = rateLimit({
    windowMs:       1 * 60 * 1000,
    max:            500,
    standardHeaders: true,
    legacyHeaders:  false,
    message: { msg: 'Too many token refresh requests.' }
});

// ── Routes ────────────────────────────────────────────────────────────────────

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', strictAuthLimiter, authCtrl.register);

// @route   POST /api/auth/login
// @desc    Login with phone/email + password
// @access  Public
router.post('/login', strictAuthLimiter, authCtrl.login);

// @route   POST /api/auth/google-login
// @desc    Login / register via Google OAuth
// @access  Public
router.post('/google-login', strictAuthLimiter, authCtrl.googleLogin);

// @route   POST /api/auth/refresh-token
// @desc    Rotate refresh token — issue new access token
// @access  Public (uses httpOnly cookie)
router.post('/refresh-token', refreshLimiter, authCtrl.refreshToken);

// @route   POST /api/auth/logout
// @desc    Invalidate refresh token + clear cookie
// @access  Protected
router.post('/logout', auth, authCtrl.logout);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', passwordLimiter, authCtrl.forgotPassword);

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password using token from email
// @access  Public
router.post('/reset-password/:token', passwordLimiter, authCtrl.resetPassword);

module.exports = router;
