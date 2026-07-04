const crypto      = require('crypto');
const jwt         = require('jsonwebtoken');
const validator   = require('validator');
const { OAuth2Client } = require('google-auth-library');

const User      = require('../models/User');
const AuditLog  = require('../models/AuditLog');
const logger    = require('../utils/logger');
const sendEmail = require('../utils/sendEmail');
const FraudService = require('../services/FraudService');

const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim()) || '613301631751-4m4t7be6u5cc37j651lco62j2p57564n.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);



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

/**
 * Standardize Indian phone numbers to 10 digits by removing
 * prefixes (+91, 91, or 0).
 */
const normalizePhone = (phone) => {
    if (!phone) return phone;
    // Remove all non-numeric characters first
    const digits = phone.replace(/\D/g, '');
    // If it's 12 digits and starts with 91, take last 10
    if (digits.length === 12 && digits.startsWith('91')) {
        return digits.slice(2);
    }
    // If it's 11 digits and starts with 0, take last 10
    if (digits.length === 11 && digits.startsWith('0')) {
        return digits.slice(1);
    }
    // If it's 10 digits, return as is
    if (digits.length === 10) {
        return digits;
    }
    return phone; // fallback to original if it doesn't match expected patterns
};

// ── Register ──────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
    const { name, phone, email, password, district, localDistrict, policeStation, role } = req.body;

    // — Input validation —
    if (!name || !password || !district) {
        console.warn('Registration failed: Missing required fields (name, password, or district)');
        return res.status(400).json({ msg: 'Name, password, and district are required.' });
    }
    if (!phone && !email) {
        console.warn('Registration failed: Neither phone nor email provided');
        return res.status(400).json({ msg: 'Phone or email is required.' });
    }
    if (email && !validator.isEmail(email)) {
        console.warn(`Registration failed: Invalid email format (${email})`);
        return res.status(400).json({ msg: 'Invalid email address.' });
    }
    if (phone && !/^(?:\+?91|0)?[6-9]\d{9}$/.test(phone)) {
        console.warn(`Registration failed: Invalid phone format (${phone})`);
        return res.status(400).json({ msg: 'Invalid Indian phone number.' });
    }
    if (!isStrongPassword(password)) {
        console.warn('Registration failed: Password strength requirements not met');
        return res.status(400).json({
            msg: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
        });
    }
    const allowedRoles = ['farmer', 'seller', 'trader', 'hatchery'];
    if (role && !allowedRoles.includes(role)) {
        console.warn(`Registration failed: Invalid role (${role})`);
        return res.status(400).json({ msg: 'Invalid role.' });
    }

    try {
        const normalizedPhone = phone ? normalizePhone(phone) : undefined;
        const normalizedEmail = email ? email.toLowerCase().trim() : undefined;

        // — Duplicate Check —
        if (normalizedEmail) {
            const emailExists = await User.findOne({ email: normalizedEmail });
            if (emailExists) {
                return res.status(400).json({ msg: 'An account with this email already exists.' });
            }
        }

        if (normalizedPhone) {
            const phoneExists = await User.findOne({ phone: normalizedPhone });
            if (phoneExists) {
                return res.status(400).json({ msg: 'An account with this phone number already exists.' });
            }
        }

        const fraudResult = await FraudService.detectFakeUser({
            name, phone: normalizedPhone, email: normalizedEmail
        }, req.ip);

        const user = new User({
            name,
            phone:    normalizedPhone,
            email:    normalizedEmail,
            password,
            district,
            localDistrict: localDistrict || '',
            policeStation: policeStation || '',
            role: role || 'farmer',
            registrationIp: req.ip || '',
            trustScore: fraudResult.trustScore,
            isFlagged: fraudResult.isFlagged,
            fraudReason: fraudResult.reason
        });
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
                localDistrict: user.localDistrict,
                policeStation: user.policeStation,
                accountStatus: user.accountStatus
            }
        });
    } catch (err) {
        // Handle MongoDB duplicate key error (code 11000)
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            const msg = field === 'email' ? 'Email already in use.' :
                        field === 'phone' ? 'Phone number already in use.' :
                        'An account with these credentials already exists.';
            return res.status(400).json({ msg });
        }

        console.error('Registration error:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
};

// ── Mock OTP Flow ─────────────────────────────────────────────────────────────
exports.sendOtp = async (req, res) => {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ msg: 'Mobile number is required' });
    
    // In a real app, integrate SMS gateway (Twilio, MSG91, AWS SNS, etc.)
    logger.info(`[Mock OTP] Sent OTP '1234' to ${mobile}`);
    return res.status(200).json({ msg: 'OTP sent successfully' });
};

exports.verifyOtp = async (req, res) => {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) return res.status(400).json({ msg: 'Mobile and OTP are required' });

    // Mock verification: accept '1234' for any number
    if (otp !== '1234') {
        return res.status(400).json({ msg: 'Invalid OTP' });
    }

    try {
        const normalizedPhone = normalizePhone(mobile);
        let user = await User.findOne({ phone: normalizedPhone }).select('+refreshTokens');

        if (!user) {
            // Auto-register mock user for seamless login
            user = new User({
                name: 'Guest ' + normalizedPhone,
                phone: normalizedPhone,
                district: 'Unknown',
                role: 'farmer',
                accountStatus: 'active'
            });
            await user.save();
            await AuditLog.record({ userId: user._id, action: 'register', req, meta: { provider: 'otp' } });
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
        user.lastLoginIp = req.ip || '';
        await user.save();

        await AuditLog.record({ userId: user._id, action: 'login_success', req, meta: { provider: 'otp' } });

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
                localDistrict: user.localDistrict,
                policeStation: user.policeStation,
                accountStatus: user.accountStatus,
                profilePicture: user.profilePicture
            }
        });
    } catch (err) {
        console.error('Verify OTP error:', err);
        return res.status(500).json({ msg: 'Server error' });
    }
};

