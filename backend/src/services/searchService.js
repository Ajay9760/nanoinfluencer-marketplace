const { Op } = require('sequelize');
const { Campaign, User, CampaignApplication, SocialMediaAccount } = require('../models');

class SearchService {
  /**
   * Search campaigns with advanced filtering
   */
  async searchCampaigns(filters = {}, pagination = {}) {
    const {
      query,
      goal,
      status,
      minBudget,
      maxBudget,
      currency,
      brandId,
      hasApplications,
      isVerified,
      platforms,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = filters;

    const {
      page = 1,
      limit = 10
    } = pagination;

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = {
      ...(status && { status }),
      ...(goal && { goal }),
      ...(currency && { currency }),
      ...(brandId && { brandId }),
      ...(minBudget && { budget: { [Op.gte]: minBudget } }),
      ...(maxBudget && { 
        budget: minBudget ? 
          { [Op.between]: [minBudget, maxBudget] } :
          { [Op.lte]: maxBudget }
      })
    };

    // Text search across title and description
    if (query) {
      whereConditions[Op.or] = [
        { title: { [Op.like]: `%${query}%` } },
        { description: { [Op.like]: `%${query}%` } }
      ];
    }

    // Build include conditions
    const includeConditions = [
      {
        model: User,
        as: 'brand',
        attributes: ['id', 'name', 'email', 'avatarUrl'],
        ...(isVerified && {
          where: { emailVerified: true }
        })
      }
    ];

    // Include applications if filtering by them
    if (hasApplications !== undefined) {
      includeConditions.push({
        model: CampaignApplication,
        as: 'applications',
        required: hasApplications,
        attributes: ['id', 'status', 'influencerId']
      });
    }

    // Execute search
    const result = await Campaign.findAndCountAll({
      where: whereConditions,
      include: includeConditions,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    // Calculate pagination info
    const totalPages = Math.ceil(result.count / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      campaigns: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: result.count,
        itemsPerPage: parseInt(limit),
        hasNextPage,
        hasPrevPage
      },
      filters: filters
    };
  }

  /**
   * Search influencers with advanced filtering
   */
  async searchInfluencers(filters = {}, pagination = {}) {
    const {
      query,
      minFollowers,
      maxFollowers,
      minEngagement,
      maxEngagement,
      platforms,
      isVerified,
      hasPortfolio,
      location,
      languages,
      niches,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = filters;

    const {
      page = 1,
      limit = 10
    } = pagination;

    const offset = (page - 1) * limit;

    // Build where conditions for users
    const userWhereConditions = {
      role: 'influencer',
      status: 'active',
      ...(isVerified && { emailVerified: true })
    };

    // Text search across name and bio
    if (query) {
      userWhereConditions[Op.or] = [
        { name: { [Op.like]: `%${query}%` } },
        { bio: { [Op.like]: `%${query}%` } }
      ];
    }

    // Build social media account conditions
    const socialMediaConditions = {};
    
    if (platforms && platforms.length > 0) {
      socialMediaConditions.platform = { [Op.in]: platforms };
    }

    if (minFollowers || maxFollowers) {
      const followerConditions = {};
      if (minFollowers) followerConditions[Op.gte] = minFollowers;
      if (maxFollowers) followerConditions[Op.lte] = maxFollowers;
      socialMediaConditions.followersCount = followerConditions;
    }

    if (minEngagement || maxEngagement) {
      const engagementConditions = {};
      if (minEngagement) engagementConditions[Op.gte] = minEngagement;
      if (maxEngagement) engagementConditions[Op.lte] = maxEngagement;
      socialMediaConditions.engagementRate = engagementConditions;
    }

    // Build include conditions
    const includeConditions = [
      {
        model: SocialMediaAccount,
        as: 'socialAccounts',
        where: Object.keys(socialMediaConditions).length > 0 ? socialMediaConditions : undefined,
        required: Object.keys(socialMediaConditions).length > 0,
        attributes: ['platform', 'username', 'followersCount', 'engagementRate', 'isVerified']
      },
      {
        model: CampaignApplication,
        as: 'applications',
        attributes: ['id', 'status', 'campaignId'],
        required: false,
        limit: 5 // Limit recent applications
      }
    ];

    // Execute search
    const result = await User.findAndCountAll({
      where: userWhereConditions,
      include: includeConditions,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    // Calculate pagination info
    const totalPages = Math.ceil(result.count / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Enrich results with calculated metrics
    const enrichedInfluencers = result.rows.map(influencer => {
      const socialAccounts = influencer.socialAccounts || [];
      const totalFollowers = socialAccounts.reduce((sum, acc) => sum + (acc.followersCount || 0), 0);
      const avgEngagement = socialAccounts.length > 0 ? 
        socialAccounts.reduce((sum, acc) => sum + (acc.engagementRate || 0), 0) / socialAccounts.length : 0;

      return {
        ...influencer.toJSON(),
        metrics: {
          totalFollowers,
          averageEngagement: Number(avgEngagement.toFixed(2)),
          platformCount: socialAccounts.length,
          verifiedAccounts: socialAccounts.filter(acc => acc.isVerified).length
        }
      };
    });

    return {
      influencers: enrichedInfluencers,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: result.count,
        itemsPerPage: parseInt(limit),
        hasNextPage,
        hasPrevPage
      },
      filters: filters
    };
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(query, type = 'campaigns') {
    if (!query || query.length < 2) {
      return [];
    }

    if (type === 'campaigns') {
      const campaigns = await Campaign.findAll({
        where: {
          [Op.or]: [
            { title: { [Op.like]: `%${query}%` } },
            { description: { [Op.like]: `%${query}%` } }
          ],
          status: { [Op.in]: ['active', 'draft'] }
        },
        attributes: ['id', 'title', 'goal'],
        limit: 5
      });

      return campaigns.map(campaign => ({
        id: campaign.id,
        text: campaign.title,
        type: 'campaign',
        goal: campaign.goal
      }));
    }

    if (type === 'influencers') {
      const influencers = await User.findAll({
        where: {
          role: 'influencer',
          status: 'active',
          [Op.or]: [
            { name: { [Op.like]: `%${query}%` } },
            { username: { [Op.like]: `%${query}%` } }
          ]
        },
        attributes: ['id', 'name', 'username', 'avatarUrl'],
        limit: 5
      });

      return influencers.map(influencer => ({
        id: influencer.id,
        text: influencer.name,
        type: 'influencer',
        username: influencer.username
      }));
    }

    return [];
  }

  /**
   * Get popular search terms and trending topics
   */
  async getTrendingSearches() {
    // Get most common campaign goals
    const popularGoals = await Campaign.findAll({
      attributes: [
        'goal',
        [Campaign.sequelize.fn('COUNT', Campaign.sequelize.col('goal')), 'count']
      ],
      where: {
        status: { [Op.in]: ['active', 'completed'] }
      },
      group: ['goal'],
      order: [[Campaign.sequelize.literal('count'), 'DESC']],
      limit: 5
    });

    // Get most active platforms
    const popularPlatforms = await SocialMediaAccount.findAll({
      attributes: [
        'platform',
        [SocialMediaAccount.sequelize.fn('COUNT', SocialMediaAccount.sequelize.col('platform')), 'count']
      ],
      where: {
        isActive: true
      },
      group: ['platform'],
      order: [[SocialMediaAccount.sequelize.literal('count'), 'DESC']],
      limit: 5
    });

    return {
      popularGoals: popularGoals.map(g => ({ goal: g.goal, count: g.get('count') })),
      popularPlatforms: popularPlatforms.map(p => ({ platform: p.platform, count: p.get('count') }))
    };
  }

  /**
   * Advanced filtering options for the UI
   */
  getFilterOptions() {
    return {
      campaigns: {
        goals: ['awareness', 'conversions', 'engagement', 'ugc', 'brand_mention'],
        statuses: ['draft', 'active', 'paused', 'completed', 'cancelled'],
        currencies: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'],
        budgetRanges: [
          { label: 'Under $100', min: 0, max: 100 },
          { label: '$100 - $500', min: 100, max: 500 },
          { label: '$500 - $1,000', min: 500, max: 1000 },
          { label: '$1,000 - $5,000', min: 1000, max: 5000 },
          { label: 'Over $5,000', min: 5000, max: null }
        ]
      },
      influencers: {
        platforms: ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'linkedin', 'snapchat', 'pinterest', 'twitch'],
        followerRanges: [
          { label: 'Nano (1K-10K)', min: 1000, max: 10000 },
          { label: 'Micro (10K-100K)', min: 10000, max: 100000 },
          { label: 'Mid-Tier (100K-500K)', min: 100000, max: 500000 },
          { label: 'Macro (500K-1M)', min: 500000, max: 1000000 },
          { label: 'Mega (1M+)', min: 1000000, max: null }
        ],
        engagementRanges: [
          { label: 'Low (0-2%)', min: 0, max: 2 },
          { label: 'Good (2-5%)', min: 2, max: 5 },
          { label: 'High (5-10%)', min: 5, max: 10 },
          { label: 'Excellent (10%+)', min: 10, max: null }
        ]
      }
    };
  }
}

module.exports = new SearchService();