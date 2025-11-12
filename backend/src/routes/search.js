const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { query } = require('express-validator');

/**
 * @route GET /api/search/campaigns
 * @desc Search campaigns with advanced filtering
 * @access Public (some filters may require auth)
 */
router.get(
  '/campaigns',
  [
    query('q').optional().isLength({ min: 1, max: 100 }).withMessage('Query must be 1-100 characters'),
    query('goal').optional().isIn(['awareness', 'conversions', 'engagement', 'ugc', 'brand_mention']).withMessage('Invalid goal'),
    query('status').optional().isIn(['draft', 'active', 'paused', 'completed', 'cancelled']).withMessage('Invalid status'),
    query('min_budget').optional().isFloat({ min: 0 }).withMessage('Minimum budget must be positive'),
    query('max_budget').optional().isFloat({ min: 0 }).withMessage('Maximum budget must be positive'),
    query('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
  ],
  validateRequest,
  searchController.searchCampaigns
);

/**
 * @route GET /api/search/influencers
 * @desc Search influencers with advanced filtering
 * @access Public
 */
router.get(
  '/influencers',
  [
    query('q').optional().isLength({ min: 1, max: 100 }).withMessage('Query must be 1-100 characters'),
    query('min_followers').optional().isInt({ min: 0 }).withMessage('Min followers must be positive'),
    query('max_followers').optional().isInt({ min: 0 }).withMessage('Max followers must be positive'),
    query('min_engagement').optional().isFloat({ min: 0, max: 100 }).withMessage('Min engagement must be 0-100%'),
    query('max_engagement').optional().isFloat({ min: 0, max: 100 }).withMessage('Max engagement must be 0-100%'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
  ],
  validateRequest,
  searchController.searchInfluencers
);

/**
 * @route GET /api/search/suggestions
 * @desc Get search suggestions for autocomplete
 * @access Public
 */
router.get(
  '/suggestions',
  [
    query('q').isLength({ min: 2, max: 50 }).withMessage('Query must be 2-50 characters'),
    query('type').optional().isIn(['campaigns', 'influencers']).withMessage('Type must be campaigns or influencers')
  ],
  validateRequest,
  searchController.getSearchSuggestions
);

/**
 * @route GET /api/search/trending
 * @desc Get trending searches and popular categories
 * @access Public
 */
router.get('/trending', searchController.getTrendingSearches);

/**
 * @route GET /api/search/filters
 * @desc Get available filter options
 * @access Public
 */
router.get('/filters', searchController.getFilterOptions);

/**
 * @route GET /api/search/global
 * @desc Global search across all content types
 * @access Public
 */
router.get(
  '/global',
  [
    query('q').isLength({ min: 2, max: 100 }).withMessage('Query must be 2-100 characters'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be 1-20')
  ],
  validateRequest,
  searchController.globalSearch
);

module.exports = router;