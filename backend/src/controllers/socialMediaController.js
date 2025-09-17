const SocialMediaAccount = require('../models/SocialMediaAccount');
const { validationResult } = require('express-validator');

/**
 * Get all social media accounts for the authenticated user
 */
const getSocialAccounts = async (req, res) => {
  try {
    const accounts = await SocialMediaAccount.findAll({
      where: { userId: req.user.id },
      order: [['platform', 'ASC']]
    });

    res.json({
      accounts,
      totalCount: accounts.length
    });
  } catch (error) {
    console.error('Get social accounts error:', error);
    res.status(500).json({
      error: 'Failed to fetch social media accounts',
      message: 'Internal server error'
    });
  }
};

/**
 * Add a new social media account
 */
const addSocialAccount = async (req, res) => {
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
      platform,
      username,
      displayName,
      profileUrl,
      profileImageUrl,
      followersCount = 0,
      followingCount = 0,
      postsCount = 0,
      engagementRate = 0,
      averageLikes = 0,
      averageComments = 0,
      isVerified = false
    } = req.body;

    // Check if account already exists
    const existingAccount = await SocialMediaAccount.findOne({
      where: {
        userId: req.user.id,
        platform,
        username: username.toLowerCase()
      }
    });

    if (existingAccount) {
      return res.status(409).json({
        error: 'Account already exists',
        message: `You already have a ${platform} account with username ${username}`
      });
    }

    const account = await SocialMediaAccount.create({
      userId: req.user.id,
      platform,
      username: username.toLowerCase(),
      displayName,
      profileUrl,
      profileImageUrl,
      followersCount,
      followingCount,
      postsCount,
      engagementRate,
      averageLikes,
      averageComments,
      isVerified,
      lastSyncAt: new Date()
    });

    res.status(201).json({
      message: 'Social media account added successfully',
      account
    });
  } catch (error) {
    console.error('Add social account error:', error);
    res.status(500).json({
      error: 'Failed to add social media account',
      message: 'Internal server error'
    });
  }
};

/**
 * Update a social media account
 */
const updateSocialAccount = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const {
      displayName,
      profileUrl,
      profileImageUrl,
      followersCount,
      followingCount,
      postsCount,
      engagementRate,
      averageLikes,
      averageComments,
      isVerified,
      metrics
    } = req.body;

    const account = await SocialMediaAccount.findOne({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!account) {
      return res.status(404).json({
        error: 'Account not found',
        message: 'Social media account not found or access denied'
      });
    }

    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (profileUrl !== undefined) updateData.profileUrl = profileUrl;
    if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl;
    if (followersCount !== undefined) updateData.followersCount = followersCount;
    if (followingCount !== undefined) updateData.followingCount = followingCount;
    if (postsCount !== undefined) updateData.postsCount = postsCount;
    if (engagementRate !== undefined) updateData.engagementRate = engagementRate;
    if (averageLikes !== undefined) updateData.averageLikes = averageLikes;
    if (averageComments !== undefined) updateData.averageComments = averageComments;
    if (isVerified !== undefined) updateData.isVerified = isVerified;
    
    if (metrics) {
      updateData.metrics = { ...account.metrics, ...metrics };
    }
    
    updateData.lastSyncAt = new Date();

    await account.update(updateData);

    res.json({
      message: 'Social media account updated successfully',
      account
    });
  } catch (error) {
    console.error('Update social account error:', error);
    res.status(500).json({
      error: 'Failed to update social media account',
      message: 'Internal server error'
    });
  }
};

/**
 * Delete a social media account
 */
const deleteSocialAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await SocialMediaAccount.findOne({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!account) {
      return res.status(404).json({
        error: 'Account not found',
        message: 'Social media account not found or access denied'
      });
    }

    await account.destroy();

    res.json({
      message: 'Social media account deleted successfully'
    });
  } catch (error) {
    console.error('Delete social account error:', error);
    res.status(500).json({
      error: 'Failed to delete social media account',
      message: 'Internal server error'
    });
  }
};

/**
 * Get social media account by ID
 */
const getSocialAccountById = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await SocialMediaAccount.findOne({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!account) {
      return res.status(404).json({
        error: 'Account not found',
        message: 'Social media account not found or access denied'
      });
    }

    res.json({ account });
  } catch (error) {
    console.error('Get social account by ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch social media account',
      message: 'Internal server error'
    });
  }
};

/**
 * Sync social media account metrics (placeholder for API integration)
 */
const syncSocialAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await SocialMediaAccount.findOne({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!account) {
      return res.status(404).json({
        error: 'Account not found',
        message: 'Social media account not found or access denied'
      });
    }

    // TODO: Implement actual API integration for each platform
    // For now, we'll just update the lastSyncAt timestamp
    await account.update({
      lastSyncAt: new Date()
    });

    res.json({
      message: `${account.platform} account synced successfully`,
      account,
      note: 'Automatic sync feature coming soon'
    });
  } catch (error) {
    console.error('Sync social account error:', error);
    res.status(500).json({
      error: 'Failed to sync social media account',
      message: 'Internal server error'
    });
  }
};

/**
 * Get platform statistics for the user
 */
const getPlatformStats = async (req, res) => {
  try {
    const accounts = await SocialMediaAccount.findAll({
      where: { userId: req.user.id, isActive: true }
    });

    const stats = {
      totalAccounts: accounts.length,
      totalFollowers: 0,
      totalFollowing: 0,
      totalPosts: 0,
      averageEngagementRate: 0,
      platforms: {},
      topPerformingPlatform: null,
      verifiedAccounts: 0
    };

    let totalEngagement = 0;
    let accountsWithEngagement = 0;

    accounts.forEach(account => {
      const platform = account.platform;
      
      if (!stats.platforms[platform]) {
        stats.platforms[platform] = {
          accountCount: 0,
          totalFollowers: 0,
          averageEngagementRate: 0,
          isVerified: false
        };
      }

      stats.platforms[platform].accountCount += 1;
      stats.platforms[platform].totalFollowers += account.followersCount;
      stats.totalFollowers += account.followersCount;
      stats.totalFollowing += account.followingCount;
      stats.totalPosts += account.postsCount;

      if (account.engagementRate > 0) {
        totalEngagement += parseFloat(account.engagementRate);
        accountsWithEngagement += 1;
      }

      if (account.isVerified) {
        stats.verifiedAccounts += 1;
        stats.platforms[platform].isVerified = true;
      }
    });

    // Calculate average engagement rate
    if (accountsWithEngagement > 0) {
      stats.averageEngagementRate = (totalEngagement / accountsWithEngagement).toFixed(2);
    }

    // Find top performing platform
    let topPlatform = null;
    let maxFollowers = 0;

    Object.keys(stats.platforms).forEach(platform => {
      const platformData = stats.platforms[platform];
      platformData.averageEngagementRate = accountsWithEngagement > 0 ? 
        (totalEngagement / accountsWithEngagement).toFixed(2) : 0;

      if (platformData.totalFollowers > maxFollowers) {
        maxFollowers = platformData.totalFollowers;
        topPlatform = platform;
      }
    });

    stats.topPerformingPlatform = topPlatform;

    res.json({ stats });
  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch platform statistics',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getSocialAccounts,
  addSocialAccount,
  updateSocialAccount,
  deleteSocialAccount,
  getSocialAccountById,
  syncSocialAccount,
  getPlatformStats
};