import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { socialMediaAPI } from '../services/api';
import toast from 'react-hot-toast';

const platformIcons = {
  instagram: '📸',
  tiktok: '🎵',
  youtube: '📺',
  twitter: '🐦',
  facebook: '👥',
  linkedin: '💼',
  snapchat: '👻',
  pinterest: '📌',
  twitch: '🎮'
};

const platformColors = {
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
  tiktok: 'bg-gradient-to-r from-black to-pink-500',
  youtube: 'bg-red-500',
  twitter: 'bg-blue-400',
  facebook: 'bg-blue-600',
  linkedin: 'bg-blue-700',
  snapchat: 'bg-yellow-400',
  pinterest: 'bg-red-600',
  twitch: 'bg-purple-600'
};

const SocialMediaManager = ({ isInfluencer = true }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    platform: 'instagram',
    username: '',
    displayName: '',
    followersCount: 0,
    engagementRate: 0,
    isVerified: false
  });

  useEffect(() => {
    fetchSocialAccounts();
  }, []);

  const fetchSocialAccounts = async () => {
    try {
      setLoading(true);
      const response = await socialMediaAPI.getSocialAccounts();
      setAccounts(response.accounts || []);
    } catch (error) {
      console.error('Failed to fetch social accounts:', error);
      toast.error('Failed to load social media accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    try {
      await socialMediaAPI.addSocialAccount(newAccount);
      toast.success(`${newAccount.platform} account added successfully!`);
      setNewAccount({
        platform: 'instagram',
        username: '',
        displayName: '',
        followersCount: 0,
        engagementRate: 0,
        isVerified: false
      });
      setShowAddModal(false);
      fetchSocialAccounts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add account');
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (window.confirm('Are you sure you want to delete this social media account?')) {
      try {
        await socialMediaAPI.deleteSocialAccount(accountId);
        toast.success('Account deleted successfully');
        fetchSocialAccounts();
      } catch (error) {
        toast.error('Failed to delete account');
      }
    }
  };

  const handleSyncAccount = async (accountId) => {
    try {
      await socialMediaAPI.syncSocialAccount(accountId);
      toast.success('Account synced successfully');
      fetchSocialAccounts();
    } catch (error) {
      toast.error('Failed to sync account');
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Social Media Accounts</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Social Media Accounts</h2>
          <p className="text-gray-600">Manage your social media presence across platforms</p>
        </div>
        {isInfluencer && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Account
          </button>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📱</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No social media accounts yet</h3>
          <p className="text-gray-500 mb-6">
            {isInfluencer 
              ? 'Add your social media accounts to showcase your influence and connect with brands'
              : 'This user hasn\'t added any social media accounts yet'
            }
          </p>
          {isInfluencer && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              Add Your First Account
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <div key={account.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className={`w-full h-2 rounded-t-lg mb-4 ${platformColors[account.platform]}`}></div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{platformIcons[account.platform]}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 capitalize">
                      {account.platform}
                      {account.isVerified && (
                        <CheckCircleIcon className="h-5 w-5 text-blue-500 inline ml-2" />
                      )}
                    </h3>
                    <p className="text-gray-600">@{account.username}</p>
                  </div>
                </div>
                {isInfluencer && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSyncAccount(account.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Sync account data"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete account"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Followers</p>
                  <p className="font-semibold text-gray-900">{formatNumber(account.followersCount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Engagement</p>
                  <p className="font-semibold text-gray-900">{account.engagementRate}%</p>
                </div>
              </div>

              {account.lastSyncAt && (
                <p className="text-xs text-gray-400 mt-4">
                  Last synced: {new Date(account.lastSyncAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowAddModal(false)}></div>

            <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Add Social Media Account</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleAddAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                  <select
                    value={newAccount.platform}
                    onChange={(e) => setNewAccount({...newAccount, platform: e.target.value})}
                    className="input-field"
                    required
                  >
                    {Object.keys(platformIcons).map(platform => (
                      <option key={platform} value={platform}>
                        {platformIcons[platform]} {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                  <input
                    type="text"
                    value={newAccount.username}
                    onChange={(e) => setNewAccount({...newAccount, username: e.target.value})}
                    className="input-field"
                    placeholder="your_username"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={newAccount.displayName}
                    onChange={(e) => setNewAccount({...newAccount, displayName: e.target.value})}
                    className="input-field"
                    placeholder="Your Display Name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Followers</label>
                    <input
                      type="number"
                      value={newAccount.followersCount}
                      onChange={(e) => setNewAccount({...newAccount, followersCount: parseInt(e.target.value) || 0})}
                      className="input-field"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Engagement Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newAccount.engagementRate}
                      onChange={(e) => setNewAccount({...newAccount, engagementRate: parseFloat(e.target.value) || 0})}
                      className="input-field"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isVerified"
                    checked={newAccount.isVerified}
                    onChange={(e) => setNewAccount({...newAccount, isVerified: e.target.checked})}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label htmlFor="isVerified" className="ml-2 text-sm text-gray-700">
                    Verified account
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                  >
                    Add Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialMediaManager;