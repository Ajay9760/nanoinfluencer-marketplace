const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Campaign = sequelize.define('Campaign', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  brandId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'brand_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [10, 5000]
    }
  },
  goal: {
    type: DataTypes.ENUM('awareness', 'conversions', 'engagement', 'ugc', 'brand_mention'),
    allowNull: false
  },
  budget: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 1
    }
  },
  budgetPerInfluencer: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'budget_per_influencer',
    validate: {
      min: 1
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD',
    validate: {
      len: [3, 3]
    }
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'paused', 'completed', 'cancelled'),
    defaultValue: 'draft'
  },
  
  // Campaign targeting
  targetAudience: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'target_audience'
  },
  targetFollowerRange: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'target_follower_range'
  },
  targetEngagementRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'target_engagement_rate',
    validate: {
      min: 0,
      max: 100
    }
  },
  targetNiches: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'target_niches'
  },
  
  // Content requirements
  contentRequirements: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'content_requirements'
  },
  contentGuidelines: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'content_guidelines'
  },
  sampleContentUrls: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'sample_content_urls'
  },
  prohibitedContent: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'prohibited_content'
  },
  
  // Campaign timeline
  applicationDeadline: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'application_deadline'
  },
  contentSubmissionDeadline: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'content_submission_deadline'
  },
  campaignStartDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'campaign_start_date'
  },
  campaignEndDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'campaign_end_date'
  },
  
  // Analytics tracking
  utmParameters: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'utm_parameters'
  },
  trackingPixels: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'tracking_pixels'
  },
  customLandingPage: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'custom_landing_page'
  },
  
  // Payment and escrow fields
  escrowId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'escrow_id',
    comment: 'Stripe Payment Intent ID for escrow'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'funded', 'released', 'refunded'),
    defaultValue: 'pending',
    field: 'payment_status',
    comment: 'Status of campaign payment'
  },
  fundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'funded_at',
    comment: 'When the campaign was funded'
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'refunded_at',
    comment: 'When the campaign was refunded'
  }
}, {
  tableName: 'campaigns',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['brand_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['goal']
    },
    {
      fields: ['budget']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Instance methods
Campaign.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  return values;
};

// Class methods
Campaign.associate = (models) => {
  // Campaign belongs to User (Brand)
  Campaign.belongsTo(models.User, {
    foreignKey: 'brandId',
    as: 'brand'
  });
  
  // Campaign has many Applications
  if (models.CampaignApplication) {
    Campaign.hasMany(models.CampaignApplication, {
      foreignKey: 'campaignId',
      as: 'applications'
    });
  }
};

// Hooks
Campaign.addHook('beforeValidate', (campaign) => {
  // Auto-calculate budget per influencer if not provided
  if (!campaign.budgetPerInfluencer && campaign.budget) {
    const estimatedInfluencers = campaign.targetFollowerRange?.max 
      ? Math.ceil(campaign.budget / (campaign.targetFollowerRange.max * 0.01))
      : 5;
    campaign.budgetPerInfluencer = campaign.budget / estimatedInfluencers;
  }
});

module.exports = Campaign;