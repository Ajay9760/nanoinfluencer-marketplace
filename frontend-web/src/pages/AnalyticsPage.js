import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI } from '../services/api';
import {
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  EyeIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AnalyticsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [timeframe, setTimeframe] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('all');

  const timeframeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ];

  const metricOptions = user?.role === 'brand' ? [
    { value: 'all', label: 'All Metrics' },
    { value: 'impressions', label: 'Impressions' },
    { value: 'reach', label: 'Reach' },
    { value: 'engagement_rate', label: 'Engagement Rate' },
    { value: 'cpm', label: 'CPM' },
    { value: 'roi', label: 'ROI' }
  ] : [
    { value: 'all', label: 'All Metrics' },
    { value: 'views', label: 'Views' },
    { value: 'likes', label: 'Likes' },
    { value: 'comments', label: 'Comments' },
    { value: 'shares', label: 'Shares' },
    { value: 'engagement_rate', label: 'Engagement Rate' }
  ];

  useEffect(() => {
    fetchDashboardStats();
  }, [timeframe, selectedMetric]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getDashboardStats();
      setDashboardStats(response.data?.stats);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toString() || '0';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue' }) => {
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
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {change && (
              <p className={`text-sm flex items-center ${
                change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {change >= 0 ? (
                  <TrendingUpIcon className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDownIcon className="h-4 w-4 mr-1" />
                )}
                {Math.abs(change)}%
              </p>
            )}
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

  const brandStats = user?.role === 'brand' ? dashboardStats : null;
  const influencerStats = user?.role === 'influencer' ? dashboardStats : null;

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track your performance and insights across all platforms
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            {timeframeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            {metricOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Brand Dashboard */}
        {brandStats && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Campaigns"
                value={brandStats.totalCampaigns || 0}
                icon={ChartBarIcon}
                color="blue"
              />
              <StatCard
                title="Active Campaigns"
                value={brandStats.activeCampaigns || 0}
                icon={TrendingUpIcon}
                color="green"
              />
              <StatCard
                title="Total Budget"
                value={formatCurrency(brandStats.totalBudget)}
                icon={CurrencyDollarIcon}
                color="yellow"
              />
              <StatCard
                title="Approved Influencers"
                value={brandStats.approvedInfluencers || 0}
                icon={UserGroupIcon}
                color="purple"
              />
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard
                title="Total Impressions"
                value={formatNumber(brandStats.impressions)}
                icon={EyeIcon}
                color="blue"
              />
              <StatCard
                title="Total Reach"
                value={formatNumber(brandStats.reach)}
                icon={UserGroupIcon}
                color="green"
              />
              <StatCard
                title="Avg Engagement Rate"
                value={`${brandStats.averageEngagementRate || 0}%`}
                icon={HeartIcon}
                color="red"
              />
            </div>
          </>
        )}

        {/* Influencer Dashboard */}
        {influencerStats && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Followers"
                value={formatNumber(influencerStats.totalFollowers)}
                icon={UserGroupIcon}
                color="blue"
              />
              <StatCard
                title="Avg Engagement Rate"
                value={`${influencerStats.averageEngagementRate || 0}%`}
                icon={HeartIcon}
                color="green"
              />
              <StatCard
                title="Total Earnings"
                value={formatCurrency(influencerStats.totalEarnings)}
                icon={CurrencyDollarIcon}
                color="yellow"
              />
              <StatCard
                title="Platform Count"
                value={influencerStats.platformCount || 0}
                icon={ChartBarIcon}
                color="purple"
              />
            </div>

            {/* Application Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Applications"
                value={influencerStats.totalApplications || 0}
                icon={ChartBarIcon}
                color="blue"
              />
              <StatCard
                title="Approved"
                value={influencerStats.approvedApplications || 0}
                icon={TrendingUpIcon}
                color="green"
              />
              <StatCard
                title="Completed"
                value={influencerStats.completedApplications || 0}
                icon={TrendingUpIcon}
                color="green"
              />
              <StatCard
                title="Pending"
                value={influencerStats.pendingApplications || 0}
                icon={TrendingUpIcon}
                color="yellow"
              />
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <StatCard
                title="Total Views"
                value={formatNumber(influencerStats.totalViews)}
                icon={EyeIcon}
                color="blue"
              />
              <StatCard
                title="Total Likes"
                value={formatNumber(influencerStats.totalLikes)}
                icon={HeartIcon}
                color="red"
              />
            </div>
          </>
        )}

        {/* Additional Insights */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Key Insights</h3>
          <div className="space-y-4">
            {user?.role === 'brand' && brandStats && (
              <>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Campaign Performance</p>
                    <p className="text-sm text-gray-600">
                      {brandStats.activeCampaigns || 0} active campaigns generating {formatNumber(brandStats.impressions)} impressions
                    </p>
                  </div>
                  <ChartBarIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Budget Efficiency</p>
                    <p className="text-sm text-gray-600">
                      Average budget per campaign: {formatCurrency((brandStats.totalBudget || 0) / Math.max(brandStats.totalCampaigns || 1, 1))}
                    </p>
                  </div>
                  <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                </div>
              </>
            )}

            {user?.role === 'influencer' && influencerStats && (
              <>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Audience Reach</p>
                    <p className="text-sm text-gray-600">
                      {formatNumber(influencerStats.totalFollowers)} total followers across {influencerStats.platformCount || 0} platforms
                    </p>
                  </div>
                  <UserGroupIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Earnings Overview</p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(influencerStats.totalEarnings)} earned from {influencerStats.completedApplications || 0} completed campaigns
                    </p>
                  </div>
                  <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                </div>
              </>
            )}

            {(!brandStats && !influencerStats) && (
              <div className="text-center py-12">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No analytics data available yet</p>
                <p className="text-sm text-gray-400 mt-1">Start creating campaigns or applying to see your analytics</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
