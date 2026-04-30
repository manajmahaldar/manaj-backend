const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const { authorizeRoles } = require('./role.middleware');
require('dotenv').config();

/**
 * auth
 * ─────
 * Verifies the JWT access token from the `x-auth-token` header.
 * Loads a fresh user record from DB so downstream middleware always
 * sees current accountStatus, role, and passwordChangedAt.
 */
const auth = async (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');

        const user = await User.findById(decoded.id)
            .select('+passwordChangedAt +lockUntil +failedLoginAttempts');

        if (!user) {
            return res.status(401).json({ msg: 'User no longer exists.' });
        }

        // ── Account lockout check ──────────────────────────────────────────
        if (user.isLocked) {
            const remaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
            return res.status(423).json({
                msg: `Account locked. Try again in ${remaining} minute(s).`
            });
        }

        // ── Suspended account check ───────────────────────────────────────
        if (user.accountStatus === 'suspended') {
            return res.status(403).json({ msg: 'Account suspended. Contact support.' });
        }

        // ── Password-changed-after-token-issued check ─────────────────────
        // If the user changed their password after this token was issued, reject it.
        if (user.passwordChangedAt) {
            const changedAt = Math.floor(user.passwordChangedAt.getTime() / 1000);
            if (decoded.iat < changedAt) {
                return res.status(401).json({
                    msg: 'Password was changed recently. Please log in again.',
                    code: 'TOKEN_INVALIDATED'
                });
            }
        }

        req.user = user;
        next();
    } catch (e) {
        if (e.name === 'TokenExpiredError') {
            return res.status(401).json({ msg: 'Token expired.', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ msg: 'Token is not valid.' });
    }
};

/**
 * admin
 * ─────
 * Allows only users with role === 'admin'.
 * Must be used AFTER `auth`.
 */
const admin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ msg: 'Access Denied. Admin only.' });
    }
    next();
};

/**
 * isVerified
 * ──────────
 * Ensures the user's account has been approved by admin (accountStatus === 'active').
 * Admins bypass this check.
 * Must be used AFTER `auth`.
 */
const isVerified = (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    if (req.user?.accountStatus !== 'active') {
        return res.status(403).json({
            msg: 'Account not yet verified. Please complete your profile and wait for admin approval.',
            accountStatus: req.user?.accountStatus
        });
    }
    next();
};

module.exports = { auth, admin, isVerified, authorizeRoles };
