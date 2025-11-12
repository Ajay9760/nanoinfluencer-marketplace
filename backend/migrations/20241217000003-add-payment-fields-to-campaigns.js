'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add payment-related fields to campaigns table
      await queryInterface.addColumn('campaigns', 'escrow_id', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Stripe Payment Intent ID for escrow'
      });

      await queryInterface.addColumn('campaigns', 'payment_status', {
        type: Sequelize.ENUM('pending', 'funded', 'released', 'refunded'),
        defaultValue: 'pending',
        comment: 'Status of campaign payment'
      });

      await queryInterface.addColumn('campaigns', 'funded_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the campaign was funded'
      });

      await queryInterface.addColumn('campaigns', 'refunded_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the campaign was refunded'
      });

      // Add indexes for performance
      await queryInterface.addIndex('campaigns', ['escrow_id'], {
        name: 'campaigns_escrow_id_idx'
      });

      await queryInterface.addIndex('campaigns', ['payment_status'], {
        name: 'campaigns_payment_status_idx'
      });

      console.log('✅ Payment fields added to campaigns table successfully');
    } catch (error) {
      console.error('❌ Error adding payment fields to campaigns:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove indexes
      await queryInterface.removeIndex('campaigns', 'campaigns_escrow_id_idx');
      await queryInterface.removeIndex('campaigns', 'campaigns_payment_status_idx');

      // Remove columns
      await queryInterface.removeColumn('campaigns', 'escrow_id');
      await queryInterface.removeColumn('campaigns', 'payment_status');
      await queryInterface.removeColumn('campaigns', 'funded_at');
      await queryInterface.removeColumn('campaigns', 'refunded_at');

      console.log('✅ Payment fields removed from campaigns table successfully');
    } catch (error) {
      console.error('❌ Error removing payment fields from campaigns:', error);
      throw error;
    }
  }
};