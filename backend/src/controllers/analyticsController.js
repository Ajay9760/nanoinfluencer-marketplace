const Analytics = require('../models/Analytics');
const Campaign = require('../models/Campaign');
const SocialMediaAccount = require('../models/SocialMediaAccount');
const CampaignApplication = require('../models/CampaignApplication');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

/**
 * Get dashboard analytics for the authenticated user
 */
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let stats = {};

    if (userRole === 'brand') {
      // Brand dashboard stats
      const campaigns = await Campaign.findAll({
        where: { brandId: userId }
        // Remove include for now to avoid association issues
      });

      const totalCampaigns = campaigns.length;
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
      const totalApplications = campaigns.reduce((sum, c) => sum + c.totalApplications, 0);
      const approvedInfluencers = campaigns.reduce((sum, c) => sum + c.approvedInfluencers, 0);
      const totalBudget = campaigns.reduce((sum, c) => sum + parseFloat(c.budget || 0), 0);

      // Get recent analytics
      const campaignIds = campaigns.map(c => c.id);
      const recentMetrics = await Analytics.findAll({
        where: {
          entityType: 'campaign',
          entityId: { [Op.in]: campaignIds },
          dateRecorded: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      });

      const impressions = recentMetrics
        .filter(m => m.metricType === 'impressions')
        .reduce((sum, m) => sum + parseFloat(m.value), 0);
      
      const reach = recentMetrics
        .filter(m => m.metricType === 'reach')
        .reduce((sum, m) => sum + parseFloat(m.value), 0);

      stats = {
        totalCampaigns,
        activeCampaigns,
        completedCampaigns,
        totalApplications,
        approvedInfluencers,
        totalBudget: totalBudget.toFixed(2),
        impressions,
        reach,
        averageEngagementRate: recentMetrics
          .filter(m => m.metricType === 'engagement_rate')
          .reduce((sum, m, _, arr) => sum + parseFloat(m.value) / arr.length, 0)
          .toFixed(2),
        campaigns: campaigns.slice(0, 5) // Recent campaigns
      };

    } else if (userRole === 'influencer') {
      // Influencer dashboard stats
      const socialAccounts = await SocialMediaAccount.findAll({
        where: { userId, isActive: true }
      });

      const applications = await CampaignApplication.findAll({
        where: { influencerId: userId }
        // Remove include for now to avoid association issues
      });

      const totalFollowers = socialAccounts.reduce((sum, acc) => sum + acc.followersCount, 0);
      const averageEngagementRate = socialAccounts.length > 0 
        ? socialAccounts.reduce((sum, acc) => sum + parseFloat(acc.engagementRate), 0) / socialAccounts.length 
        : 0;

      const totalApplications = applications.length;
      const approvedApplications = applications.filter(a => a.status === 'approved').length;
      const completedApplications = applications.filter(a => a.status === 'completed').length;
      const pendingApplications = applications.filter(a => a.status === 'pending').length;

      // Calculate potential earnings
      const potentialEarnings = applications
        .filter(a => ['approved', 'completed'].includes(a.status))
        .reduce((sum, a) => sum + parseFloat(a.negotiatedRate || 0), 0);

      // Get recent performance metrics
      const recentMetrics = await Analytics.findAll({
        where: {
          entityType: 'influencer',
          entityId: userId,
          dateRecorded: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      });

      const totalViews = recentMetrics
        .filter(m => m.metricType === 'views')
        .reduce((sum, m) => sum + parseFloat(m.value), 0);

      const totalLikes = recentMetrics
        .filter(m => m.metricType === 'likes')
        .reduce((sum, m) => sum + parseFloat(m.value), 0);

      stats = {
        totalFollowers,
        averageEngagementRate: averageEngagementRate.toFixed(2),
        totalApplications,
        approvedApplications,
        completedApplications,
        pendingApplications,
        potentialEarnings: potentialEarnings.toFixed(2),
        totalViews,
        totalLikes,
        platformCount: socialAccounts.length,
        verifiedAccounts: socialAccounts.filter(acc => acc.isVerified).length,
        socialAccounts: socialAccounts,
        recentApplications: applications.slice(0, 5)
      };
    }

    res.json({ stats });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard statistics',
      message: 'Internal server error'
    });
  }
};

/**
 * Get campaign analytics
 */
const getCampaignAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { startDate, endDate } = req.query;

    // Verify campaign ownership
    const campaign = await Campaign.findOne({
      where: {
        id: campaignId,
        brandId: req.user.id
      }
    });

    if (!campaign) {
      return res.status(404).json({
        error: 'Campaign not found',
        message: 'Campaign not found or access denied'
      });
    }

    const metrics = await Analytics.getCampaignMetrics(campaignId, startDate, endDate);
    
    // Get campaign applications
    const applications = await CampaignApplication.findAll({
      where: { campaignId },
      include: [{
        model: SocialMediaAccount,
        as: 'influencer'
      }]
    });

    const analytics = {
      campaign: {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        budget: campaign.budget,
        currency: campaign.currency,
        totalApplications: campaign.totalApplications,
        approvedInfluencers: campaign.approvedInfluencers
      },
      metrics,
      applications: applications.length,
      approvedApplications: applications.filter(a => a.status === 'approved').length,
      completedApplications: applications.filter(a => a.status === 'completed').length,
      performanceByPlatform: {}
    };

    // Group metrics by platform
    Object.keys(metrics).forEach(key => {
      const metric = metrics[key];
      const platform = metric.platform;
      
      if (!analytics.performanceByPlatform[platform]) {
        analytics.performanceByPlatform[platform] = {};
      }
      
      analytics.performanceByPlatform[platform][metric.metricType] = metric;
    });

    res.json({ analytics });
  } catch (error) {
    console.error('Get campaign analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch campaign analytics',
      message: 'Internal server error'
    });
  }
};

