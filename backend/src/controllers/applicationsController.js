const CampaignApplication = require('../models/CampaignApplication');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

/**
 * Get all applications for the current user
 */
const getApplications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      campaignId,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Build where clause based on user role
    const whereClause = {};
    
    if (req.user.role === 'brand') {
      // For brands, get applications to their campaigns
      const brandCampaigns = await Campaign.findAll({
        where: { brandId: req.user.id },
        attributes: ['id']
      });
      const campaignIds = brandCampaigns.map(c => c.id);
      whereClause.campaignId = { [Op.in]: campaignIds };
    } else if (req.user.role === 'influencer') {
      // For influencers, get their own applications
      whereClause.influencerId = req.user.id;
    }

    if (status) whereClause.status = status;
    if (campaignId) whereClause.campaignId = campaignId;

    const offset = (page - 1) * limit;

    const { count, rows: applications } = await CampaignApplication.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Campaign,
          as: 'campaign',
          include: [{
            model: User,
            as: 'brand',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: User,
          as: 'influencer',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      error: 'Failed to fetch applications',
      message: 'Internal server error'
    });
  }
};

/**
 * Apply to a campaign (influencers only)
 */
const applyToCampaign = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid application data',
        details: errors.array()
      });
    }

    // Only influencers can apply
    if (req.user.role !== 'influencer') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only influencers can apply to campaigns'
      });
    }

    const { campaignId } = req.params;
    const { message, proposedContent, portfolioUrls, appliedPlatforms } = req.body;

    // Check if campaign exists and is active
    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) {
      return res.status(404).json({
        error: 'Campaign not found',
        message: 'The requested campaign does not exist'
      });
    }

    if (campaign.status !== 'active') {
      return res.status(400).json({
        error: 'Campaign not available',
        message: 'This campaign is not accepting applications'
      });
    }

    // Check if already applied
    const existingApplication = await CampaignApplication.findOne({
      where: {
        campaignId,
        influencerId: req.user.id
      }
    });

    if (existingApplication) {
      return res.status(400).json({
        error: 'Already applied',
        message: 'You have already applied to this campaign'
      });
    }

    // Create application
    const application = await CampaignApplication.create({
      campaignId,
      influencerId: req.user.id,
      message,
      proposedContent,
      portfolioUrls: JSON.stringify(portfolioUrls || []),
      appliedPlatforms: JSON.stringify(appliedPlatforms || []),
      status: 'pending'
    });

    // Fetch the created application with includes
    const fullApplication = await CampaignApplication.findByPk(application.id, {
      include: [
        {
          model: Campaign,
          as: 'campaign',
          include: [{
            model: User,
            as: 'brand',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: User,
          as: 'influencer',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      application: fullApplication
    });

  } catch (error) {
    console.error('Apply to campaign error:', error);
    res.status(500).json({
      error: 'Failed to submit application',
      message: 'Internal server error'
    });
  }
};

/**
 * Update application status (brands only)
 */
const updateApplicationStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid status update data',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { status, brandResponse } = req.body;

    const application = await CampaignApplication.findByPk(id, {
      include: [{
        model: Campaign,
        as: 'campaign'
      }]
    });

    if (!application) {
      return res.status(404).json({
        error: 'Application not found',
        message: 'The requested application does not exist'
      });
    }

    // Only the brand who owns the campaign can update application status
    if (application.campaign.brandId !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update applications for your own campaigns'
      });
    }

    // Update application
    await application.update({
      status,
      brandResponse: brandResponse || application.brandResponse,
      approvedAt: status === 'approved' ? new Date() : application.approvedAt,
      rejectedAt: status === 'rejected' ? new Date() : application.rejectedAt
    });

    // Fetch updated application with includes
    const updatedApplication = await CampaignApplication.findByPk(id, {
      include: [
        {
          model: Campaign,
          as: 'campaign',
          include: [{
            model: User,
            as: 'brand',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: User,
          as: 'influencer',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      message: 'Application status updated successfully',
      application: updatedApplication
    });

  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      error: 'Failed to update application status',
      message: 'Internal server error'
    });
  }
};

/**
 * Submit content for approved application (influencers only)
 */
const submitContent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid content submission data',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { submittedContent } = req.body;

    const application = await CampaignApplication.findByPk(id);
    
    if (!application) {
      return res.status(404).json({
        error: 'Application not found',
        message: 'The requested application does not exist'
      });
    }

    // Only the influencer who owns the application can submit content
    if (application.influencerId !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only submit content for your own applications'
      });
    }

    if (application.status !== 'approved') {
      return res.status(400).json({
        error: 'Application not approved',
        message: 'You can only submit content for approved applications'
      });
    }

    // Update application with submitted content
    await application.update({
      submittedContent: JSON.stringify(submittedContent),
      contentApprovalStatus: 'pending',
      status: 'in_progress'
    });

    res.json({
      message: 'Content submitted successfully',
      application
    });

  } catch (error) {
    console.error('Submit content error:', error);
    res.status(500).json({
      error: 'Failed to submit content',
      message: 'Internal server error'
    });
  }
};

/**
 * Get application statistics
 */
const getApplicationStats = async (req, res) => {
  try {
    let stats = {};

    if (req.user.role === 'brand') {
      // Get stats for brand's campaigns
      const brandCampaigns = await Campaign.findAll({
        where: { brandId: req.user.id },
        attributes: ['id']
      });
      const campaignIds = brandCampaigns.map(c => c.id);

      const totalApplications = await CampaignApplication.count({
        where: { campaignId: { [Op.in]: campaignIds } }
      });

      const pendingApplications = await CampaignApplication.count({
        where: { 
          campaignId: { [Op.in]: campaignIds },
          status: 'pending'
        }
      });

      const approvedApplications = await CampaignApplication.count({
        where: { 
          campaignId: { [Op.in]: campaignIds },
          status: 'approved'
        }
      });

      const completedApplications = await CampaignApplication.count({
        where: { 
          campaignId: { [Op.in]: campaignIds },
          status: 'completed'
        }
      });

      stats = {
        totalApplications,
        pendingApplications,
        approvedApplications,
        completedApplications,
        totalCampaigns: brandCampaigns.length
      };

    } else if (req.user.role === 'influencer') {
      // Get stats for influencer's applications
      const totalApplications = await CampaignApplication.count({
        where: { influencerId: req.user.id }
      });

      const pendingApplications = await CampaignApplication.count({
        where: { 
          influencerId: req.user.id,
          status: 'pending'
        }
      });

      const approvedApplications = await CampaignApplication.count({
        where: { 
          influencerId: req.user.id,
          status: 'approved'
        }
      });

      const completedApplications = await CampaignApplication.count({
        where: { 
          influencerId: req.user.id,
          status: 'completed'
        }
      });

      stats = {
        totalApplications,
        pendingApplications,
        approvedApplications,
        completedApplications
      };
    }

    res.json({ stats });

  } catch (error) {
    console.error('Get application stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch application statistics',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getApplications,
  applyToCampaign,
  updateApplicationStatus,
  submitContent,
  getApplicationStats
};