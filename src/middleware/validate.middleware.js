const { validationResult } = require('express-validator');

/**
 * handleValidationErrors
 * ----------------------
 * Middleware to catch validation errors from express-validator
 * and return them in a standardized format.
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            msg: errors.array()[0].msg, // Return the first error message
            errors: errors.array()
        });
    }
    next();
};

module.exports = { handleValidationErrors };