/**
 * Get influencer analytics
 */
const getInfluencerAnalytics = async (req, res) => {
  try {
    const { platform, startDate, endDate } = req.query;
    
    const metrics = await Analytics.getInfluencerMetrics(req.user.id, platform, startDate, endDate);
    
    // Get social media accounts
    const socialAccounts = await SocialMediaAccount.findAll({
      where: { 
        userId: req.user.id,
        ...(platform && { platform })
      }
    });

    // Get applications and performance
    const applications = await CampaignApplication.findAll({
      where: { influencerId: req.user.id },
      include: [{
        model: Campaign,
        as: 'campaign'
      }]
    });

    const analytics = {
      metrics,
      socialAccounts,
      totalApplications: applications.length,
      approvedApplications: applications.filter(a => a.status === 'approved').length,
      completedApplications: applications.filter(a => a.status === 'completed').length,
      totalEarnings: applications
        .filter(a => a.status === 'completed')
        .reduce((sum, a) => sum + parseFloat(a.negotiatedRate || 0), 0),
      performanceByPlatform: {}
    };

    // Group metrics by platform
    Object.keys(metrics).forEach(key => {
      const metric = metrics[key];
      const platformKey = metric.platform;
      
      if (!analytics.performanceByPlatform[platformKey]) {
        analytics.performanceByPlatform[platformKey] = {};
      }
      
      analytics.performanceByPlatform[platformKey][metric.metricType] = metric;
    });

    res.json({ analytics });
  } catch (error) {
    console.error('Get influencer analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch influencer analytics',
      message: 'Internal server error'
    });
  }
};

/**
 * Add analytics data
 */
const addAnalytics = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const {
      entityType,
      entityId,
      platform,
      metricType,
      value,
      currency,
      dateRecorded,
      contentUrl,
      additionalData,
      source = 'manual'
    } = req.body;

    // Verify entity ownership
    if (entityType === 'campaign') {
      const campaign = await Campaign.findOne({
        where: { id: entityId, brandId: req.user.id }
      });
      if (!campaign) {
        return res.status(404).json({
          error: 'Campaign not found',
          message: 'Campaign not found or access denied'
        });
      }
    } else if (entityType === 'influencer') {
      if (entityId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only add analytics for your own account'
        });
      }
    }

    const analytics = await Analytics.create({
      entityType,
      entityId,
      platform,
      metricType,
      value,
      currency,
      dateRecorded: dateRecorded || new Date(),
      contentUrl,
      additionalData: additionalData || {},
      source,
      createdBy: req.user.id
    });

    res.status(201).json({
      message: 'Analytics data added successfully',
      analytics
    });
  } catch (error) {
    console.error('Add analytics error:', error);
    res.status(500).json({
      error: 'Failed to add analytics data',
      message: 'Internal server error'
    });
  }
};

/**
 * Get performance comparison
 */
const getPerformanceComparison = async (req, res) => {
  try {
    const { timeframe = '30d', platforms, metricTypes } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case '7d':
        dateFilter = { [Op.gte]: new Date(now - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        dateFilter = { [Op.gte]: new Date(now - 30 * 24 * 60 * 60 * 1000) };
        break;
      case '90d':
        dateFilter = { [Op.gte]: new Date(now - 90 * 24 * 60 * 60 * 1000) };
        break;
      case '1y':
        dateFilter = { [Op.gte]: new Date(now - 365 * 24 * 60 * 60 * 1000) };
        break;
    }

    const whereConditions = {
      entityType: req.user.role === 'brand' ? 'campaign' : 'influencer',
      dateRecorded: dateFilter
    };

    if (platforms) {
      whereConditions.platform = { [Op.in]: platforms.split(',') };
    }

    if (metricTypes) {
      whereConditions.metricType = { [Op.in]: metricTypes.split(',') };
    }

    // Add entity ownership filter
    if (req.user.role === 'brand') {
      const campaignIds = await Campaign.findAll({
        where: { brandId: req.user.id },
        attributes: ['id']
      }).then(campaigns => campaigns.map(c => c.id));
      
      whereConditions.entityId = { [Op.in]: campaignIds };
    } else {
      whereConditions.entityId = req.user.id;
    }

    const metrics = await Analytics.findAll({
      where: whereConditions,
      order: [['dateRecorded', 'DESC']]
    });

    const comparison = Analytics.aggregateMetrics(metrics);

    res.json({ 
      comparison,
      timeframe,
      totalMetrics: metrics.length
    });
  } catch (error) {
    console.error('Get performance comparison error:', error);
    res.status(500).json({
      error: 'Failed to fetch performance comparison',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getDashboardStats,
  getCampaignAnalytics,
  getInfluencerAnalytics,
  addAnalytics,
  getPerformanceComparison
};