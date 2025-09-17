const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  getDashboardStats,
  getCampaignAnalytics,
  getInfluencerAnalytics,
  addAnalytics,
  getPerformanceComparison
} = require('../controllers/analyticsController');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation middleware
const validateAnalytics = [
  body('entityType')
    .isIn(['campaign', 'influencer', 'application', 'content'])
    .withMessage('Invalid entity type'),
  body('platform')
    .isIn(['instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'linkedin', 'snapchat', 'pinterest', 'twitch'])
    .withMessage('Invalid platform'),
  body('metricType')
    .isIn([
      'impressions', 'reach', 'views', 'likes', 'comments', 'shares', 'saves', 'clicks',
      'engagement_rate', 'cpm', 'cpc', 'roi', 'conversion_rate', 'story_completion_rate', 'video_completion_rate'
    ])
    .withMessage('Invalid metric type'),
  body('value')
    .isNumeric()
    .withMessage('Value must be a number')
];

// Routes
router.get('/dashboard', getDashboardStats);
router.get('/campaigns/:campaignId', getCampaignAnalytics);
router.get('/influencer', getInfluencerAnalytics);
router.get('/comparison', getPerformanceComparison);
router.post('/', validateAnalytics, addAnalytics);

module.exports = router;