const crypto      = require('crypto');
const jwt         = require('jsonwebtoken');
const validator   = require('validator');
const { OAuth2Client } = require('google-auth-library');

const User      = require('../models/User');
const AuditLog  = require('../models/AuditLog');
const sendEmail = require('../utils/sendEmail');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Constants ─────────────────────────────────────────────────────────────────
const ACCESS_TOKEN_EXPIRY  = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const MAX_REFRESH_TOKENS_PER_USER = 5; // prevent unbounded growth

// ── Helpers ───────────────────────────────────────────────────────────────────
const signAccessToken = (user) =>
    jwt.sign(
        { id: user._id, role: user.role, iat: Math.floor(Date.now() / 1000) },
        process.env.JWT_SECRET || 'secretkey',
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

/**
 * Generate a cryptographically random refresh token,
 * return { raw, hashed } — raw goes to the cookie, hashed is stored in DB.
 */
const generateRefreshToken = () => {
    const raw    = crypto.randomBytes(64).toString('hex');
    const hashed = crypto.createHash('sha256').update(raw).digest('hex');
    return { raw, hashed };
};

const hashToken = (token) =>
    crypto.createHash('sha256').update(token).digest('hex');

const setCookieOptions = (res, raw) => {
    res.cookie('refreshToken', raw, {
        httpOnly:  true,
        secure:    process.env.NODE_ENV === 'production',
        sameSite:  'strict',
        maxAge:    REFRESH_COOKIE_MAX_AGE,
        path:      '/api/auth'
    });
};

const clearRefreshCookie = (res) => {
    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', path: '/api/auth' });
};

/**
 * Validate password strength:
 * 8+ chars, at least one uppercase, lowercase, digit, special char.
 */
const isStrongPassword = (pw) =>
    validator.isStrongPassword(pw, {
        minLength:        8,
        minLowercase:     1,
        minUppercase:     1,
        minNumbers:       1,
        minSymbols:       1,
    });

// ── Register ──────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
    const { name, phone, email, password, district, role } = req.body;

    // — Input validation —
    if (!name || !password || !district) {
        return res.status(400).json({ msg: 'Name, password, and district are required.' });
    }
    if (!phone && !email) {
        return res.status(400).json({ msg: 'Phone or email is required.' });
    }
    if (email && !validator.isEmail(email)) {
        return res.status(400).json({ msg: 'Invalid email address.' });
    }
    if (phone && !/^(?:\+?88)?01[3-9]\d{8}$/.test(phone)) {
        return res.status(400).json({ msg: 'Invalid Bangladeshi phone number.' });
    }
    if (!isStrongPassword(password)) {
        return res.status(400).json({
            msg: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
        });
    }
    const allowedRoles = ['farmer', 'seller', 'trader', 'hatchery'];
    if (role && !allowedRoles.includes(role)) {
        return res.status(400).json({ msg: 'Invalid role.' });
    }

    try {
        // Generic duplicate check — don't reveal which field conflicts
        const exists = await User.findOne({
            $or: [
                ...(phone ? [{ phone }] : []),
                ...(email ? [{ email }] : [])
            ]
        });
        if (exists) {
            return res.status(400).json({ msg: 'An account with these credentials already exists.' });
        }

        const user = new User({ name, phone, email, password, district, role: role || 'farmer' });
        await user.save();

        // Issue tokens
        const accessToken = signAccessToken(user);
        const { raw, hashed } = generateRefreshToken();

        user.refreshTokens.push({ token: hashed, createdAt: new Date() });
        await user.save();

        await AuditLog.record({ userId: user._id, action: 'register', req });

        setCookieOptions(res, raw);
        return res.status(201).json({
            token: accessToken,
            user: {
                id:       user._id,
                name:     user.name,
                phone:    user.phone,
                email:    user.email,
                role:     user.role,
                district: user.district,
                accountStatus: user.accountStatus
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
};

// ── Login ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
    const { phone, email, password } = req.body;

    if (!password || (!phone && !email)) {
        return res.status(400).json({ msg: 'Credentials are required.' });
    }

    try {
        // Fetch user with password (select:false by default)
        const query = email ? { email } : { phone };
        const user  = await User.findOne(query).select(
            '+password +failedLoginAttempts +lockUntil +refreshTokens +passwordChangedAt'
        );

        // Timing-safe: always run through bcrypt even if user not found
        const dummy = '$2a$12$dummyhashtopreventtimingattacksXXXXXXXXXXXXXXXX';
        if (!user) {
            await require('bcryptjs').compare(password, dummy).catch(() => {});
            await AuditLog.record({ action: 'login_fail', req, meta: { reason: 'user_not_found', query } });
            return res.status(400).json({ msg: 'Invalid credentials.' });
        }

        // Account lockout check
        if (user.isLocked) {
            const remaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
            await AuditLog.record({ userId: user._id, action: 'login_locked', req });
            return res.status(423).json({
                msg: `Account temporarily locked due to too many failed attempts. Try again in ${remaining} minute(s).`
            });
        }

        // Suspended account
        if (user.accountStatus === 'suspended') {
            return res.status(403).json({ msg: 'Account suspended. Contact support.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            await user.incFailedAttempts();
            await AuditLog.record({ userId: user._id, action: 'login_fail', req, meta: { reason: 'wrong_password' } });

            const attemptsLeft = Math.max(0, 5 - (user.failedLoginAttempts + 1));
            const msg = attemptsLeft > 0
                ? `Invalid credentials. ${attemptsLeft} attempt(s) remaining before lockout.`
                : 'Invalid credentials. Account is now locked for 15 minutes.';

            return res.status(400).json({ msg });
        }

        // — Success —
        await user.resetFailedAttempts();
        await AuditLog.record({ userId: user._id, action: 'login_success', req });

        const accessToken = signAccessToken(user);
        const { raw, hashed } = generateRefreshToken();

        // Enforce max stored refresh tokens (sliding window, remove oldest)
        user.refreshTokens.push({ token: hashed, createdAt: new Date() });
        if (user.refreshTokens.length > MAX_REFRESH_TOKENS_PER_USER) {
            user.refreshTokens = user.refreshTokens.slice(-MAX_REFRESH_TOKENS_PER_USER);
        }
        await user.save();

        setCookieOptions(res, raw);
        return res.json({
            token: accessToken,
            user: {
                id:            user._id,
                name:          user.name,
                phone:         user.phone,
                email:         user.email,
                role:          user.role,
                district:      user.district,
                accountStatus: user.accountStatus,
                profilePicture: user.profilePicture
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
};

// ── Refresh Token ─────────────────────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
    const raw = req.cookies?.refreshToken;
    if (!raw) {
        return res.status(401).json({ msg: 'No refresh token provided.' });
    }

    const hashed = hashToken(raw);

    try {
        const user = await User.findOne({ 'refreshTokens.token': hashed }).select(
            '+refreshTokens +passwordChangedAt'
        );

        if (!user) {
            // Possible token reuse — clear cookie
            clearRefreshCookie(res);
            return res.status(403).json({ msg: 'Invalid refresh token.' });
        }

        if (user.accountStatus === 'suspended') {
            clearRefreshCookie(res);
            return res.status(403).json({ msg: 'Account suspended.' });
        }

        // Rotate: remove old token, issue new pair
        user.refreshTokens = user.refreshTokens.filter(t => t.token !== hashed);
        const { raw: newRaw, hashed: newHashed } = generateRefreshToken();
        user.refreshTokens.push({ token: newHashed, createdAt: new Date() });
        if (user.refreshTokens.length > MAX_REFRESH_TOKENS_PER_USER) {
            user.refreshTokens = user.refreshTokens.slice(-MAX_REFRESH_TOKENS_PER_USER);
        }
        await user.save();

        await AuditLog.record({ userId: user._id, action: 'token_refresh', req });

        const accessToken = signAccessToken(user);
        setCookieOptions(res, newRaw);
        return res.json({ token: accessToken });
    } catch (err) {
        console.error('Refresh token error:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
};

// ── Logout ────────────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
    const raw = req.cookies?.refreshToken;
    clearRefreshCookie(res);

    if (!raw) {
        return res.status(200).json({ msg: 'Logged out.' });
    }

    const hashed = hashToken(raw);

    try {
        await User.findOneAndUpdate(
            { 'refreshTokens.token': hashed },
            { $pull: { refreshTokens: { token: hashed } } }
        );
        if (req.user) {
            await AuditLog.record({ userId: req.user._id, action: 'logout', req });
        }
        return res.status(200).json({ msg: 'Logged out successfully.' });
    } catch (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
};

// ── Google Login ──────────────────────────────────────────────────────────────
exports.googleLogin = async (req, res) => {
    const { token, role, district, isRegistration } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken:  token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const { sub: googleId, email, name, picture } = ticket.getPayload();

        let user = await User.findOne({ $or: [{ googleId }, { email }] }).select('+refreshTokens');

        if (isRegistration) {
            if (user) {
                return res.status(400).json({ msg: 'Account already exists. Please log in.' });
            }
            user = new User({
                googleId,
                email,
                name,
                profilePicture: picture,
                role:           role || 'farmer',
                district:       district || '',
                accountStatus:  'active'
            });
            await user.save();
            await AuditLog.record({ userId: user._id, action: 'register', req, meta: { provider: 'google' } });
        } else {
            if (!user) {
                return res.status(400).json({ msg: 'Account not found. Please register first.' });
            }
            if (!user.googleId) {
                user.googleId = googleId;
                if (!user.profilePicture) user.profilePicture = picture;
            }
        }

        if (user.accountStatus === 'suspended') {
            return res.status(403).json({ msg: 'Account suspended. Contact support.' });
        }

        const accessToken = signAccessToken(user);
        const { raw, hashed } = generateRefreshToken();

        user.refreshTokens.push({ token: hashed, createdAt: new Date() });
        if (user.refreshTokens.length > MAX_REFRESH_TOKENS_PER_USER) {
            user.refreshTokens = user.refreshTokens.slice(-MAX_REFRESH_TOKENS_PER_USER);
        }
        user.lastLogin = new Date();
        await user.save();

        await AuditLog.record({ userId: user._id, action: 'login_success', req, meta: { provider: 'google' } });

        setCookieOptions(res, raw);
        return res.json({
            token: accessToken,
            user: {
                id:             user._id,
                name:           user.name,
                email:          user.email,
                phone:          user.phone,
                role:           user.role,
                district:       user.district,
                profilePicture: user.profilePicture,
                accountStatus:  user.accountStatus
            }
        });
    } catch (err) {
        console.error('Google login error:', err);
        return res.status(500).json({ msg: 'Google login failed' });
    }
};

// ── Forgot Password ───────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    // Always return 200 — never reveal whether email exists (prevent enumeration)
    const genericResponse = { msg: 'If an account with that email exists, a reset link has been sent.' };

    if (!email || !validator.isEmail(email)) {
        return res.status(200).json(genericResponse);
    }

    try {
        const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpires');
        if (!user) {
            return res.status(200).json(genericResponse);
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken   = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
        await user.save();

        await AuditLog.record({ userId: user._id, action: 'password_reset_request', req });

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        try {
            await sendEmail({
                email:   user.email,
                subject: 'Password Reset — Monaj',
                message: `Reset your password: ${resetUrl}`,
                html: `
                    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e0e0e0;border-radius:10px">
                        <h2 style="color:#333;text-align:center">Password Reset Request</h2>
                        <p>Hi ${user.name},</p>
                        <p>You requested a password reset for your Monaj account. Click the button below — this link expires in <strong>10 minutes</strong>.</p>
                        <div style="text-align:center;margin:30px 0">
                            <a href="${resetUrl}" style="background:#16a34a;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold">Reset Password</a>
                        </div>
                        <p>If you didn't request this, ignore this email.</p>
                        <hr style="border:0;border-top:1px solid #eee;margin:20px 0">
                        <p style="font-size:12px;color:#888;text-align:center">&copy; 2026 Monaj Platform. All rights reserved.</p>
                    </div>
                `
            });
        } catch (emailErr) {
            console.error('Password reset email error:', emailErr);
            user.resetPasswordToken   = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
        }

        return res.status(200).json(genericResponse);
    } catch (err) {
        console.error('Forgot password error:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
};

// ── Reset Password ────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
    const { password } = req.body;

    if (!password || !isStrongPassword(password)) {
        return res.status(400).json({
            msg: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.'
        });
    }

    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    try {
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpires: { $gt: Date.now() }
        }).select('+resetPasswordToken +resetPasswordExpires +refreshTokens');

        if (!user) {
            return res.status(400).json({ msg: 'Invalid or expired reset token.' });
        }

        // Setting password triggers pre-save: bcrypt hash, clear refresh tokens, set passwordChangedAt
        user.password             = password;
        user.resetPasswordToken   = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        await AuditLog.record({ userId: user._id, action: 'password_reset_success', req });

        // Clear any refresh cookie
        clearRefreshCookie(res);

        return res.status(200).json({ msg: 'Password reset successful. Please log in again.' });
    } catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
};
