import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MagnifyingGlassIcon, FunnelIcon, UserGroupIcon, MapPinIcon, CheckBadgeIcon, TrendingUpIcon } from '@heroicons/react/24/outline';
import { CheckBadgeIcon as CheckBadgeIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const InfluencersPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [influencers, setInfluencers] = useState([]);
  const [activeView, setActiveView] = useState('discover');
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    platform: '',
    location: '',
    sortBy: 'followersCount'
  });

  // Mock data for demo purposes
  const mockInfluencers = [
    {
      id: 1,
      name: 'Sarah Johnson',
      bio: 'Fashion enthusiast and lifestyle blogger sharing daily outfit inspiration',
      location: 'New York, NY',
      profilePicture: null,
      totalFollowers: 15400,
      averageEngagementRate: 4.2,
      platformCount: 3,
      verifiedAccounts: 1,
      topPlatforms: [
        { platform: 'instagram', isVerified: true, followers: 12500 },
        { platform: 'tiktok', isVerified: false, followers: 2900 }
      ],
      applicationStats: {
        totalApplications: 8,
        successRate: 75
      }
    },
    {
      id: 2,
      name: 'Mike Chen',
      bio: 'Tech reviewer and gadget enthusiast. Honest reviews of the latest tech products.',
      location: 'San Francisco, CA',
      profilePicture: null,
      totalFollowers: 28900,
      averageEngagementRate: 3.8,
      platformCount: 2,
      verifiedAccounts: 0,
      topPlatforms: [
        { platform: 'youtube', isVerified: false, followers: 18200 },
        { platform: 'twitter', isVerified: false, followers: 10700 }
      ],
      applicationStats: {
        totalApplications: 12,
        successRate: 83
      }
    },
    {
      id: 3,
      name: 'Emma Rodriguez',
      bio: 'Health and wellness coach helping people live their best lives through nutrition and fitness.',
      location: 'Austin, TX',
      profilePicture: null,
      totalFollowers: 8750,
      averageEngagementRate: 5.1,
      platformCount: 4,
      verifiedAccounts: 2,
      topPlatforms: [
        { platform: 'instagram', isVerified: true, followers: 5200 },
        { platform: 'tiktok', isVerified: true, followers: 3550 }
      ],
      applicationStats: {
        totalApplications: 6,
        successRate: 100
      }
    }
  ];

  useEffect(() => {
    // Simulate API call
    setInfluencers(mockInfluencers);
  }, [filters, activeView]);

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toString() || '0';
  };

  const InfluencerCard = ({ influencer }) => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <div className="p-6">
        <div className="flex items-start space-x-4">
          <div className="relative flex-shrink-0">
            <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
              {influencer.profilePicture ? (
                <img
                  className="h-16 w-16 rounded-full object-cover"
                  src={influencer.profilePicture}
                  alt={influencer.name}
                />
              ) : (
                <UserGroupIcon className="h-8 w-8 text-gray-400" />
              )}
            </div>
            {influencer.verifiedAccounts > 0 && (
              <CheckBadgeIconSolid className="absolute -top-1 -right-1 h-5 w-5 text-blue-500" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {influencer.name}
              </h3>
              <button className="text-blue-600 hover:text-blue-500 text-sm font-medium">
                View Profile
              </button>
            </div>
            
            {influencer.bio && (
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                {influencer.bio}
              </p>
            )}
            
            {influencer.location && (
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <MapPinIcon className="h-4 w-4 mr-1" />
                {influencer.location}
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {formatNumber(influencer.totalFollowers)}
                </p>
                <p className="text-xs text-gray-500">Followers</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {influencer.averageEngagementRate}%
                </p>
                <p className="text-xs text-gray-500">Engagement</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {influencer.platformCount}
                </p>
                <p className="text-xs text-gray-500">Platforms</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {influencer.topPlatforms.map((platform, index) => (
                <div
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  <span className="capitalize">{platform.platform}</span>
                  {platform.isVerified && (
                    <CheckBadgeIcon className="ml-1 h-3 w-3" />
                  )}
                </div>
              ))}
            </div>

            {influencer.applicationStats && (
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>{influencer.applicationStats.totalApplications} applications</span>
                <span>{influencer.applicationStats.successRate}% success rate</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Discover Influencers</h1>
          <p className="mt-1 text-sm text-gray-600">
            Find and connect with the perfect influencers for your campaigns
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search influencers by name or bio..."
                />
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Platform Filter */}
            <div className="lg:w-48">
              <select
                value={filters.platform}
                onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Platforms</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="twitter">Twitter</option>
              </select>
            </div>

            {/* Location Filter */}
            <div className="lg:w-48">
              <input
                type="text"
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Location"
              />
            </div>

            {/* Sort */}
            <div className="lg:w-48">
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="followersCount">Sort by Followers</option>
                <option value="engagementRate">Sort by Engagement</option>
                <option value="createdAt">Sort by Recent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              {influencers.length} influencers found
            </p>
          </div>
        </div>

        {/* Influencer Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {influencers.map((influencer) => (
                <InfluencerCard key={influencer.id} influencer={influencer} />
              ))}
            </div>

            {/* Empty State */}
            {influencers.length === 0 && (
              <div className="text-center py-12">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No influencers found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search filters to find more influencers.
                </p>
              </div>
            )}
          </>
        )}

        {/* Demo Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Demo Mode
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  This is showing sample influencer data. In production, this would connect to the real influencer discovery API with thousands of profiles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfluencersPage;
