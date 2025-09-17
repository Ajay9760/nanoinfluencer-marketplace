const express = require('express');
const router = express.Router();

const applicationsController = require('../controllers/applicationsController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');

/**
 * Validation for campaign application
 */
const validateApplication = [
  body('message')
    .notEmpty()
    .withMessage('Application message is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters'),
  
  body('proposedContent')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Proposed content must be less than 2000 characters'),
  
  body('portfolioUrls')
    .optional()
    .isArray()
    .withMessage('Portfolio URLs must be an array'),
  
  body('appliedPlatforms')
    .isArray({ min: 1 })
    .withMessage('At least one platform must be selected'),
];

/**
 * Validation for status update
 */
const validateStatusUpdate = [
  body('status')
    .isIn(['pending', 'approved', 'rejected', 'completed', 'cancelled', 'in_progress'])
    .withMessage('Invalid status'),
  
  body('brandResponse')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Brand response must be less than 1000 characters'),
];

/**
 * Validation for content submission
 */
const validateContentSubmission = [
  body('submittedContent')
    .notEmpty()
    .withMessage('Submitted content is required')
    .isObject()
    .withMessage('Submitted content must be an object'),
];

/**
 * @route   GET /api/applications
 * @desc    Get all applications for current user
 * @access  Private
 */
router.get('/', authenticate, applicationsController.getApplications);

/**
 * @route   GET /api/applications/stats
 * @desc    Get application statistics
 * @access  Private
 */
router.get('/stats', authenticate, applicationsController.getApplicationStats);

/**
 * @route   POST /api/applications/campaigns/:campaignId
 * @desc    Apply to a campaign
 * @access  Private (Influencers only)
 */
router.post('/campaigns/:campaignId', 
  authenticate,
  validateApplication,
  applicationsController.applyToCampaign
);

/**
 * @route   PUT /api/applications/:id/status
 * @desc    Update application status
 * @access  Private (Brand owners only)
 */
router.put('/:id/status',
  authenticate,
  validateStatusUpdate,
  applicationsController.updateApplicationStatus
);

/**
 * @route   PUT /api/applications/:id/content
 * @desc    Submit content for approved application
 * @access  Private (Application owner only)
 */
router.put('/:id/content',
  authenticate,
  validateContentSubmission,
  applicationsController.submitContent
);

module.exports = router;