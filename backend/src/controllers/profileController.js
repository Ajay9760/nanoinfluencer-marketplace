const User = require('../models/User');
const Campaign = require('../models/Campaign');
const CampaignApplication = require('../models/CampaignApplication');
const SocialMediaAccount = require('../models/SocialMediaAccount');
const Analytics = require('../models/Analytics');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

/**
 * Get comprehensive user profile with statistics
 */
const getProfile = async (req, res) => {
  try {
    const user = req.user;
    const userId = user.id;

    // Get basic profile info
    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      profilePicture: user.profilePicture,
      bio: user.bio,
      location: user.location,
      website: user.website,
      phone: user.phone,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      preferences: user.preferences || {},
      statistics: {}
    };

    if (user.role === 'brand') {
      // Brand profile statistics
      const campaigns = await Campaign.findAll({
        where: { brandId: userId }
      });

      const totalApplications = await CampaignApplication.count({
        include: [{
          model: Campaign,
          as: 'campaign',
          where: { brandId: userId }
        }]
      });

      profile.statistics = {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        completedCampaigns: campaigns.filter(c => c.status === 'completed').length,
        draftCampaigns: campaigns.filter(c => c.status === 'draft').length,
        totalBudget: campaigns.reduce((sum, c) => sum + parseFloat(c.budget || 0), 0),
        totalApplications,
        averageCampaignBudget: campaigns.length > 0 
          ? campaigns.reduce((sum, c) => sum + parseFloat(c.budget || 0), 0) / campaigns.length 
          : 0,
        recentCampaigns: campaigns
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
      };

    } else if (user.role === 'influencer') {
      // Influencer profile statistics
      const socialAccounts = await SocialMediaAccount.findAll({
        where: { userId, isActive: true }
      });

      const applications = await CampaignApplication.findAll({
        where: { influencerId: userId },
        include: [{
          model: Campaign,
          as: 'campaign',
          attributes: ['title', 'brand', 'budget', 'status']
        }]
      });

      // Get recent analytics
      const recentMetrics = await Analytics.findAll({
        where: {
          entityType: 'influencer',
          entityId: userId,
          dateRecorded: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        order: [['dateRecorded', 'DESC']],
        limit: 100
      });

      const totalFollowers = socialAccounts.reduce((sum, acc) => sum + acc.followersCount, 0);
      const averageEngagementRate = socialAccounts.length > 0 
        ? socialAccounts.reduce((sum, acc) => sum + parseFloat(acc.engagementRate), 0) / socialAccounts.length 
        : 0;

      const totalEarnings = applications
        .filter(a => a.status === 'completed')
        .reduce((sum, a) => sum + parseFloat(a.negotiatedRate || 0), 0);

      profile.statistics = {
        totalFollowers,
        averageEngagementRate: averageEngagementRate.toFixed(2),
        platformCount: socialAccounts.length,
        verifiedAccounts: socialAccounts.filter(acc => acc.isVerified).length,
        totalApplications: applications.length,
        approvedApplications: applications.filter(a => a.status === 'approved').length,
        completedApplications: applications.filter(a => a.status === 'completed').length,
        pendingApplications: applications.filter(a => a.status === 'pending').length,
        totalEarnings: totalEarnings.toFixed(2),
        averageEarningsPerCampaign: applications.filter(a => a.status === 'completed').length > 0
          ? (totalEarnings / applications.filter(a => a.status === 'completed').length).toFixed(2)
          : 0,
        topPlatforms: socialAccounts
          .sort((a, b) => b.followersCount - a.followersCount)
          .slice(0, 3)
          .map(acc => ({
            platform: acc.platform,
            followers: acc.followersCount,
            engagementRate: acc.engagementRate
          })),
        recentMetrics: recentMetrics.slice(0, 10),
        socialAccounts,
        recentApplications: applications.slice(0, 5)
      };
    }

    res.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      message: 'Internal server error'
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
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
      name,
      bio,
      location,
      website,
      phone,
      profilePicture,
      preferences
    } = req.body;

    const user = req.user;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;
    if (phone !== undefined) updateData.phone = phone;
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
    if (preferences !== undefined) updateData.preferences = preferences;

    await user.update(updateData);

    res.json({
      message: 'Profile updated successfully',
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        location: user.location,
        website: user.website,
        phone: user.phone,
        profilePicture: user.profilePicture,
        preferences: user.preferences
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'Internal server error'
    });
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    // Verify current password
    const isValidPassword = await user.validatePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Password change failed',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await user.update({ passwordHash: hashedPassword });

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      message: 'Internal server error'
    });
  }
};

/**
 * Update user preferences
 */
const updatePreferences = async (req, res) => {
  try {
    const { preferences } = req.body;
    const user = req.user;

    await user.update({ 
      preferences: { 
        ...user.preferences, 
        ...preferences 
      }
    });

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      error: 'Failed to update preferences',
      message: 'Internal server error'
    });
  }
};

/**
 * Get profile activity timeline
 */
const getActivityTimeline = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const activities = [];

    if (req.user.role === 'brand') {
      // Get campaign activities
      const campaigns = await Campaign.findAll({
        where: { brandId: userId },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      campaigns.forEach(campaign => {
        activities.push({
          type: 'campaign_created',
          title: `Created campaign "${campaign.title}"`,
          description: campaign.description?.substring(0, 100) + '...',
          date: campaign.createdAt,
          metadata: {
            campaignId: campaign.id,
            budget: campaign.budget,
            status: campaign.status
          }
        });
      });

      // Get application activities
      const applications = await CampaignApplication.findAll({
        include: [{
          model: Campaign,
          as: 'campaign',
          where: { brandId: userId },
          attributes: ['title', 'id']
        }],
        order: [['updatedAt', 'DESC']],
        limit: parseInt(limit)
      });

      applications.forEach(app => {
        activities.push({
          type: 'application_received',
          title: `New application for "${app.campaign.title}"`,
          description: `Application status: ${app.status}`,
          date: app.updatedAt,
          metadata: {
            applicationId: app.id,
            campaignId: app.campaignId,
            status: app.status
          }
        });
      });

    } else if (req.user.role === 'influencer') {
      // Get application activities
      const applications = await CampaignApplication.findAll({
        where: { influencerId: userId },
        include: [{
          model: Campaign,
          as: 'campaign',
          attributes: ['title', 'id', 'brand']
        }],
        order: [['updatedAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      applications.forEach(app => {
        activities.push({
          type: 'application_submitted',
          title: `Applied to "${app.campaign.title}"`,
          description: `Status: ${app.status}`,
          date: app.createdAt,
          metadata: {
            applicationId: app.id,
            campaignId: app.campaignId,
            status: app.status
          }
        });
      });

      // Get social media account activities
      const socialAccounts = await SocialMediaAccount.findAll({
        where: { userId },
        order: [['updatedAt', 'DESC']],
        limit: 10
      });

      socialAccounts.forEach(account => {
        activities.push({
          type: 'social_account_connected',
          title: `Connected ${account.platform} account`,
          description: `@${account.username} - ${account.followersCount} followers`,
          date: account.createdAt,
          metadata: {
            platform: account.platform,
            username: account.username,
            followers: account.followersCount
          }
        });
      });
    }

    // Sort all activities by date
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      activities: activities.slice(0, parseInt(limit)),
      total: activities.length,
      hasMore: activities.length > parseInt(limit)
    });

  } catch (error) {
    console.error('Get activity timeline error:', error);
    res.status(500).json({
      error: 'Failed to fetch activity timeline',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  updatePreferences,
  getActivityTimeline
};