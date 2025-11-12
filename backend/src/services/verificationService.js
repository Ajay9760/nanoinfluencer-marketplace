const axios = require('axios');
const { logger } = require('../utils/monitoring');

class VerificationService {
  constructor() {
    this.suspiciousPatterns = {
      username: [
        /\d{4,}$/, // Ending with many numbers
        /_[a-z]+\d{3,}$/, // underscore + letters + numbers
        /^[a-z]+\d+_[a-z]+$/ // suspicious pattern
      ],
      followerGrowth: {
        maxDailyGrowth: 0.1, // 10% daily growth is suspicious
        maxWeeklyGrowth: 0.5  // 50% weekly growth is suspicious
      }
    };
  }

  /**
   * Verify an influencer's profile authenticity
   */
  async verifyInfluencer(socialAccount) {
    try {
      const verificationResult = {
        verified: false,
        score: 0,
        warnings: [],
        checks: {
          profile: false,
          engagement: false,
          followerQuality: false,
          contentConsistency: false
        }
      };

      // 1. Profile Analysis
      const profileScore = await this.analyzeProfile(socialAccount);
      verificationResult.checks.profile = profileScore > 0.6;
      verificationResult.score += profileScore * 0.25;

      // 2. Engagement Analysis
      const engagementScore = await this.analyzeEngagement(socialAccount);
      verificationResult.checks.engagement = engagementScore > 0.5;
      verificationResult.score += engagementScore * 0.35;

      // 3. Follower Quality Check
      const followerScore = await this.analyzeFollowerQuality(socialAccount);
      verificationResult.checks.followerQuality = followerScore > 0.6;
      verificationResult.score += followerScore * 0.25;

      // 4. Content Consistency
      const contentScore = await this.analyzeContentConsistency(socialAccount);
      verificationResult.checks.contentConsistency = contentScore > 0.5;
      verificationResult.score += contentScore * 0.15;

      // Overall verification status
      verificationResult.verified = verificationResult.score > 0.65;

      // Generate warnings
      if (verificationResult.score < 0.4) {
        verificationResult.warnings.push('Low authenticity score - manual review recommended');
      }
      if (!verificationResult.checks.followerQuality) {
        verificationResult.warnings.push('Suspicious follower patterns detected');
      }
      if (!verificationResult.checks.engagement) {
        verificationResult.warnings.push('Unusual engagement patterns');
      }

      logger.info('Influencer verification completed', {
        platform: socialAccount.platform,
        username: socialAccount.username,
        score: verificationResult.score,
        verified: verificationResult.verified
      });

      return verificationResult;

    } catch (error) {
      logger.error('Verification service error', {
        error: error.message,
        platform: socialAccount.platform,
        username: socialAccount.username
      });

      return {
        verified: false,
        score: 0,
        warnings: ['Verification failed - unable to analyze account'],
        checks: {
          profile: false,
          engagement: false,
          followerQuality: false,
          contentConsistency: false
        },
        error: error.message
      };
    }
  }

