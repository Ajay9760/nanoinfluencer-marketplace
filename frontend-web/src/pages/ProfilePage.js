import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { UserIcon, PencilIcon, CameraIcon, MapPinIcon, GlobeAltIcon, PhoneIcon, EnvelopeIcon, CalendarIcon, ChartBarIcon, CurrencyDollarIcon, UserGroupIcon, TrendingUpIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    location: '',
    website: '',
    phone: ''
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: UserIcon },
    { id: 'stats', label: 'Statistics', icon: ChartBarIcon },
    { id: 'settings', label: 'Settings', icon: PencilIcon }
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getProfile();
      setProfile(response.data.profile);
      setEditForm({
        name: response.data.profile.name || '',
        bio: response.data.profile.bio || '',
        location: response.data.profile.location || '',
        website: response.data.profile.website || '',
        phone: response.data.profile.phone || ''
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await authAPI.updateProfile(editForm);
      setProfile({ ...profile, ...response.data.profile });
      setEditMode(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toString() || '0';
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      yellow: 'bg-yellow-50 text-yellow-600',
      red: 'bg-red-50 text-red-600',
      purple: 'bg-purple-50 text-purple-600'
    };

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-8">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-gray-300 flex items-center justify-center">
                  {profile?.profilePicture ? (
                    <img
                      className="h-24 w-24 rounded-full object-cover"
                      src={profile.profilePicture}
                      alt={profile.name}
                    />
                  ) : (
                    <UserIcon className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <button className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 text-white hover:bg-blue-700">
                  <CameraIcon className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{profile?.name}</h1>
                    <p className="text-lg text-gray-600 capitalize">{profile?.role}</p>
                  </div>
                  <button
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Edit Profile
                  </button>
                </div>
                
                {profile?.bio && (
                  <p className="mt-2 text-gray-600">{profile.bio}</p>
                )}
                
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                  {profile?.location && (
                    <div className="flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      {profile.location}
                    </div>
                  )}
                  {profile?.website && (
                    <div className="flex items-center">
                      <GlobeAltIcon className="h-4 w-4 mr-1" />
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {profile.website}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Joined {formatDate(profile?.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 flex items-center text-sm text-gray-900">
                        <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {profile?.email}
                      </dd>
                    </div>
                    {profile?.phone && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Phone</dt>
                        <dd className="mt-1 flex items-center text-sm text-gray-900">
                          <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {profile.phone}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Account Status</dt>
                      <dd className="mt-1 flex items-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          {profile?.status}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Login</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {profile?.lastLoginAt ? formatDate(profile.lastLoginAt) : 'Never'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
                  <div className="space-y-4">
                    {profile?.role === 'brand' && profile?.statistics && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Campaigns</span>
                          <span className="text-sm font-semibold">{profile.statistics.totalCampaigns || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Active Campaigns</span>
                          <span className="text-sm font-semibold">{profile.statistics.activeCampaigns || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Budget</span>
                          <span className="text-sm font-semibold">{formatCurrency(profile.statistics.totalBudget)}</span>
                        </div>
                      </>
                    )}

                    {profile?.role === 'influencer' && profile?.statistics && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Followers</span>
                          <span className="text-sm font-semibold">{formatNumber(profile.statistics.totalFollowers)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Platforms</span>
                          <span className="text-sm font-semibold">{profile.statistics.platformCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Earnings</span>
                          <span className="text-sm font-semibold">{formatCurrency(profile.statistics.totalEarnings)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && profile?.statistics && (
            <div className="space-y-6">
              {profile.role === 'brand' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                      title="Total Campaigns"
                      value={profile.statistics.totalCampaigns || 0}
                      icon={ChartBarIcon}
                      color="blue"
                    />
                    <StatCard
                      title="Active Campaigns"
                      value={profile.statistics.activeCampaigns || 0}
                      icon={TrendingUpIcon}
                      color="green"
                    />
                    <StatCard
                      title="Total Budget"
                      value={formatCurrency(profile.statistics.totalBudget)}
                      icon={CurrencyDollarIcon}
                      color="yellow"
                    />
                    <StatCard
                      title="Applications"
                      value={profile.statistics.totalApplications || 0}
                      icon={UserGroupIcon}
                      color="purple"
                    />
                  </div>
                </>
              )}

              {profile.role === 'influencer' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                      title="Total Followers"
                      value={formatNumber(profile.statistics.totalFollowers)}
                      icon={UserGroupIcon}
                      color="blue"
                    />
                    <StatCard
                      title="Avg Engagement"
                      value={`${profile.statistics.averageEngagementRate || 0}%`}
                      icon={TrendingUpIcon}
                      color="green"
                    />
                    <StatCard
                      title="Total Earnings"
                      value={formatCurrency(profile.statistics.totalEarnings)}
                      icon={CurrencyDollarIcon}
                      color="yellow"
                    />
                    <StatCard
                      title="Applications"
                      value={profile.statistics.totalApplications || 0}
                      icon={ChartBarIcon}
                      color="purple"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Profile Settings</h3>
                </div>

                {editMode ? (
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Bio</label>
                      <textarea
                        rows={3}
                        value={editForm.bio}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Tell us about yourself..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Location</label>
                        <input
                          type="text"
                          value={editForm.location}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Website</label>
                        <input
                          type="url"
                          value={editForm.website}
                          onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setEditMode(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Email</span>
                      <span className="text-sm text-gray-900">{profile?.email}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Account Type</span>
                      <span className="text-sm text-gray-900 capitalize">{profile?.role}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Status</span>
                      <span className="text-sm text-gray-900 capitalize">{profile?.status}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium text-gray-600">Member Since</span>
                      <span className="text-sm text-gray-900">{formatDate(profile?.createdAt)}</span>
                    </div>

                    <button
                      onClick={() => setEditMode(true)}
                      className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit Profile Information
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
