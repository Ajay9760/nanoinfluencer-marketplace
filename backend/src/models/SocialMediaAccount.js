const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SocialMediaAccount = sequelize.define('SocialMediaAccount', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'user_id'
  },
  platform: {
    type: DataTypes.ENUM(
      'instagram', 
      'tiktok', 
      'youtube', 
      'twitter', 
      'facebook', 
      'linkedin', 
      'snapchat', 
      'pinterest', 
      'twitch'
    ),
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'display_name'
  },
  profileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'profile_url'
  },
  profileImageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'profile_image_url'
  },
  followersCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'followers_count'
  },
  followingCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'following_count'
  },
  postsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'posts_count'
  },
  engagementRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    field: 'engagement_rate'
  },
  averageLikes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'average_likes'
  },
  averageComments: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'average_comments'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_verified'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_sync_at'
  },
  accessToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'access_token'
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'refresh_token'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
  },
  metrics: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Store platform-specific metrics and analytics'
  }
}, {
  tableName: 'social_media_accounts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'platform', 'username']
    },
    {
      fields: ['platform']
    },
    {
      fields: ['followers_count']
    },
    {
      fields: ['engagement_rate']
    }
  ]
});

// Instance methods
SocialMediaAccount.prototype.updateMetrics = function(metrics) {
  this.metrics = { ...this.metrics, ...metrics };
  this.lastSyncAt = new Date();
  return this.save();
};

SocialMediaAccount.prototype.calculateEngagementRate = function() {
  if (this.followersCount === 0) return 0;
  const totalEngagement = this.averageLikes + this.averageComments;
  return ((totalEngagement / this.followersCount) * 100).toFixed(2);
};

// Class methods
SocialMediaAccount.associate = (models) => {
  SocialMediaAccount.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

module.exports = SocialMediaAccount;