const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tokenHash: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'token_hash',
    comment: 'SHA256 hash of the refresh token for security'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  jti: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    comment: 'JWT ID for token identification and rotation'
  },
  revoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this token has been revoked'
  },
  replacedByToken: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'replaced_by_token',
    comment: 'Hash of the token that replaced this one during rotation'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
    comment: 'When this refresh token expires'
  },
  createdByIp: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'created_by_ip',
    comment: 'IP address that created this token'
  },
  revokedByIp: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'revoked_by_ip',
    comment: 'IP address that revoked this token'
  },
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'revoked_at',
    comment: 'When this token was revoked'
  }
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['token_hash']
    },
    {
      fields: ['expires_at']
    },
    {
      fields: ['jti']
    }
  ]
});

// Instance methods
RefreshToken.prototype.isExpired = function() {
  return Date.now() >= this.expiresAt.getTime();
};

RefreshToken.prototype.isActive = function() {
  return !this.revoked && !this.isExpired();
};

RefreshToken.prototype.revoke = function(ip, replacedByToken = null) {
  this.revoked = true;
  this.revokedAt = new Date();
  this.revokedByIp = ip;
  if (replacedByToken) {
    this.replacedByToken = replacedByToken;
  }
  return this.save();
};

// Class methods
RefreshToken.associate = (models) => {
  // RefreshToken belongs to User
  RefreshToken.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE'
  });
};

// Static methods
RefreshToken.createToken = async function(userId, tokenHash, jti, expiresAt, createdByIp) {
  return this.create({
    userId,
    tokenHash,
    jti,
    expiresAt,
    createdByIp
  });
};

RefreshToken.findByTokenHash = async function(tokenHash) {
  return this.findOne({
    where: { tokenHash },
    include: [{
      model: this.sequelize.models.User,
      as: 'user'
    }]
  });
};

RefreshToken.revokeAllUserTokens = async function(userId, ip) {
  return this.update(
    {
      revoked: true,
      revokedAt: new Date(),
      revokedByIp: ip
    },
    {
      where: {
        userId,
        revoked: false
      }
    }
  );
};

RefreshToken.cleanupExpiredTokens = async function() {
  return this.destroy({
    where: {
      expiresAt: {
        [this.sequelize.Sequelize.Op.lt]: new Date()
      }
    }
  });
};

module.exports = RefreshToken;