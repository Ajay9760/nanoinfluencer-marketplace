const searchService = require('../services/searchService');
const { logger } = require('../utils/monitoring');

/**
 * Search campaigns with advanced filtering
 */
const searchCampaigns = async (req, res) => {
  try {
    const {
      q: query,
      goal,
      status,
      min_budget: minBudget,
      max_budget: maxBudget,
      currency,
      brand_id: brandId,
      has_applications: hasApplications,
      is_verified: isVerified,
      platforms,
      sort_by: sortBy,
      sort_order: sortOrder,
      page,
      limit
    } = req.query;

    // Parse platforms array if provided
    const platformsArray = platforms ? 
      (Array.isArray(platforms) ? platforms : platforms.split(',')) : 
      undefined;

    const filters = {
      query,
      goal,
      status,
      minBudget: minBudget ? parseFloat(minBudget) : undefined,
      maxBudget: maxBudget ? parseFloat(maxBudget) : undefined,
      currency,
      brandId,
      hasApplications: hasApplications === 'true' ? true : hasApplications === 'false' ? false : undefined,
      isVerified: isVerified === 'true',
      platforms: platformsArray,
      sortBy,
      sortOrder
    };

    const pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10
    };

    const results = await searchService.searchCampaigns(filters, pagination);

    logger.info('Campaign search executed', {
      userId: req.user?.id,
      filters: JSON.stringify(filters),
      resultCount: results.campaigns.length,
      totalItems: results.pagination.totalItems
    });

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('Campaign search failed', {
      error: error.message,
      userId: req.user?.id,
      query: req.query
    });

    res.status(500).json({
      success: false,
      message: 'Failed to search campaigns',
      error: error.message
    });
  }
};

/**
 * Search influencers with advanced filtering
 */
const searchInfluencers = async (req, res) => {
  try {
    const {
      q: query,
      min_followers: minFollowers,
      max_followers: maxFollowers,
      min_engagement: minEngagement,
      max_engagement: maxEngagement,
      platforms,
      is_verified: isVerified,
      has_portfolio: hasPortfolio,
      location,
      languages,
      niches,
      sort_by: sortBy,
      sort_order: sortOrder,
      page,
      limit
    } = req.query;

    // Parse arrays if provided
    const platformsArray = platforms ? 
      (Array.isArray(platforms) ? platforms : platforms.split(',')) : 
      undefined;
    const languagesArray = languages ? 
      (Array.isArray(languages) ? languages : languages.split(',')) : 
      undefined;
    const nichesArray = niches ? 
      (Array.isArray(niches) ? niches : niches.split(',')) : 
      undefined;

    const filters = {
      query,
      minFollowers: minFollowers ? parseInt(minFollowers) : undefined,
      maxFollowers: maxFollowers ? parseInt(maxFollowers) : undefined,
      minEngagement: minEngagement ? parseFloat(minEngagement) : undefined,
      maxEngagement: maxEngagement ? parseFloat(maxEngagement) : undefined,
      platforms: platformsArray,
      isVerified: isVerified === 'true',
      hasPortfolio: hasPortfolio === 'true',
      location,
      languages: languagesArray,
      niches: nichesArray,
      sortBy,
      sortOrder
    };

    const pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10
    };

    const results = await searchService.searchInfluencers(filters, pagination);

    logger.info('Influencer search executed', {
      userId: req.user?.id,
      filters: JSON.stringify(filters),
      resultCount: results.influencers.length,
      totalItems: results.pagination.totalItems
    });

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('Influencer search failed', {
      error: error.message,
      userId: req.user?.id,
      query: req.query
    });

    res.status(500).json({
      success: false,
      message: 'Failed to search influencers',
      error: error.message
    });
  }
};

/**
 * Get search suggestions for autocomplete
 */
const getSearchSuggestions = async (req, res) => {
  try {
    const { q: query, type = 'campaigns' } = req.query;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const suggestions = await searchService.getSearchSuggestions(query, type);

    res.json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    logger.error('Search suggestions failed', {
      error: error.message,
      query: req.query.q,
      type: req.query.type
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get search suggestions',
      error: error.message
    });
  }
};

/**
 * Get trending searches and popular categories
 */
const getTrendingSearches = async (req, res) => {
  try {
    const trending = await searchService.getTrendingSearches();

    res.json({
      success: true,
      data: trending
    });

  } catch (error) {
    logger.error('Failed to get trending searches', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get trending searches',
      error: error.message
    });
  }
};

/**
 * Get available filter options for the UI
 */
const getFilterOptions = async (req, res) => {
  try {
    const options = searchService.getFilterOptions();

    res.json({
      success: true,
      data: options
    });

  } catch (error) {
    logger.error('Failed to get filter options', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get filter options',
      error: error.message
    });
  }
};

/**
 * Advanced search across all content types
 */
const globalSearch = async (req, res) => {
  try {
    const { q: query, page = 1, limit = 5 } = req.query;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: {
          campaigns: [],
          influencers: [],
          query: query || ''
        }
      });
    }

    const pagination = { page: parseInt(page), limit: parseInt(limit) };

    // Search both campaigns and influencers
    const [campaignResults, influencerResults] = await Promise.all([
      searchService.searchCampaigns({ query }, pagination),
      searchService.searchInfluencers({ query }, pagination)
    ]);

    logger.info('Global search executed', {
      userId: req.user?.id,
      query,
      campaignCount: campaignResults.campaigns.length,
      influencerCount: influencerResults.influencers.length
    });

    res.json({
      success: true,
      data: {
        campaigns: campaignResults.campaigns,
        influencers: influencerResults.influencers,
        pagination: {
          campaigns: campaignResults.pagination,
          influencers: influencerResults.pagination
        },
        query
      }
    });

  } catch (error) {
    logger.error('Global search failed', {
      error: error.message,
      userId: req.user?.id,
      query: req.query.q
    });

    res.status(500).json({
      success: false,
      message: 'Global search failed',
      error: error.message
    });
  }
};

module.exports = {
  searchCampaigns,
  searchInfluencers,
  getSearchSuggestions,
  getTrendingSearches,
  getFilterOptions,
  globalSearch
};