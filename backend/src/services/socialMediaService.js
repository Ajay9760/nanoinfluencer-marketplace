const axios = require('axios');
const { google } = require('googleapis');
const { logger } = require('../utils/monitoring');

/**
 * Social Media API Integration Service
 * Handles Instagram, TikTok, YouTube, and other social media platform integrations
 */
class SocialMediaService {
  constructor() {
    this.instagramAPI = this.initializeInstagramAPI();
    this.youtubeAPI = this.initializeYouTubeAPI();
    this.tiktokAPI = this.initializeTikTokAPI();
  }

  /**
   * Initialize Instagram Basic Display API
   */
  initializeInstagramAPI() {
    return {
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI || 'https://yourdomain.com/auth/instagram/callback',
      baseURL: 'https://graph.instagram.com'
    };
  }

  /**
   * Initialize YouTube Data API v3
   */
  initializeYouTubeAPI() {
    try {
      return google.youtube({
        version: 'v3',
        auth: process.env.YOUTUBE_API_KEY
      });
    } catch (error) {
      logger.error('Failed to initialize YouTube API', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Initialize TikTok API (using TikTok for Developers)
   */
  initializeTikTokAPI() {
    return {
      clientKey: process.env.TIKTOK_CLIENT_ID,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET,
      baseURL: 'https://open-api.tiktok.com'
    };
  }

  /**
   * Get Instagram authorization URL
   */
  getInstagramAuthURL(state = '') {
    const params = new URLSearchParams({
      client_id: this.instagramAPI.clientId,
      redirect_uri: this.instagramAPI.redirectUri,
      scope: 'user_profile,user_media',
      response_type: 'code',
      state: state
    });

    const authURL = `https://api.instagram.com/oauth/authorize?${params.toString()}`;
    
    logger.info('Generated Instagram auth URL', { state });
    return authURL;
  }

  /**
   * Exchange Instagram authorization code for access token
   */
  async exchangeInstagramCode(authCode) {
    try {
      const response = await axios.post('https://api.instagram.com/oauth/access_token', {
        client_id: this.instagramAPI.clientId,
        client_secret: this.instagramAPI.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.instagramAPI.redirectUri,
        code: authCode
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token, user_id } = response.data;

      // Exchange short-lived token for long-lived token
      const longLivedTokenResponse = await axios.get(`${this.instagramAPI.baseURL}/access_token`, {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: this.instagramAPI.clientSecret,
          access_token: access_token
        }
      });

      logger.info('Instagram access token exchanged successfully', { user_id });

      return {
        accessToken: longLivedTokenResponse.data.access_token,
        expiresIn: longLivedTokenResponse.data.expires_in,
        userId: user_id
      };
    } catch (error) {
      logger.error('Failed to exchange Instagram authorization code', {
        error: error.message,
        response: error.response?.data
      });
      throw new Error(`Instagram token exchange failed: ${error.message}`);
    }
  }

  /**
   * Get Instagram user profile
   */
  async getInstagramProfile(accessToken) {
    try {
      const response = await axios.get(`${this.instagramAPI.baseURL}/me`, {
        params: {
          fields: 'id,username,account_type,media_count,followers_count',
          access_token: accessToken
        }
      });

      const profile = response.data;

      logger.info('Instagram profile retrieved', {
        username: profile.username,
        accountType: profile.account_type,
        mediaCount: profile.media_count
      });

      return {
        id: profile.id,
        username: profile.username,
        accountType: profile.account_type,
        mediaCount: profile.media_count,
        followersCount: profile.followers_count || 0,
        platform: 'instagram'
      };
    } catch (error) {
      logger.error('Failed to get Instagram profile', {
        error: error.message,
        response: error.response?.data
      });
      throw new Error(`Failed to retrieve Instagram profile: ${error.message}`);
    }
  }

  /**
   * Get Instagram user media
   */
  async getInstagramMedia(accessToken, limit = 25) {
    try {
      const response = await axios.get(`${this.instagramAPI.baseURL}/me/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
          limit: limit,
          access_token: accessToken
        }
      });

      const media = response.data.data || [];

      logger.info('Instagram media retrieved', {
        mediaCount: media.length
      });

      return media.map(item => ({
        id: item.id,
        caption: item.caption,
        mediaType: item.media_type,
        mediaUrl: item.media_url,
        thumbnailUrl: item.thumbnail_url,
        permalink: item.permalink,
        timestamp: new Date(item.timestamp),
        likeCount: item.like_count || 0,
        commentsCount: item.comments_count || 0,
        platform: 'instagram'
      }));
    } catch (error) {
      logger.error('Failed to get Instagram media', {
        error: error.message,
        response: error.response?.data
      });
      throw new Error(`Failed to retrieve Instagram media: ${error.message}`);
    }
  }

  /**
   * Get Instagram insights/analytics
   */
  async getInstagramInsights(accessToken, mediaId) {
    try {
      const response = await axios.get(`${this.instagramAPI.baseURL}/${mediaId}/insights`, {
        params: {
          metric: 'engagement,impressions,reach',
          access_token: accessToken
        }
      });

      const insights = response.data.data || [];

      logger.info('Instagram insights retrieved', {
        mediaId,
        insightCount: insights.length
      });

      const insightData = {};
      insights.forEach(insight => {
        insightData[insight.name] = insight.values[0]?.value || 0;
      });

      return insightData;
    } catch (error) {
      logger.error('Failed to get Instagram insights', {
        error: error.message,
        mediaId,
        response: error.response?.data
      });
      return {}; // Return empty object on failure
    }
  }

  /**
   * Get YouTube channel information
   */
  async getYouTubeChannelInfo(channelId) {
    try {
      if (!this.youtubeAPI) {
        throw new Error('YouTube API not initialized');
      }

      const response = await this.youtubeAPI.channels.list({
        part: ['snippet', 'statistics', 'brandingSettings'],
        id: [channelId]
      });

      const channel = response.data.items[0];
      if (!channel) {
        throw new Error('Channel not found');
      }

      logger.info('YouTube channel info retrieved', {
        channelId,
        title: channel.snippet.title,
        subscriberCount: channel.statistics.subscriberCount
      });

      return {
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        customUrl: channel.snippet.customUrl,
        subscriberCount: parseInt(channel.statistics.subscriberCount) || 0,
        videoCount: parseInt(channel.statistics.videoCount) || 0,
        viewCount: parseInt(channel.statistics.viewCount) || 0,
        thumbnailUrl: channel.snippet.thumbnails?.high?.url,
        country: channel.snippet.country,
        platform: 'youtube'
      };
    } catch (error) {
      logger.error('Failed to get YouTube channel info', {
        error: error.message,
        channelId
      });
      throw new Error(`Failed to retrieve YouTube channel info: ${error.message}`);
    }
  }

  /**
   * Get YouTube channel videos
   */
  async getYouTubeChannelVideos(channelId, maxResults = 25) {
    try {
      if (!this.youtubeAPI) {
        throw new Error('YouTube API not initialized');
      }

      // Get channel's uploads playlist ID
      const channelResponse = await this.youtubeAPI.channels.list({
        part: ['contentDetails'],
        id: [channelId]
      });

      const uploadsPlaylistId = channelResponse.data.items[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        throw new Error('Uploads playlist not found');
      }

      // Get videos from uploads playlist
      const videosResponse = await this.youtubeAPI.playlistItems.list({
        part: ['snippet'],
        playlistId: uploadsPlaylistId,
        maxResults: maxResults
      });

      const videoIds = videosResponse.data.items.map(item => item.snippet.resourceId.videoId);

      // Get video statistics
      const statsResponse = await this.youtubeAPI.videos.list({
        part: ['statistics', 'snippet'],
        id: videoIds
      });

      const videos = statsResponse.data.items.map(video => ({
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnailUrl: video.snippet.thumbnails?.high?.url,
        publishedAt: new Date(video.snippet.publishedAt),
        viewCount: parseInt(video.statistics.viewCount) || 0,
        likeCount: parseInt(video.statistics.likeCount) || 0,
        commentCount: parseInt(video.statistics.commentCount) || 0,
        platform: 'youtube'
      }));

      logger.info('YouTube channel videos retrieved', {
        channelId,
        videoCount: videos.length
      });

      return videos;
    } catch (error) {
      logger.error('Failed to get YouTube channel videos', {
        error: error.message,
        channelId
      });
      throw new Error(`Failed to retrieve YouTube videos: ${error.message}`);
    }
  }

  /**
   * Get TikTok authorization URL
   */
  getTikTokAuthURL(state = '') {
    const params = new URLSearchParams({
      client_key: this.tiktokAPI.clientKey,
      scope: 'user.info.basic,video.list',
      response_type: 'code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI || 'https://yourdomain.com/auth/tiktok/callback',
      state: state
    });

    const authURL = `https://www.tiktok.com/auth/authorize/?${params.toString()}`;
    
    logger.info('Generated TikTok auth URL', { state });
    return authURL;
  }

  /**
   * Exchange TikTok authorization code for access token
   */
  async exchangeTikTokCode(authCode) {
    try {
      const response = await axios.post(`${this.tiktokAPI.baseURL}/oauth/access_token/`, {
        client_key: this.tiktokAPI.clientKey,
        client_secret: this.tiktokAPI.clientSecret,
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TIKTOK_REDIRECT_URI
      });

      const { access_token, expires_in, open_id } = response.data.data;

      logger.info('TikTok access token exchanged successfully', { open_id });

      return {
        accessToken: access_token,
        expiresIn: expires_in,
        openId: open_id
      };
    } catch (error) {
      logger.error('Failed to exchange TikTok authorization code', {
        error: error.message,
        response: error.response?.data
      });
      throw new Error(`TikTok token exchange failed: ${error.message}`);
    }
  }

  /**
   * Get TikTok user info
   */
  async getTikTokUserInfo(accessToken, openId) {
    try {
      const response = await axios.post(`${this.tiktokAPI.baseURL}/user/info/`, {
        access_token: accessToken,
        open_id: openId,
        fields: ['open_id', 'union_id', 'avatar_url', 'display_name', 'bio_description', 'profile_deep_link', 'is_verified', 'follower_count', 'following_count', 'likes_count', 'video_count']
      });

      const userInfo = response.data.data.user;

      logger.info('TikTok user info retrieved', {
        displayName: userInfo.display_name,
        isVerified: userInfo.is_verified,
        followerCount: userInfo.follower_count
      });

      return {
        openId: userInfo.open_id,
        unionId: userInfo.union_id,
        displayName: userInfo.display_name,
        avatarUrl: userInfo.avatar_url,
        bioDescription: userInfo.bio_description,
        profileDeepLink: userInfo.profile_deep_link,
        isVerified: userInfo.is_verified,
        followerCount: userInfo.follower_count || 0,
        followingCount: userInfo.following_count || 0,
        likesCount: userInfo.likes_count || 0,
        videoCount: userInfo.video_count || 0,
        platform: 'tiktok'
      };
    } catch (error) {
      logger.error('Failed to get TikTok user info', {
        error: error.message,
        response: error.response?.data
      });
      throw new Error(`Failed to retrieve TikTok user info: ${error.message}`);
    }
  }

  /**
   * Get TikTok user videos
   */
  async getTikTokUserVideos(accessToken, openId, cursor = 0, maxCount = 20) {
    try {
      const response = await axios.post(`${this.tiktokAPI.baseURL}/video/list/`, {
        access_token: accessToken,
        open_id: openId,
        cursor: cursor,
        max_count: maxCount,
        fields: ['id', 'create_time', 'cover_image_url', 'share_url', 'video_description', 'duration', 'height', 'width', 'title', 'embed_html', 'embed_link', 'like_count', 'comment_count', 'share_count', 'view_count']
      });

      const videos = response.data.data.videos || [];

      logger.info('TikTok user videos retrieved', {
        videoCount: videos.length,
        hasMore: response.data.data.has_more
      });

      return {
        videos: videos.map(video => ({
          id: video.id,
          title: video.title,
          description: video.video_description,
          coverImageUrl: video.cover_image_url,
          shareUrl: video.share_url,
          embedHtml: video.embed_html,
          duration: video.duration,
          height: video.height,
          width: video.width,
          createTime: new Date(video.create_time * 1000),
          likeCount: video.like_count || 0,
          commentCount: video.comment_count || 0,
          shareCount: video.share_count || 0,
          viewCount: video.view_count || 0,
          platform: 'tiktok'
        })),
        hasMore: response.data.data.has_more,
        cursor: response.data.data.cursor
      };
    } catch (error) {
      logger.error('Failed to get TikTok user videos', {
        error: error.message,
        response: error.response?.data
      });
      throw new Error(`Failed to retrieve TikTok videos: ${error.message}`);
    }
  }

  /**
   * Calculate engagement rate for a social media profile
   */
  calculateEngagementRate(profile, recentPosts) {
    try {
      if (!recentPosts || recentPosts.length === 0) {
        return 0;
      }

      let totalEngagement = 0;
      let followerCount = 0;

      switch (profile.platform) {
        case 'instagram':
          followerCount = profile.followersCount;
          totalEngagement = recentPosts.reduce((sum, post) => {
            return sum + (post.likeCount || 0) + (post.commentsCount || 0);
          }, 0);
          break;

        case 'youtube':
          followerCount = profile.subscriberCount;
          totalEngagement = recentPosts.reduce((sum, video) => {
            return sum + (video.likeCount || 0) + (video.commentCount || 0);
          }, 0);
          break;

        case 'tiktok':
          followerCount = profile.followerCount;
          totalEngagement = recentPosts.reduce((sum, video) => {
            return sum + (video.likeCount || 0) + (video.commentCount || 0) + (video.shareCount || 0);
          }, 0);
          break;

        default:
          return 0;
      }

      if (followerCount === 0) {
        return 0;
      }

      const averageEngagement = totalEngagement / recentPosts.length;
      const engagementRate = (averageEngagement / followerCount) * 100;

      logger.debug('Engagement rate calculated', {
        platform: profile.platform,
        engagementRate,
        followerCount,
        totalEngagement,
        postCount: recentPosts.length
      });

      return Math.round(engagementRate * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      logger.error('Failed to calculate engagement rate', {
        error: error.message,
        platform: profile.platform
      });
      return 0;
    }
  }

  /**
   * Verify influencer authenticity (basic checks)
   */
  async verifyInfluencerAuthenticity(profile, recentPosts) {
    try {
      const checks = {
        hasValidProfile: false,
        hasRecentActivity: false,
        hasGoodEngagementRate: false,
        hasConsistentContent: false,
        overallScore: 0,
        flags: []
      };

      // Check 1: Valid profile information
      if (profile.username && profile.followersCount > 0) {
        checks.hasValidProfile = true;
      } else {
        checks.flags.push('Invalid or incomplete profile information');
      }

      // Check 2: Recent activity (posts in last 30 days)
      if (recentPosts && recentPosts.length > 0) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentActivity = recentPosts.some(post => {
          const postDate = new Date(post.timestamp || post.publishedAt || post.createTime);
          return postDate > thirtyDaysAgo;
        });

        if (recentActivity) {
          checks.hasRecentActivity = true;
        } else {
          checks.flags.push('No recent activity (last 30 days)');
        }
      } else {
        checks.flags.push('No posts available for verification');
      }

      // Check 3: Engagement rate
      const engagementRate = this.calculateEngagementRate(profile, recentPosts);
      if (engagementRate >= 1 && engagementRate <= 10) { // Normal range
        checks.hasGoodEngagementRate = true;
      } else if (engagementRate > 10) {
        checks.flags.push('Unusually high engagement rate (possible fake engagement)');
      } else {
        checks.flags.push('Very low engagement rate');
      }

      // Check 4: Content consistency
      if (recentPosts && recentPosts.length >= 3) {
        checks.hasConsistentContent = true;
      } else {
        checks.flags.push('Insufficient content for consistency check');
      }

      // Calculate overall score
      const totalChecks = 4;
      const passedChecks = [
        checks.hasValidProfile,
        checks.hasRecentActivity,
        checks.hasGoodEngagementRate,
        checks.hasConsistentContent
      ].filter(Boolean).length;

      checks.overallScore = Math.round((passedChecks / totalChecks) * 100);

      logger.info('Influencer authenticity verified', {
        platform: profile.platform,
        username: profile.username,
        overallScore: checks.overallScore,
        engagementRate,
        flagCount: checks.flags.length
      });

      return {
        ...checks,
        engagementRate,
        verificationDate: new Date()
      };
    } catch (error) {
      logger.error('Failed to verify influencer authenticity', {
        error: error.message,
        platform: profile.platform
      });
      
      return {
        hasValidProfile: false,
        hasRecentActivity: false,
        hasGoodEngagementRate: false,
        hasConsistentContent: false,
        overallScore: 0,
        flags: ['Verification process failed'],
        engagementRate: 0,
        verificationDate: new Date()
      };
    }
  }

  /**
   * Refresh access token for long-term storage
   */
  async refreshAccessToken(platform, refreshToken) {
    try {
      switch (platform) {
        case 'instagram':
          // Instagram tokens can be refreshed before expiry
          const response = await axios.get(`${this.instagramAPI.baseURL}/refresh_access_token`, {
            params: {
              grant_type: 'ig_refresh_token',
              access_token: refreshToken
            }
          });
          
          return {
            accessToken: response.data.access_token,
            expiresIn: response.data.expires_in
          };

        case 'tiktok':
          // TikTok refresh token implementation
          const tiktokResponse = await axios.post(`${this.tiktokAPI.baseURL}/oauth/refresh_token/`, {
            client_key: this.tiktokAPI.clientKey,
            grant_type: 'refresh_token',
            refresh_token: refreshToken
          });
          
          return {
            accessToken: tiktokResponse.data.data.access_token,
            refreshToken: tiktokResponse.data.data.refresh_token,
            expiresIn: tiktokResponse.data.data.expires_in
          };

        default:
          throw new Error(`Token refresh not supported for platform: ${platform}`);
      }
    } catch (error) {
      logger.error('Failed to refresh access token', {
        error: error.message,
        platform
      });
      throw new Error(`Token refresh failed for ${platform}: ${error.message}`);
    }
  }
}

// Create singleton instance
const socialMediaService = new SocialMediaService();

module.exports = { SocialMediaService, socialMediaService };