'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('AdminPassword123!', 12);
    
    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        name: 'System Administrator',
        email: 'admin@nanoinfluencer.com',
        password_hash: hashedPassword,
        role: 'admin',
        email_verified: true,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', {
      email: 'admin@nanoinfluencer.com'
    }, {});
  }
};