const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  getSocialAccounts,
  addSocialAccount,
  updateSocialAccount,
  deleteSocialAccount,
  getSocialAccountById,
  syncSocialAccount,
  getPlatformStats
} = require('../controllers/socialMediaController');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation middleware
const validateSocialAccount = [
  body('platform')
    .isIn(['instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'linkedin', 'snapchat', 'pinterest', 'twitch'])
    .withMessage('Invalid platform'),
  body('username')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Username must be between 1 and 100 characters'),
  body('followersCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Followers count must be a non-negative integer'),
  body('engagementRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Engagement rate must be between 0 and 100')
];

// Routes
router.get('/', getSocialAccounts);
router.get('/stats', getPlatformStats);
router.get('/:id', getSocialAccountById);
router.post('/', validateSocialAccount, addSocialAccount);
router.put('/:id', updateSocialAccount);
router.delete('/:id', deleteSocialAccount);
router.post('/:id/sync', syncSocialAccount);

module.exports = router;