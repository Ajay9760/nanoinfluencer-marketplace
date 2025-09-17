const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.VIRTUAL,
    allowNull: true,
    validate: {
      len: [6, 255]
    }
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'password_hash'
  },
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    field: 'google_id'
  },
  authProvider: {
    type: DataTypes.ENUM('local', 'google', 'facebook'),
    defaultValue: 'local',
    field: 'auth_provider'
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'profile_picture'
  },
  role: {
    type: DataTypes.ENUM('brand', 'influencer', 'admin'),
    allowNull: false,
    defaultValue: 'influencer'
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'email_verified'
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avatarUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'avatar_url'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending'),
    defaultValue: 'pending'
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login_at'
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.passwordHash = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.password) {
        user.passwordHash = await bcrypt.hash(user.password, 12);
      }
    }
  }
});

// Instance methods
User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.passwordHash;
  return values;
};

// Class methods
User.associate = (models) => {
  // User has many social media accounts
  if (models.SocialMediaAccount) {
    User.hasMany(models.SocialMediaAccount, {
      foreignKey: 'userId',
      as: 'socialAccounts'
    });
  }
  
  // Brand users have many campaigns
  if (models.Campaign) {
    User.hasMany(models.Campaign, {
      foreignKey: 'brandId',
      as: 'campaigns'
    });
  }
  
  // Influencer users have many applications
  if (models.CampaignApplication) {
    User.hasMany(models.CampaignApplication, {
      foreignKey: 'influencerId',
      as: 'applications'
    });
  }
  
  // Analytics created by user
  if (models.Analytics) {
    User.hasMany(models.Analytics, {
      foreignKey: 'createdBy',
      as: 'analyticsCreated'
    });
  }
};

module.exports = User;