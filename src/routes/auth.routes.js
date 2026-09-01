const express    = require('express');
const router     = express.Router();
const rateLimit  = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const { client: redisClient, isConnected } = require('../config/redisClient');
const { body }   = require('express-validator');
const authCtrl   = require('../controllers/auth.controller');
const { auth }   = require('../middleware/auth.middleware');
const { handleValidationErrors } = require('../middleware/validate.middleware');

// ── Rate limiters ─────────────────────────────────────────────────────────────

// Helper to create store conditionally
const getRedisStore = (prefix) => {
    if (isConnected()) {
        return new RedisStore({
            sendCommand: (...args) => redisClient.sendCommand(args),
            prefix: prefix
        });
    }
    return undefined; // fallback to memory
};

// Increased: 100 attempts per 1 min per IP for login / register
const strictAuthLimiter = rateLimit({
    windowMs:       1 * 60 * 1000,
    max:            100,
    store:          getRedisStore('rl:auth:'),
    standardHeaders: true,
    legacyHeaders:  false,
    message: { msg: 'Too many attempts. Please try again in 1 minute.' }
});

// Increased: 50 per 1 min for password-related flows
const passwordLimiter = rateLimit({
    windowMs:       1 * 60 * 1000,
    max:            50,
    store:          getRedisStore('rl:pw:'),
    standardHeaders: true,
    legacyHeaders:  false,
    message: { msg: 'Too many password reset requests. Please try again later.' }
});

// Increased: 500 per 1 min for refresh token
const refreshLimiter = rateLimit({
    windowMs:       1 * 60 * 1000,
    max:            500,
    store:          getRedisStore('rl:refresh:'),
    standardHeaders: true,
    legacyHeaders:  false,
    message: { msg: 'Too many token refresh requests.' }
});

// ── Routes ────────────────────────────────────────────────────────────────────

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post(
    '/register',
    strictAuthLimiter,
    [
        body('name').notEmpty().withMessage('Name is required').trim(),
        body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email address'),
        body('phone').optional({ checkFalsy: true }).isMobilePhone('en-IN').withMessage('Invalid Indian phone number'),
        body('password')
            .matches(/^[0-9]{6}$/)
            .withMessage('Password must be exactly 6 digits'),
        body('district').notEmpty().withMessage('District is required'),
    ],
    handleValidationErrors,
    authCtrl.register
);

// @route   POST /api/auth/send-otp
// @desc    Send OTP to mobile (Mock)
// @access  Public
router.post('/send-otp', strictAuthLimiter, authCtrl.sendOtp);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and login/register
// @access  Public
router.post('/verify-otp', strictAuthLimiter, authCtrl.verifyOtp);

// @route   POST /api/auth/login
// @desc    Login with phone/email + password
// @access  Public
router.post(
    '/login',
    strictAuthLimiter,
    [
        body('email').notEmpty().withMessage('Email/Phone is required').trim(),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    handleValidationErrors,
    authCtrl.login
);

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
// @access  Protected (non-strict)
router.post('/logout', authCtrl.logout);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post(
    '/forgot-password',
    passwordLimiter,
    [
        body('email').isEmail().withMessage('Valid email is required'),
    ],
    handleValidationErrors,
    authCtrl.forgotPassword
);

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password using token from email
// @access  Public
router.post(
    '/reset-password/:token',
    passwordLimiter,
    [
        body('password')
            .matches(/^[0-9]{6}$/)
            .withMessage('Password must be exactly 6 digits'),
    ],
    handleValidationErrors,
    authCtrl.resetPassword
);

// @route   GET /api/auth/test-brevo
// @desc    Temporary Brevo key verification diagnostic
// @access  Public
router.get('/test-brevo', authCtrl.testBrevo);

module.exports = router;
