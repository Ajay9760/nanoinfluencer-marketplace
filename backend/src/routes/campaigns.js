const express = require('express');
const router = express.Router();

const campaignController = require('../controllers/campaignController');
const { authenticate, authorize } = require('../middleware/auth');
const {
  validateCampaignCreate,
  validateCampaignUpdate,
  validateUUIDParam,
  validatePagination,
  validateSearch
} = require('../middleware/validation');

/**
 * @route   GET /api/campaigns
 * @desc    Get all campaigns with filtering and pagination
 * @access  Private
 */
router.get('/', authenticate, validatePagination, campaignController.getCampaigns);

/**
 * @route   GET /api/campaigns/search
 * @desc    Search campaigns
 * @access  Private
 */
router.get('/search', authenticate, validateSearch, campaignController.getCampaigns);

/**
 * @route   GET /api/campaigns/stats
 * @desc    Get campaign statistics for current user
 * @access  Private
 */
router.get('/stats', authenticate, campaignController.getCampaignStats);

/**
 * @route   GET /api/campaigns/:id
 * @desc    Get single campaign by ID
 * @access  Private
 */
router.get('/:id', authenticate, validateUUIDParam('id'), campaignController.getCampaign);

/**
 * @route   POST /api/campaigns
 * @desc    Create new campaign
 * @access  Private (Brands only)
 */
router.post('/', 
  authenticate, 
  authorize('brand'), 
  validateCampaignCreate, 
  campaignController.createCampaign
);

/**
 * @route   PUT /api/campaigns/:id
 * @desc    Update campaign
 * @access  Private (Campaign owner only)
 */
router.put('/:id', 
  authenticate, 
  validateUUIDParam('id'), 
  validateCampaignUpdate, 
  campaignController.updateCampaign
);

/**
 * @route   DELETE /api/campaigns/:id
 * @desc    Delete campaign
 * @access  Private (Campaign owner only)
 */
router.delete('/:id', 
  authenticate, 
  validateUUIDParam('id'), 
  campaignController.deleteCampaign
);

module.exports = router;