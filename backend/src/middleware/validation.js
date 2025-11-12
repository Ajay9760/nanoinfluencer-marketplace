const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation results
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Validation rules for user registration
 */
const validateRegister = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('role')
    .optional()
    .isIn(['brand', 'influencer'])
    .withMessage('Role must be either "brand" or "influencer"')
];

/**
 * Validation rules for user login
 */
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validation rules for profile update
 */
const validateProfileUpdate = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .trim(),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

/**
 * Validation rules for password change
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

/**
 * Validation rules for campaign creation
 */
const validateCampaignCreate = [
  body('title')
    .notEmpty()
    .withMessage('Campaign title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters')
    .trim(),
  
  body('description')
    .notEmpty()
    .withMessage('Campaign description is required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters')
    .trim(),
  
  body('goal')
    .isIn(['awareness', 'conversions', 'engagement', 'ugc', 'brand_mention'])
    .withMessage('Invalid campaign goal'),
  
  body('budget')
    .isFloat({ min: 1 })
    .withMessage('Budget must be a positive number'),
  
  body('budgetPerInfluencer')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Budget per influencer must be a positive number'),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code (e.g., USD, INR)'),
  
  body('targetAudience')
    .optional()
    .isObject()
    .withMessage('Target audience must be an object'),
  
  body('targetFollowerRange')
    .optional()
    .isObject()
    .withMessage('Target follower range must be an object'),
  
  body('targetEngagementRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Target engagement rate must be between 0 and 100'),
  
  body('contentRequirements')
    .optional()
    .isObject()
    .withMessage('Content requirements must be an object'),
  
  body('applicationDeadline')
    .optional()
    .isISO8601()
    .withMessage('Application deadline must be a valid date'),
  
  body('contentSubmissionDeadline')
    .optional()
    .isISO8601()
    .withMessage('Content submission deadline must be a valid date'),
  
  body('campaignStartDate')
    .optional()
    .isISO8601()
    .withMessage('Campaign start date must be a valid date'),
  
  body('campaignEndDate')
    .optional()
    .isISO8601()
    .withMessage('Campaign end date must be a valid date')
];

/**
 * Validation rules for campaign update
 */
const validateCampaignUpdate = [
  param('id')
    .isUUID()
    .withMessage('Invalid campaign ID'),
  
  ...validateCampaignCreate.map(rule => rule.optional())
];

/**
 * Validation rules for UUID parameters
 */
const validateUUIDParam = (paramName = 'id') => [
  param(paramName)
    .isUUID()
    .withMessage(`Invalid ${paramName}`)
];

/**
 * Validation rules for pagination
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isAlphanumeric()
    .withMessage('Sort by field must be alphanumeric'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either "asc" or "desc"')
];

/**
 * Validation rules for search queries
 */
const validateSearch = [
  query('q')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .trim(),
  
  ...validatePagination
];

module.exports = {
  validateRequest,
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validateCampaignCreate,
  validateCampaignUpdate,
  validateUUIDParam,
  validatePagination,
  validateSearch
};
