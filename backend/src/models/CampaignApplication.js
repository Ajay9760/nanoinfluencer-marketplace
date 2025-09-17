const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CampaignApplication = sequelize.define('CampaignApplication', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  campaignId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'campaigns',
      key: 'id'
    },
    field: 'campaign_id'
  },
  influencerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'influencer_id'
  },
  status: {
    type: DataTypes.ENUM(
      'pending', 
      'approved', 
      'rejected', 
      'completed',
      'cancelled',
      'in_progress'
    ),
    defaultValue: 'pending'
  },
  proposedContent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'proposed_content'
  },
  proposedTimeline: {
    type: DataTypes.JSON,
    defaultValue: {},
    field: 'proposed_timeline'
  },
  portfolioUrls: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    field: 'portfolio_urls',
    get() {
      const value = this.getDataValue('portfolioUrls');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('portfolioUrls', JSON.stringify(value || []));
    }
  },
  negotiatedRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'negotiated_rate'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD'
  },
  appliedPlatforms: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'applied_platforms',
    get() {
      const value = this.getDataValue('appliedPlatforms');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      const validPlatforms = ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'linkedin', 'snapchat', 'pinterest', 'twitch'];
      const filteredValue = value.filter(platform => validPlatforms.includes(platform));
      this.setDataValue('appliedPlatforms', JSON.stringify(filteredValue || []));
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Message from influencer to brand'
  },
  brandResponse: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'brand_response',
    comment: 'Response from brand to influencer'
  },
  deliverables: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Agreed upon deliverables'
  },
  submittedContent: {
    type: DataTypes.JSON,
    defaultValue: {},
    field: 'submitted_content',
    comment: 'Content submitted by influencer'
  },
  contentApprovalStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'needs_revision', 'rejected'),
    defaultValue: 'pending',
    field: 'content_approval_status'
  },
  revisionNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'revision_notes'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  },
  rejectedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'rejected_at'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason'
  },
  performanceMetrics: {
    type: DataTypes.JSON,
    defaultValue: {},
    field: 'performance_metrics',
    comment: 'Content performance analytics'
  }
}, {
  tableName: 'campaign_applications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['campaign_id', 'influencer_id']
    },
    {
      fields: ['campaign_id']
    },
    {
      fields: ['influencer_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['applied_platforms']
    }
  ]
});

// Instance methods
CampaignApplication.prototype.approve = async function(brandResponse) {
  this.status = 'approved';
  this.brandResponse = brandResponse;
  this.approvedAt = new Date();
  return this.save();
};

CampaignApplication.prototype.reject = async function(rejectionReason) {
  this.status = 'rejected';
  this.rejectionReason = rejectionReason;
  this.rejectedAt = new Date();
  return this.save();
};

CampaignApplication.prototype.complete = async function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

CampaignApplication.prototype.submitContent = async function(content) {
  this.submittedContent = { ...this.submittedContent, ...content };
  this.contentApprovalStatus = 'pending';
  this.status = 'in_progress';
  return this.save();
};

CampaignApplication.prototype.updatePerformanceMetrics = async function(metrics) {
  this.performanceMetrics = { ...this.performanceMetrics, ...metrics };
  return this.save();
};

// Class methods
CampaignApplication.associate = (models) => {
  CampaignApplication.belongsTo(models.Campaign, {
    foreignKey: 'campaignId',
    as: 'campaign'
  });
  
  CampaignApplication.belongsTo(models.User, {
    foreignKey: 'influencerId',
    as: 'influencer'
  });
};

module.exports = CampaignApplication;