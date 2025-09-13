const { Sequelize } = require('sequelize');
const { logger } = require('../utils/monitoring');

// Database configuration based on environment
const config = {
  development: {
    // Use PostgreSQL for development - fallback to SQLite if not available
    dialect: process.env.DB_DIALECT || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'nanoinfluencer_dev',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    // SQLite fallback configuration
    storage: process.env.DB_DIALECT === 'sqlite' ? ':memory:' : undefined,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: (msg) => {
      if (process.env.ENABLE_SQL_LOGGING === 'true') {
        logger.debug('SQL Query', { query: msg });
      }
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false
    },
    dialectOptions: {
      ssl: false,
      connectTimeout: 20000,
      acquireTimeout: 20000,
      timeout: 20000
    },
    retry: {
      match: [
        /ConnectionError/,
        /ConnectionTimedOutError/,
        /TimeoutError/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/
      ],
      max: 3
    }
  },
  
  test: {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME ? `${process.env.DB_NAME}_test` : 'nanoinfluencer_test',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: false,
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false
    }
  },
  
  production: {
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    logging: false,
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      connectTimeout: 20000,
      acquireTimeout: 20000,
      timeout: 20000
    },
    retry: {
      match: [
        /ConnectionError/,
        /ConnectionTimedOutError/,
        /TimeoutError/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/
      ],
      max: 5
    }
  }
};

// Get environment configuration
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Validate required environment variables for production
if (env === 'production') {
  const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

// Create Sequelize instance
const sequelize = new Sequelize(dbConfig);

// Connection test with retry logic
const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      logger.info('Database connection established successfully', {
        host: dbConfig.host,
        database: dbConfig.database,
        dialect: dbConfig.dialect,
        environment: env
      });
      console.log('✅ Database connection has been established successfully.');
      return true;
    } catch (error) {
      logger.error(`Database connection attempt ${i + 1} failed`, {
        error: error.message,
        host: dbConfig.host,
        database: dbConfig.database,
        attempt: i + 1,
        maxRetries: retries
      });
      
      if (i === retries - 1) {
        console.error('❌ Unable to connect to the database:', error.message);
        throw new Error(`Failed to connect to database after ${retries} attempts: ${error.message}`);
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};

// Connection health check
const healthCheck = async () => {
  try {
    await sequelize.query('SELECT 1');
    return {
      status: 'healthy',
      message: 'Database connection is healthy',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    return {
      status: 'unhealthy',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Graceful shutdown
const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info('Database connection closed successfully');
  } catch (error) {
    logger.error('Error closing database connection', { error: error.message });
    throw error;
  }
};

// Connection event handlers
sequelize.addHook('afterConnect', (connection) => {
  logger.debug('Database connection established', {
    processId: connection.processID || 'unknown'
  });
});

sequelize.addHook('beforeDisconnect', () => {
  logger.debug('Database disconnecting...');
});

// Export configuration and utilities
module.exports = {
  sequelize,
  config: dbConfig,
  testConnection,
  healthCheck,
  closeConnection,
  Sequelize
};
