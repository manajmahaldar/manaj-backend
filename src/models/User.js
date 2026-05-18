const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const refreshTokenSchema = new mongoose.Schema({
    token:     { type: String, required: true }, // stored as SHA-256 hash
    createdAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
    name:     { type: String, required: true, trim: true },
    email:    { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    googleId: { type: String, unique: true, sparse: true },
    phone:    { type: String, unique: true, sparse: true, trim: true },
    password: {
        type: String,
        required: function () { return !this.googleId; },
        select: false   // never returned in queries unless explicitly requested
    },
    district: { type: String, required: function () { return !this.googleId; } },
    localDistrict: { type: String, default: '' },
    role: {
        type: String,
        enum: ['farmer', 'seller', 'trader', 'hatchery', 'admin', 'delivery_partner'],
        default: 'farmer'
    },

    // --- Verification ---
    verifiedStatus:             { type: Boolean, default: false },
    isVerified:                 { type: Boolean, default: false },
    accountStatus:              { type: String, enum: ['active', 'suspended', 'pending'], default: 'pending' },
    aadhaarCard:                { type: String, default: '' },
    verificationVideo:          { type: String, default: '' },
    verificationRejectedReason: { type: String, default: '' },
    profilePicture:             { type: String, default: '' },

    // --- Password reset ---
    resetPasswordToken:   { type: String, select: false },
    resetPasswordExpires: { type: Date,   select: false },

    // --- Security / account lockout ---
    failedLoginAttempts: { type: Number,  default: 0 },
    lockUntil:           { type: Date,    default: null },
    lastLogin:           { type: Date },
    passwordChangedAt:   { type: Date },

    // --- Refresh tokens (hashed, rotate on use) ---
    refreshTokens: { type: [refreshTokenSchema], default: [] },

    createdAt: { type: Date, default: Date.now }
});

// ── Indexes ──────────────────────────────────────────────────────────────────
// phone, email, googleId are already indexed via unique:true in schema
userSchema.index({ accountStatus: 1 });
userSchema.index({ role: 1 });

// ── Virtual: isLocked ─────────────────────────────────────────────────────────
userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ── toJSON: strip sensitive fields ────────────────────────────────────────────
userSchema.set('toJSON', {
    transform: function (_doc, ret) {
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.refreshTokens;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        return ret;
    }
});

// ── Pre-save: hash password (cost 12) ─────────────────────────────────────────
userSchema.pre('save', async function () {
    if (!this.password || !this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
    // Invalidate all refresh tokens whenever password changes
    if (!this.isNew) {
        this.refreshTokens     = [];
        this.passwordChangedAt = new Date();
    }
});

// ── Instance: compare password ────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// ── Instance: handle failed login attempt ─────────────────────────────────────
const MAX_ATTEMPTS = 1000;
const LOCK_TIME    = 1 * 1000; // 1 second (effectively removed)

userSchema.methods.incFailedAttempts = async function () {
    // If a previous lock has expired, restart the counter
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set:   { failedLoginAttempts: 1, lockUntil: null }
        });
    }

    const updates = { $inc: { failedLoginAttempts: 1 } };

    // Lock account on reaching MAX_ATTEMPTS
    if (this.failedLoginAttempts + 1 >= MAX_ATTEMPTS && !this.isLocked) {
        updates.$set = { lockUntil: new Date(Date.now() + LOCK_TIME) };
    }

    return this.updateOne(updates);
};

// ── Instance: reset failed attempts on successful login ───────────────────────
userSchema.methods.resetFailedAttempts = async function () {
    return this.updateOne({
        $set: { failedLoginAttempts: 0, lockUntil: null, lastLogin: new Date() }
    });
};

module.exports = mongoose.model('User', userSchema);
