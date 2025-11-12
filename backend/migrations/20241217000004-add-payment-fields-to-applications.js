'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add payment-related fields to campaign_applications table
      await queryInterface.addColumn('campaign_applications', 'payment_status', {
        type: Sequelize.ENUM('pending', 'processing', 'paid', 'failed'),
        defaultValue: 'pending',
        comment: 'Payment status for this application'
      });

      await queryInterface.addColumn('campaign_applications', 'paid_amount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Amount paid to influencer'
      });

      // Update the existing completed_at column if it doesn't exist
      const tableDescription = await queryInterface.describeTable('campaign_applications');
      
      if (!tableDescription.completed_at) {
        await queryInterface.addColumn('campaign_applications', 'completed_at', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'When the application was completed'
        });
      }

      // Add indexes for performance
      await queryInterface.addIndex('campaign_applications', ['payment_status'], {
        name: 'campaign_applications_payment_status_idx'
      });

      console.log('✅ Payment fields added to campaign_applications table successfully');
    } catch (error) {
      console.error('❌ Error adding payment fields to campaign_applications:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove index
      await queryInterface.removeIndex('campaign_applications', 'campaign_applications_payment_status_idx');

      // Remove columns
      await queryInterface.removeColumn('campaign_applications', 'payment_status');
      await queryInterface.removeColumn('campaign_applications', 'paid_amount');
      
      // Note: We don't remove completed_at as it might have been added by another migration

      console.log('✅ Payment fields removed from campaign_applications table successfully');
    } catch (error) {
      console.error('❌ Error removing payment fields from campaign_applications:', error);
      throw error;
    }
  }
};