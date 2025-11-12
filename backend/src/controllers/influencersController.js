const User = require('../models/User');
const SocialMediaAccount = require('../models/SocialMediaAccount');
const CampaignApplication = require('../models/CampaignApplication');
const Analytics = require('../models/Analytics');
const { validationResult } = require('express-validator');
const { Op, fn, col, literal } = require('sequelize');

/**
 * Search and discover influencers
 */
const searchInfluencers = async (req, res) => {
  try {
    const {
      platform,
      minFollowers,
      maxFollowers,
      minEngagementRate,
      maxEngagementRate,
      location,
      verified,
      category,
      search,
      sortBy = 'followersCount',
      sortOrder = 'DESC',
      limit = 20,
      offset = 0
    } = req.query;

    // Build where conditions for users
    const userWhereConditions = {
      role: 'influencer',
      status: 'active'
    };

    if (location) {
      userWhereConditions.location = {
        [Op.iLike]: `%${location}%`
      };
    }

    if (search) {
      userWhereConditions[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { bio: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Build where conditions for social media accounts
    const socialWhereConditions = {
      isActive: true
    };

    if (platform) {
      socialWhereConditions.platform = platform;
    }

    if (minFollowers || maxFollowers) {
      socialWhereConditions.followersCount = {};
      if (minFollowers) socialWhereConditions.followersCount[Op.gte] = parseInt(minFollowers);
      if (maxFollowers) socialWhereConditions.followersCount[Op.lte] = parseInt(maxFollowers);
    }

    if (minEngagementRate || maxEngagementRate) {
      socialWhereConditions.engagementRate = {};
      if (minEngagementRate) socialWhereConditions.engagementRate[Op.gte] = parseFloat(minEngagementRate);
      if (maxEngagementRate) socialWhereConditions.engagementRate[Op.lte] = parseFloat(maxEngagementRate);
    }

    if (verified !== undefined) {
      socialWhereConditions.isVerified = verified === 'true';
    }

    if (category) {
      socialWhereConditions.categories = {
        [Op.contains]: [category]
      };
    }

    // Find influencers with their social media accounts
    const influencers = await User.findAndCountAll({
      where: userWhereConditions,
      include: [{
        model: SocialMediaAccount,
        as: 'socialMediaAccounts',
        where: socialWhereConditions,
        required: true
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[
        { model: SocialMediaAccount, as: 'socialMediaAccounts' },
        sortBy,
        sortOrder
      ]],
      distinct: true
    });

    // Enhance influencer data with additional statistics
    const enhancedInfluencers = await Promise.all(
      influencers.rows.map(async (influencer) => {
        // Get application statistics
        const applicationStats = await CampaignApplication.findAll({
          where: { influencerId: influencer.id },
          attributes: [
            'status',
            [fn('COUNT', col('id')), 'count']
          ],
          group: ['status'],
          raw: true
        });

        // Get recent performance metrics
        const recentMetrics = await Analytics.findAll({
          where: {
            entityType: 'influencer',
            entityId: influencer.id,
            dateRecorded: {
              [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          },
          order: [['dateRecorded', 'DESC']],
          limit: 10
        });

        // Calculate total followers across all platforms
        const totalFollowers = influencer.socialMediaAccounts
          .reduce((sum, account) => sum + account.followersCount, 0);

        // Calculate average engagement rate
        const avgEngagementRate = influencer.socialMediaAccounts.length > 0
          ? influencer.socialMediaAccounts
              .reduce((sum, account) => sum + parseFloat(account.engagementRate), 0) 
              / influencer.socialMediaAccounts.length
          : 0;

        // Process application statistics
        const stats = {
          totalApplications: 0,
          approvedApplications: 0,
          completedApplications: 0,
          successRate: 0
        };

        applicationStats.forEach(stat => {
          stats.totalApplications += parseInt(stat.count);
          if (stat.status === 'approved') stats.approvedApplications = parseInt(stat.count);
          if (stat.status === 'completed') stats.completedApplications = parseInt(stat.count);
        });

        stats.successRate = stats.totalApplications > 0 
          ? ((stats.approvedApplications + stats.completedApplications) / stats.totalApplications * 100).toFixed(1)
          : 0;

        // Get top platforms by followers
        const topPlatforms = influencer.socialMediaAccounts
          .sort((a, b) => b.followersCount - a.followersCount)
          .slice(0, 3)
          .map(account => ({
            platform: account.platform,
            username: account.username,
            followers: account.followersCount,
            engagementRate: account.engagementRate,
            isVerified: account.isVerified
          }));

        return {
          id: influencer.id,
          name: influencer.name,
          bio: influencer.bio,
          location: influencer.location,
          profilePicture: influencer.profilePicture,
          createdAt: influencer.createdAt,
          totalFollowers,
          averageEngagementRate: avgEngagementRate.toFixed(2),
          platformCount: influencer.socialMediaAccounts.length,
          verifiedAccounts: influencer.socialMediaAccounts.filter(acc => acc.isVerified).length,
          topPlatforms,
          applicationStats: stats,
          recentMetrics: recentMetrics.slice(0, 5),
          socialMediaAccounts: influencer.socialMediaAccounts
        };
      })
    );

    res.json({
      influencers: enhancedInfluencers,
      pagination: {
        total: influencers.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < influencers.count
      },
      filters: {
        platform,
        minFollowers,
        maxFollowers,
        minEngagementRate,
        maxEngagementRate,
        location,
        verified,
        category,
        search
      }
    });

  } catch (error) {
    console.error('Search influencers error:', error);
    res.status(500).json({
      error: 'Failed to search influencers',
      message: 'Internal server error'
    });
  }
};

/**
 * Get influencer profile by ID
 */
const getInfluencerById = async (req, res) => {
  try {
    const { id } = req.params;

    const influencer = await User.findOne({
      where: {
        id,
        role: 'influencer',
        status: 'active'
      },
      include: [{
        model: SocialMediaAccount,
        as: 'socialMediaAccounts',
        where: { isActive: true },
        required: false
      }]
    });

    if (!influencer) {
      return res.status(404).json({
        error: 'Influencer not found',
        message: 'Influencer not found or not available'
      });
    }

    // Get detailed statistics
    const applications = await CampaignApplication.findAll({
      where: { influencerId: id },
      include: [{
        model: Campaign,
        as: 'campaign',
        attributes: ['id', 'title', 'brand', 'budget', 'status']
      }],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    // Get performance metrics
    const metrics = await Analytics.findAll({
      where: {
        entityType: 'influencer',
        entityId: id,
        dateRecorded: {
          [Op.gte]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      },
      order: [['dateRecorded', 'DESC']],
      limit: 100
    });

    // Calculate comprehensive statistics
    const totalFollowers = influencer.socialMediaAccounts
      .reduce((sum, account) => sum + account.followersCount, 0);

    const avgEngagementRate = influencer.socialMediaAccounts.length > 0
      ? influencer.socialMediaAccounts
          .reduce((sum, account) => sum + parseFloat(account.engagementRate), 0) 
          / influencer.socialMediaAccounts.length
      : 0;

    const completedCampaigns = applications.filter(app => app.status === 'completed');
    const totalEarnings = completedCampaigns
      .reduce((sum, app) => sum + parseFloat(app.negotiatedRate || 0), 0);

    // Group metrics by platform
    const metricsByPlatform = {};
    metrics.forEach(metric => {
      const platform = metric.platform;
      if (!metricsByPlatform[platform]) {
        metricsByPlatform[platform] = {
          impressions: 0,
          reach: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          engagementRate: []
        };
      }

      switch (metric.metricType) {
        case 'impressions':
          metricsByPlatform[platform].impressions += parseFloat(metric.value);
          break;
        case 'reach':
          metricsByPlatform[platform].reach += parseFloat(metric.value);
          break;
        case 'likes':
          metricsByPlatform[platform].likes += parseFloat(metric.value);
          break;
        case 'comments':
          metricsByPlatform[platform].comments += parseFloat(metric.value);
          break;
        case 'shares':
          metricsByPlatform[platform].shares += parseFloat(metric.value);
          break;
        case 'engagement_rate':
          metricsByPlatform[platform].engagementRate.push(parseFloat(metric.value));
          break;
      }
    });

    // Calculate average engagement rates
    Object.keys(metricsByPlatform).forEach(platform => {
      const rates = metricsByPlatform[platform].engagementRate;
      metricsByPlatform[platform].avgEngagementRate = rates.length > 0
        ? (rates.reduce((sum, rate) => sum + rate, 0) / rates.length).toFixed(2)
        : 0;
      delete metricsByPlatform[platform].engagementRate;
    });

    const profileData = {
      id: influencer.id,
      name: influencer.name,
      email: req.user?.role === 'admin' ? influencer.email : undefined, // Only admin can see email
      bio: influencer.bio,
      location: influencer.location,
      website: influencer.website,
      profilePicture: influencer.profilePicture,
      createdAt: influencer.createdAt,
      lastLoginAt: influencer.lastLoginAt,
      
      // Social media statistics
      totalFollowers,
      averageEngagementRate: avgEngagementRate.toFixed(2),
      platformCount: influencer.socialMediaAccounts.length,
      verifiedAccounts: influencer.socialMediaAccounts.filter(acc => acc.isVerified).length,
      
      // Campaign statistics
      totalApplications: applications.length,
      approvedApplications: applications.filter(app => app.status === 'approved').length,
      completedApplications: completedCampaigns.length,
      pendingApplications: applications.filter(app => app.status === 'pending').length,
      successRate: applications.length > 0 
        ? ((applications.filter(app => ['approved', 'completed'].includes(app.status)).length / applications.length) * 100).toFixed(1)
        : 0,
      
      // Financial statistics
      totalEarnings: totalEarnings.toFixed(2),
      averageEarningsPerCampaign: completedCampaigns.length > 0
        ? (totalEarnings / completedCampaigns.length).toFixed(2)
        : 0,
      
      // Platform performance
      socialMediaAccounts: influencer.socialMediaAccounts,
      metricsByPlatform,
      
      // Recent activity
      recentApplications: applications.slice(0, 10),
      recentMetrics: metrics.slice(0, 20)
    };

    res.json({ influencer: profileData });

  } catch (error) {
    console.error('Get influencer by ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch influencer',
      message: 'Internal server error'
    });
  }
};

/**
 * Get influencer categories and statistics
 */
const getInfluencerCategories = async (req, res) => {
  try {
    // Get all categories from social media accounts
    const categories = await SocialMediaAccount.findAll({
      attributes: [
        'categories',
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        isActive: true,
        categories: { [Op.not]: null }
      },
      group: ['categories'],
      raw: true
    });

    // Process categories to flatten and count
    const categoryMap = {};
    
    categories.forEach(item => {
      if (item.categories && Array.isArray(item.categories)) {
        item.categories.forEach(category => {
          if (!categoryMap[category]) {
            categoryMap[category] = 0;
          }
          categoryMap[category] += parseInt(item.count);
        });
      }
    });

    // Convert to array and sort by count
    const categoryStats = Object.entries(categoryMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ categories: categoryStats });

  } catch (error) {
    console.error('Get influencer categories error:', error);
    res.status(500).json({
      error: 'Failed to fetch influencer categories',
      message: 'Internal server error'
    });
  }
};

/**
 * Get platform statistics
 */
const getPlatformStats = async (req, res) => {
  try {
    const platformStats = await SocialMediaAccount.findAll({
      attributes: [
        'platform',
        [fn('COUNT', col('id')), 'influencerCount'],
        [fn('SUM', col('followersCount')), 'totalFollowers'],
        [fn('AVG', col('followersCount')), 'avgFollowers'],
        [fn('AVG', col('engagementRate')), 'avgEngagementRate'],
        [fn('COUNT', literal('CASE WHEN "isVerified" = true THEN 1 END')), 'verifiedCount']
      ],
      where: { isActive: true },
      group: ['platform'],
      raw: true
    });

    // Format the statistics
    const formattedStats = platformStats.map(stat => ({
      platform: stat.platform,
      influencerCount: parseInt(stat.influencerCount),
      totalFollowers: parseInt(stat.totalFollowers) || 0,
      avgFollowers: Math.round(parseFloat(stat.avgFollowers) || 0),
      avgEngagementRate: parseFloat(stat.avgEngagementRate).toFixed(2),
      verifiedCount: parseInt(stat.verifiedCount) || 0,
      verificationRate: stat.influencerCount > 0 
        ? ((parseInt(stat.verifiedCount) || 0) / parseInt(stat.influencerCount) * 100).toFixed(1)
        : 0
    }));

    res.json({ platforms: formattedStats });

  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch platform statistics',
      message: 'Internal server error'
    });
  }
};

/**
 * Get trending influencers (based on recent performance)
 */
const getTrendingInfluencers = async (req, res) => {
  try {
    const { limit = 20, platform, timeframe = '7d' } = req.query;

    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case '7d':
        dateFilter = { [Op.gte]: new Date(now - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        dateFilter = { [Op.gte]: new Date(now - 30 * 24 * 60 * 60 * 1000) };
        break;
      default:
        dateFilter = { [Op.gte]: new Date(now - 7 * 24 * 60 * 60 * 1000) };
    }

    // Get influencers with recent high-performing metrics
    const trendingMetrics = await Analytics.findAll({
      where: {
        entityType: 'influencer',
        dateRecorded: dateFilter,
        metricType: ['engagement_rate', 'reach', 'impressions']
      },
      attributes: [
        'entityId',
        [fn('AVG', col('value')), 'avgValue'],
        [fn('COUNT', col('id')), 'metricCount']
      ],
      group: ['entityId'],
      having: literal('"metricCount" >= 3'), // At least 3 metrics
      order: [[fn('AVG', col('value')), 'DESC']],
      limit: parseInt(limit) * 2, // Get more to filter
      raw: true
    });

    if (trendingMetrics.length === 0) {
      return res.json({ influencers: [] });
    }

    const influencerIds = trendingMetrics.map(metric => metric.entityId);

    // Get full influencer data
    const whereConditions = {
      id: { [Op.in]: influencerIds },
      role: 'influencer',
      status: 'active'
    };

    const socialWhereConditions = { isActive: true };
    if (platform) {
      socialWhereConditions.platform = platform;
    }

    const influencers = await User.findAll({
      where: whereConditions,
      include: [{
        model: SocialMediaAccount,
        as: 'socialMediaAccounts',
        where: socialWhereConditions,
        required: platform ? true : false
      }],
      limit: parseInt(limit)
    });

    // Enhance with trending score
    const trendingInfluencers = influencers.map(influencer => {
      const trendingData = trendingMetrics.find(m => m.entityId === influencer.id);
      
      const totalFollowers = influencer.socialMediaAccounts
        .reduce((sum, account) => sum + account.followersCount, 0);

      const avgEngagementRate = influencer.socialMediaAccounts.length > 0
        ? influencer.socialMediaAccounts
            .reduce((sum, account) => sum + parseFloat(account.engagementRate), 0) 
            / influencer.socialMediaAccounts.length
        : 0;

      return {
        id: influencer.id,
        name: influencer.name,
        bio: influencer.bio,
        location: influencer.location,
        profilePicture: influencer.profilePicture,
        totalFollowers,
        averageEngagementRate: avgEngagementRate.toFixed(2),
        platformCount: influencer.socialMediaAccounts.length,
        verifiedAccounts: influencer.socialMediaAccounts.filter(acc => acc.isVerified).length,
        trendingScore: parseFloat(trendingData.avgValue).toFixed(2),
        metricCount: parseInt(trendingData.metricCount),
        topPlatforms: influencer.socialMediaAccounts
          .sort((a, b) => b.followersCount - a.followersCount)
          .slice(0, 2)
          .map(account => ({
            platform: account.platform,
            username: account.username,
            followers: account.followersCount,
            isVerified: account.isVerified
          }))
      };
    });

    res.json({ 
      influencers: trendingInfluencers,
      timeframe,
      platform: platform || 'all'
    });

  } catch (error) {
    console.error('Get trending influencers error:', error);
    res.status(500).json({
      error: 'Failed to fetch trending influencers',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  searchInfluencers,
  getInfluencerById,
  getInfluencerCategories,
  getPlatformStats,
  getTrendingInfluencers
};