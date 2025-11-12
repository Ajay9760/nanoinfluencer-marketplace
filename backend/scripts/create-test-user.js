// Test user creation script
require('dotenv').config();
const { sequelize } = require('../src/config/database');
const User = require('../src/models/User');
const bcrypt = require('bcryptjs');

const createTestUser = async () => {
  try {
    console.log('🔧 Creating test user...');
    
    // Ensure database connection
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Sync models
    await sequelize.sync();
    console.log('✅ Database synced');
    
    // Check if test user already exists
    const existingUser = await User.findOne({ where: { email: 'test@nanoinfluencer.com' } });
    if (existingUser) {
      console.log('ℹ️  Test user already exists');
      console.log('📧 Email: test@nanoinfluencer.com');
      console.log('🔑 Password: password123');
      return;
    }
    
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const testUser = await User.create({
      name: 'Test User',
      email: 'test@nanoinfluencer.com',
      passwordHash: hashedPassword,
      role: 'brand',
      status: 'active',
      authProvider: 'local'
    });
    
    console.log('✅ Test user created successfully!');
    console.log('📧 Email: test@nanoinfluencer.com');
    console.log('🔑 Password: password123');
    console.log('👤 Role: brand');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

createTestUser();