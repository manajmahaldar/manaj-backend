const mongoose = require('mongoose');

/**
 * AuditLog — immutable record of security-sensitive events.
 * Never update or delete audit records; only insert.
 */
const auditLogSchema = new mongoose.Schema({
    userId: {
        type:  mongoose.Schema.Types.ObjectId,
        ref:   'User',
        index: true
    },
    action: {
        type:     String,
        required: true,
        enum: [
            'login_success',
            'login_fail',
            'login_locked',
            'logout',
            'token_refresh',
            'password_change',
            'password_reset_request',
            'password_reset_success',
            'register',
            'role_action',
            'suspicious'
        ]
    },
    ip:        { type: String },
    userAgent: { type: String },
    meta:      { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true }
}, {
    // Prevent accidental updates to audit records
    versionKey: false
});

// Compound index for fast per-user queries sorted by time
auditLogSchema.index({ userId: 1, createdAt: -1 });

// Auto-expire logs after 90 days (optional — remove if you need permanent logs)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

/**
 * Static helper — call AuditLog.record({ ... }) instead of new AuditLog().save()
 * Swallows errors silently so a logging failure never breaks the auth flow.
 */
auditLogSchema.statics.record = async function ({ userId, action, req, meta = {} }) {
    try {
        await this.create({
            userId,
            action,
            ip:        req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown',
            userAgent: req?.headers?.['user-agent'] || 'unknown',
            meta
        });
    } catch (err) {
        console.error('[AuditLog] Failed to write audit record:', err.message);
    }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
