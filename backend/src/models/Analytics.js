const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Analytics = sequelize.define('Analytics', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  entityType: {
    type: DataTypes.ENUM('campaign', 'influencer', 'application', 'content'),
    allowNull: false,
    field: 'entity_type'
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'entity_id'
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
  metricType: {
    type: DataTypes.ENUM(
      'impressions',
      'reach',
      'views',
      'likes',
      'comments',
      'shares',
      'saves',
      'clicks',
      'engagement_rate',
      'cpm',
      'cpc',
      'roi',
      'conversion_rate',
      'story_completion_rate',
      'video_completion_rate'
    ),
    allowNull: false,
    field: 'metric_type'
  },
  value: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false,
    comment: 'Numeric value of the metric'
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: true,
    comment: 'Currency for monetary metrics'
  },
  dateRecorded: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'date_recorded'
  },
  contentUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'content_url',
    comment: 'URL of the specific content piece'
  },
  additionalData: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'additional_data',
    comment: 'Platform-specific additional metrics'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_verified',
    comment: 'Whether the metric has been verified/authenticated'
  },
  source: {
    type: DataTypes.ENUM('api', 'manual', 'scraping', 'third_party'),
    defaultValue: 'manual',
    comment: 'Source of the data'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'created_by'
  }
}, {
  tableName: 'analytics',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['entity_type', 'entity_id']
    },
    {
      fields: ['platform']
    },
    {
      fields: ['metric_type']
    },
    {
      fields: ['date_recorded']
    },
    {
      unique: true,
      fields: ['entity_type', 'entity_id', 'platform', 'metric_type', 'date_recorded', 'content_url']
    }
  ]
});

// Class methods for aggregating analytics
Analytics.getCampaignMetrics = async function(campaignId, startDate, endDate) {
  const metrics = await this.findAll({
    where: {
      entityType: 'campaign',
      entityId: campaignId,
      ...(startDate && endDate && {
        dateRecorded: {
          [require('sequelize').Op.between]: [startDate, endDate]
        }
      })
    },
    order: [['dateRecorded', 'DESC']]
  });

  return this.aggregateMetrics(metrics);
};

Analytics.getInfluencerMetrics = async function(influencerId, platform, startDate, endDate) {
  const metrics = await this.findAll({
    where: {
      entityType: 'influencer',
      entityId: influencerId,
      ...(platform && { platform }),
      ...(startDate && endDate && {
        dateRecorded: {
          [require('sequelize').Op.between]: [startDate, endDate]
        }
      })
    },
    order: [['dateRecorded', 'DESC']]
  });

  return this.aggregateMetrics(metrics);
};

Analytics.aggregateMetrics = function(metrics) {
  const aggregated = {};
  
  metrics.forEach(metric => {
    const key = `${metric.platform}_${metric.metricType}`;
    if (!aggregated[key]) {
      aggregated[key] = {
        platform: metric.platform,
        metricType: metric.metricType,
        values: [],
        total: 0,
        average: 0,
        latest: null
      };
    }
    
    aggregated[key].values.push({
      value: parseFloat(metric.value),
      date: metric.dateRecorded,
      contentUrl: metric.contentUrl
    });
    
    aggregated[key].total += parseFloat(metric.value);
    
    if (!aggregated[key].latest || metric.dateRecorded > aggregated[key].latest.date) {
      aggregated[key].latest = {
        value: parseFloat(metric.value),
        date: metric.dateRecorded
      };
    }
  });

  // Calculate averages
  Object.keys(aggregated).forEach(key => {
    if (aggregated[key].values.length > 0) {
      aggregated[key].average = aggregated[key].total / aggregated[key].values.length;
    }
  });

  return aggregated;
};

Analytics.associate = (models) => {
  Analytics.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
};

module.exports = Analytics;