// ── Login ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ msg: 'Email and password are required.' });
    }

    try {
        const normalizedEmail = email.toLowerCase().trim();

        // Fetch user with password (select:false by default)
        const user  = await User.findOne({ email: normalizedEmail }).select(
            '+password +failedLoginAttempts +lockUntil +refreshTokens +passwordChangedAt'
        );

        // Timing-safe: always run through bcrypt even if user not found
        const dummy = '$2a$12$dummyhashtopreventtimingattacksXXXXXXXXXXXXXXXX';
        if (!user) {
            await require('bcryptjs').compare(password, dummy).catch(() => {});
            await AuditLog.record({ action: 'login_fail', req, meta: { reason: 'user_not_found', email: normalizedEmail } });
            logger.warn(`Login failed: User not found`, { email: normalizedEmail, ip: req.ip });
            return res.status(401).json({ msg: 'Invalid credentials.' });
        }

        // Account lockout check
        if (user.isLocked && user.role !== 'admin') {
            await AuditLog.record({ userId: user._id, action: 'login_locked', req });
            return res.status(423).json({
                msg: `Account temporarily locked due to too many failed attempts. Please try again in a moment.`
            });
        }

        // Suspended account
        if (user.accountStatus === 'suspended') {
            return res.status(403).json({ msg: 'Account suspended. Contact support.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            if (user.role !== 'admin') {
                await user.incFailedAttempts();
            }
            await AuditLog.record({ userId: user._id, action: 'login_fail', req, meta: { reason: 'wrong_password' } });
            logger.warn(`Login failed: Incorrect password`, { userId: user._id, email: user.email, ip: req.ip });

            if (user.role === 'admin') {
                return res.status(401).json({ msg: 'Invalid credentials.' });
            }

            const attemptsLeft = Math.max(0, 1000 - (user.failedLoginAttempts + 1));
            const msg = attemptsLeft > 0
                ? `Invalid credentials. ${attemptsLeft} attempt(s) remaining before lockout.`
                : 'Invalid credentials. Account is temporarily locked.';

            return res.status(401).json({ msg });
        }

        // — Success —
        await user.resetFailedAttempts();
        await AuditLog.record({ userId: user._id, action: 'login_success', req });
        logger.info(`Login successful`, { userId: user._id, email: user.email, ip: req.ip });

        const accessToken = signAccessToken(user);
        const { raw, hashed } = generateRefreshToken();

        // Enforce max stored refresh tokens (sliding window, remove oldest)
        user.refreshTokens.push({ token: hashed, createdAt: new Date() });
        if (user.refreshTokens.length > MAX_REFRESH_TOKENS_PER_USER) {
            user.refreshTokens = user.refreshTokens.slice(-MAX_REFRESH_TOKENS_PER_USER);
        }
        await User.updateOne(
            { _id: user._id },
            { $set: { refreshTokens: user.refreshTokens, lastLogin: new Date(), lastLoginIp: req.ip || '' } }
        );

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
                localDistrict: user.localDistrict,
                policeStation: user.policeStation,
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
        await User.updateOne(
            { _id: user._id },
            { $set: { refreshTokens: user.refreshTokens } }
        );

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
        const user = await User.findOneAndUpdate(
            { 'refreshTokens.token': hashed },
            { $pull: { refreshTokens: { token: hashed } } }
        );
        const userId = req.user?._id || user?._id;
        if (userId) {
            await AuditLog.record({ userId, action: 'logout', req });
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
            audience: GOOGLE_CLIENT_ID
        });
        const { sub: googleId, email, name, picture } = ticket.getPayload();
        const normalizedEmail = email ? email.toLowerCase().trim() : undefined;

        let user = await User.findOne({ $or: [{ googleId }, { email: normalizedEmail }] }).select('+refreshTokens');

        if (isRegistration) {
            if (user) {
                return res.status(401).json({ msg: 'Account already exists. Please log in.' });
            }
            const fraudResult = await FraudService.detectFakeUser({
                name, email: normalizedEmail
            }, req.ip);

            user = new User({
                googleId,
                email,
                name,
                profilePicture: picture,
                role:           role || 'farmer',
                district:       district || '',
                accountStatus:  'pending',
                registrationIp: req.ip || '',
                trustScore:     fraudResult.trustScore,
                isFlagged:      fraudResult.isFlagged,
                fraudReason:    fraudResult.reason
            });
            await user.save();
            await AuditLog.record({ userId: user._id, action: 'register', req, meta: { provider: 'google' } });
        } else {
            if (!user) {
                return res.status(401).json({ msg: 'Account not found. Please register first.' });
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
        user.lastLoginIp = req.ip || '';
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
                localDistrict:  user.localDistrict,
                policeStation:  user.policeStation,
                profilePicture: user.profilePicture,
                accountStatus:  user.accountStatus
            }
        });
    } catch (err) {
        console.error('Google login error:', err.message);
        return res.status(401).json({ msg: `Google authentication failed: ${err.message}` });
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
