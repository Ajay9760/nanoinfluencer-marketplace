'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('campaigns', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      brand_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'NO ACTION'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [3, 255]
        }
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [10, 5000]
        }
      },
      goal: {
        type: Sequelize.ENUM(
          'brand_awareness',
          'product_launch',
          'sales_conversion',
          'engagement',
          'lead_generation',
          'content_creation',
          'other'
        ),
        allowNull: false
      },
      budget: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
          isDecimal: true
        }
      },
      budget_per_influencer: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        validate: {
          min: 0,
          isDecimal: true
        }
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'USD',
        validate: {
          len: [3, 3],
          isUppercase: true
        }
      },
      status: {
        type: Sequelize.ENUM('draft', 'active', 'paused', 'completed', 'cancelled'),
        defaultValue: 'draft'
      },
      target_audience: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Target audience demographics and interests'
      },
      target_follower_range: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Min/max follower count requirements'
      },
      target_engagement_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        validate: {
          min: 0,
          max: 100
        },
        comment: 'Minimum engagement rate percentage'
      },
      target_niches: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of target niches/categories'
      },
      content_requirements: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Content type, format, and posting requirements'
      },
      content_guidelines: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Detailed content guidelines and brand voice'
      },
      sample_content_urls: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Example content URLs for reference'
      },
      prohibited_content: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'List of prohibited content types or topics'
      },
      application_deadline: {
        type: Sequelize.DATE,
        allowNull: true
      },
      content_submission_deadline: {
        type: Sequelize.DATE,
        allowNull: true
      },
      campaign_start_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      campaign_end_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      utm_parameters: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'UTM parameters for tracking'
      },
      tracking_pixels: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Tracking pixels for analytics'
      },
      custom_landing_page: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          isUrl: true
        }
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('campaigns', ['brand_id'], {
      name: 'campaigns_brand_id_index'
    });
    
    await queryInterface.addIndex('campaigns', ['status'], {
      name: 'campaigns_status_index'
    });
    
    await queryInterface.addIndex('campaigns', ['goal'], {
      name: 'campaigns_goal_index'
    });
    
    await queryInterface.addIndex('campaigns', ['budget'], {
      name: 'campaigns_budget_index'
    });
    
    await queryInterface.addIndex('campaigns', ['created_at'], {
      name: 'campaigns_created_at_index'
    });
    
    await queryInterface.addIndex('campaigns', ['application_deadline'], {
      name: 'campaigns_application_deadline_index'
    });
    
    await queryInterface.addIndex('campaigns', ['campaign_start_date'], {
      name: 'campaigns_start_date_index'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('campaigns');
  }
};