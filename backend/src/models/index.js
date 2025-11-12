const User = require('./User');
const Campaign = require('./Campaign');
const CampaignApplication = require('./CampaignApplication');
const SocialMediaAccount = require('./SocialMediaAccount');
const Analytics = require('./Analytics');
const RefreshToken = require('./RefreshToken');

// Set up model associations
const models = {
  User,
  Campaign,
  CampaignApplication,
  SocialMediaAccount,
  Analytics,
  RefreshToken
};

// Initialize associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = models;