  /**
   * Analyze profile authenticity
   */
  async analyzeProfile(socialAccount) {
    let score = 1.0;

    // Check username patterns
    const username = socialAccount.username?.toLowerCase() || '';
    for (const pattern of this.suspiciousPatterns.username) {
      if (pattern.test(username)) {
        score -= 0.2;
        break;
      }
    }

    // Check profile completeness
    if (!socialAccount.profilePicture) score -= 0.1;
    if (!socialAccount.bio || socialAccount.bio.length < 10) score -= 0.1;
    if (!socialAccount.displayName) score -= 0.1;

    // Check account age (if available)
    if (socialAccount.metadata?.accountCreated) {
      const accountAge = Date.now() - new Date(socialAccount.metadata.accountCreated).getTime();
      const ageInDays = accountAge / (1000 * 60 * 60 * 24);
      
      if (ageInDays < 30) score -= 0.3; // Very new accounts are suspicious
      else if (ageInDays < 90) score -= 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Analyze engagement patterns
   */
  async analyzeEngagement(socialAccount) {
    let score = 1.0;

    const followers = socialAccount.followers || 0;
    const avgLikes = socialAccount.metrics?.averageLikes || 0;
    const avgComments = socialAccount.metrics?.averageComments || 0;

    if (followers === 0) return 0;

    // Calculate engagement rate
    const engagementRate = (avgLikes + avgComments) / followers;
    
    // Nano-influencer engagement rate benchmarks
    const platform = socialAccount.platform.toLowerCase();
    let expectedRange = { min: 0.02, max: 0.08 }; // Default 2-8%

    switch (platform) {
      case 'instagram':
        expectedRange = { min: 0.03, max: 0.1 }; // 3-10%
        break;
      case 'tiktok':
        expectedRange = { min: 0.05, max: 0.15 }; // 5-15%
        break;
      case 'youtube':
        expectedRange = { min: 0.02, max: 0.06 }; // 2-6%
        break;
    }

    // Score based on engagement rate
    if (engagementRate < expectedRange.min * 0.5) {
      score -= 0.4; // Very low engagement
    } else if (engagementRate < expectedRange.min) {
      score -= 0.2; // Below expected
    } else if (engagementRate > expectedRange.max * 2) {
      score -= 0.3; // Suspiciously high
    }

    // Check like-to-comment ratio
    if (avgLikes > 0 && avgComments > 0) {
      const likeCommentRatio = avgLikes / avgComments;
      
      // Suspicious ratios
      if (likeCommentRatio > 100 || likeCommentRatio < 5) {
        score -= 0.2;
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Analyze follower quality (simplified - in production use specialized services)
   */
  async analyzeFollowerQuality(socialAccount) {
    let score = 1.0;

    const followers = socialAccount.followers || 0;
    const following = socialAccount.following || 0;

    // Follower-to-following ratio analysis
    if (following > 0) {
      const ratio = followers / following;
      
      if (ratio < 0.1) score -= 0.3; // Following way more than followers
      else if (ratio < 0.5) score -= 0.1;
    }

    // Check for sudden follower spikes (if historical data available)
    if (socialAccount.metrics?.followerGrowth) {
      const growth = socialAccount.metrics.followerGrowth;
      
      if (growth.daily > this.suspiciousPatterns.followerGrowth.maxDailyGrowth) {
        score -= 0.4;
      }
      if (growth.weekly > this.suspiciousPatterns.followerGrowth.maxWeeklyGrowth) {
        score -= 0.3;
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Analyze content consistency
   */
  async analyzeContentConsistency(socialAccount) {
    let score = 1.0;

    // Check posting frequency
    const postsPerWeek = socialAccount.metrics?.postsPerWeek || 0;
    
    if (postsPerWeek === 0) {
      score -= 0.5; // No content
    } else if (postsPerWeek < 1) {
      score -= 0.2; // Very infrequent
    } else if (postsPerWeek > 20) {
      score -= 0.3; // Suspiciously frequent
    }

    // Check content quality indicators (if available)
    if (socialAccount.metrics?.averageContentScore) {
      const contentScore = socialAccount.metrics.averageContentScore;
      if (contentScore < 0.3) score -= 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Generate verification badge level
   */
  getVerificationBadge(score) {
    if (score >= 0.9) return 'premium';
    if (score >= 0.75) return 'verified';
    if (score >= 0.6) return 'basic';
    return 'unverified';
  }

  /**
   * Get verification recommendations
   */
  getVerificationRecommendations(verificationResult) {
    const recommendations = [];

    if (!verificationResult.checks.profile) {
      recommendations.push('Complete your profile with a professional photo and detailed bio');
    }
    
    if (!verificationResult.checks.engagement) {
      recommendations.push('Focus on creating engaging content to improve interaction rates');
    }
    
    if (!verificationResult.checks.followerQuality) {
      recommendations.push('Avoid using follower-buying services and focus on organic growth');
    }
    
    if (!verificationResult.checks.contentConsistency) {
      recommendations.push('Maintain a consistent posting schedule with quality content');
    }

    if (recommendations.length === 0) {
      recommendations.push('Your profile looks great! Consider connecting additional social platforms.');
    }

    return recommendations;
  }
}

module.exports = new VerificationService();