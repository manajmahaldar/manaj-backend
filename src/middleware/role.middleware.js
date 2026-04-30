/**
 * authorizeRoles(...roles)
 * --------------------------
 * Factory middleware for Role-Based Access Control.
 * Must be used AFTER the `auth` middleware (which populates req.user).
 *
 * Usage:
 *   router.get('/path', auth, authorizeRoles('farmer', 'admin'), handler)
 *
 * Returns 403 if the authenticated user's role is not in the allowed list.
 */
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ msg: 'Unauthorized: no authenticated user.' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                msg: `Access Denied. This resource is restricted to: [${roles.join(', ')}]. Your role: ${req.user.role}.`
            });
        }

        next();
    };
};

module.exports = { authorizeRoles };
