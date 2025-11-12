const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  searchInfluencers,
  getInfluencerById,
  getInfluencerCategories,
  getPlatformStats,
  getTrendingInfluencers
} = require('../controllers/influencersController');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/influencers/search
 * @desc    Search and discover influencers with filters
 * @access  Private
 * @params  platform, minFollowers, maxFollowers, minEngagementRate, 
 *          maxEngagementRate, location, verified, category, search,
 *          sortBy, sortOrder, limit, offset
 */
router.get('/search', searchInfluencers);

/**
 * @route   GET /api/influencers/trending
 * @desc    Get trending influencers based on recent performance
 * @access  Private
 * @params  limit, platform, timeframe
 */
router.get('/trending', getTrendingInfluencers);

/**
 * @route   GET /api/influencers/categories
 * @desc    Get influencer categories and statistics
 * @access  Private
 */
router.get('/categories', getInfluencerCategories);

/**
 * @route   GET /api/influencers/platform-stats
 * @desc    Get statistics by platform
 * @access  Private
 */
router.get('/platform-stats', getPlatformStats);

/**
 * @route   GET /api/influencers/:id
 * @desc    Get influencer profile by ID
 * @access  Private
 */
router.get('/:id', getInfluencerById);

module.exports = router;