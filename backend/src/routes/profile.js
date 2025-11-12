const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  changePassword,
  updatePreferences,
  getActivityTimeline
} = require('../controllers/profileController');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation middleware
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters'),
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Website must be a valid URL'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Phone must be a valid phone number')
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Routes
router.get('/', getProfile);
router.put('/', validateProfileUpdate, updateProfile);
router.put('/password', validatePasswordChange, changePassword);
router.put('/preferences', updatePreferences);
router.get('/activity', getActivityTimeline);

module.exports = router;