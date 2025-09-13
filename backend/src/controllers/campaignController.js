const Campaign = require('../models/Campaign');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { Op, sequelize } = require('sequelize');
const { sequelize: dbInstance } = require('../config/database');

/**
 * Get all campaigns with filtering, searching, and pagination
 */
const getCampaigns = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc',
      status,
      goal,
      minBudget,
      maxBudget,
      search,
      brandId
    } = req.query;

    // Build where clause
    const whereClause = {};
    
    if (status) whereClause.status = status;
    if (goal) whereClause.goal = goal;
    if (minBudget) whereClause.budget = { ...whereClause.budget, [Op.gte]: minBudget };
    if (maxBudget) whereClause.budget = { ...whereClause.budget, [Op.lte]: maxBudget };
    if (brandId) whereClause.brandId = brandId;
    
    // If user is not admin, only show their own campaigns (brands) or active campaigns (influencers)
    if (req.user.role === 'brand') {
      whereClause.brandId = req.user.id;
    } else if (req.user.role === 'influencer') {
      whereClause.status = 'active';
    }
    
    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    // Query campaigns
    const { count, rows: campaigns } = await Campaign.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'brand',
          attributes: ['id', 'name', 'email', 'role']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({
      error: 'Failed to fetch campaigns',
      message: 'Internal server error'
    });
  }
};

/**
 * Get single campaign by ID
 */
const getCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findByPk(id, {
      include: [
        {
          model: User,
          as: 'brand',
          attributes: ['id', 'name', 'email', 'role']
        }
      ]
    });

    if (!campaign) {
      return res.status(404).json({
        error: 'Campaign not found',
        message: 'The requested campaign does not exist'
      });
    }

    // Check permissions - brands can only see their own campaigns
    if (req.user.role === 'brand' && campaign.brandId !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own campaigns'
      });
    }

    res.json({ campaign });

  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({
      error: 'Failed to fetch campaign',
      message: 'Internal server error'
    });
  }
};

/**
 * Create new campaign
 */
const createCampaign = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    // Only brands can create campaigns
    if (req.user.role !== 'brand') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only brands can create campaigns'
      });
    }

    const campaignData = {
      ...req.body,
      brandId: req.user.id
    };

    const campaign = await Campaign.create(campaignData);

    // Fetch the created campaign with brand info
    const createdCampaign = await Campaign.findByPk(campaign.id, {
      include: [
        {
          model: User,
          as: 'brand',
          attributes: ['id', 'name', 'email', 'role']
        }
      ]
    });

    res.status(201).json({
      message: 'Campaign created successfully',
      campaign: createdCampaign
    });

  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      error: 'Failed to create campaign',
      message: 'Internal server error'
    });
  }
};

/**
 * Update campaign
 */
const updateCampaign = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { id } = req.params;

    const campaign = await Campaign.findByPk(id);
    if (!campaign) {
      return res.status(404).json({
        error: 'Campaign not found',
        message: 'The requested campaign does not exist'
      });
    }

    // Only campaign owner can update
    if (campaign.brandId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your own campaigns'
      });
    }

    // Don't allow updating brandId
    const updateData = { ...req.body };
    delete updateData.brandId;

    await campaign.update(updateData);

    // Fetch updated campaign with brand info
    const updatedCampaign = await Campaign.findByPk(id, {
      include: [
        {
          model: User,
          as: 'brand',
          attributes: ['id', 'name', 'email', 'role']
        }
      ]
    });

    res.json({
      message: 'Campaign updated successfully',
      campaign: updatedCampaign
    });

  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({
      error: 'Failed to update campaign',
      message: 'Internal server error'
    });
  }
};

/**
 * Delete campaign
 */
const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findByPk(id);
    if (!campaign) {
      return res.status(404).json({
        error: 'Campaign not found',
        message: 'The requested campaign does not exist'
      });
    }

    // Only campaign owner can delete
    if (campaign.brandId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete your own campaigns'
      });
    }

    await campaign.destroy();

    res.json({
      message: 'Campaign deleted successfully'
    });

  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({
      error: 'Failed to delete campaign',
      message: 'Internal server error'
    });
  }
};

/**
 * Get campaign statistics
 */
const getCampaignStats = async (req, res) => {
  try {
    const whereClause = {};
    
    // Filter by user role
    if (req.user.role === 'brand') {
      whereClause.brandId = req.user.id;
    } else if (req.user.role === 'influencer') {
      whereClause.status = 'active';
    }

    const stats = await Campaign.findAll({
      where: whereClause,
      attributes: [
        'status',
        [dbInstance.fn('COUNT', dbInstance.col('id')), 'count'],
        [dbInstance.fn('SUM', dbInstance.col('budget')), 'totalBudget'],
        [dbInstance.fn('AVG', dbInstance.col('budget')), 'avgBudget']
      ],
      group: ['status'],
      raw: true
    });

    const totalCampaigns = await Campaign.count({ where: whereClause });
    const totalBudget = await Campaign.sum('budget', { where: whereClause });

    res.json({
      stats: {
        totalCampaigns,
        totalBudget: totalBudget || 0,
        statusBreakdown: stats
      }
    });

  } catch (error) {
    console.error('Get campaign stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch campaign statistics',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignStats
};