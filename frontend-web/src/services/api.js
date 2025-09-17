import axios from 'axios';
import toast from 'react-hot-toast';

// API base configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Check if we're in GitHub Pages demo mode
const isGitHubPages = window.location.hostname === 'ajay9760.github.io';
const isDemoMode = isGitHubPages || process.env.REACT_APP_DEMO_MODE === 'true';

// Demo data for GitHub Pages
const demoData = {
  user: {
    id: 'demo-user-1',
    name: 'Demo User',
    email: 'demo@nanoinfluencer.com',
    role: 'brand',
    status: 'active'
  },
  campaigns: [
    {
      id: '1',
      title: 'Summer Fashion Collection',
      description: 'Promote our new summer fashion line to young adults',
      goal: 'awareness',
      budget: 5000,
      currency: 'USD',
      status: 'active',
      brand: { name: 'Fashion Forward', email: 'hello@fashionforward.com' }
    },
    {
      id: '2', 
      title: 'Tech Product Launch',
      description: 'Launch our new smartphone with tech influencers',
      goal: 'conversions',
      budget: 10000,
      currency: 'USD', 
      status: 'draft',
      brand: { name: 'TechCorp', email: 'marketing@techcorp.com' }
    }
  ],
  analytics: {
    stats: {
      totalCampaigns: 12,
      activeCampaigns: 5,
      totalBudget: 45000,
      approvedInfluencers: 23,
      totalFollowers: 150000,
      totalApplications: 8,
      potentialEarnings: 2500,
      averageEngagementRate: 4.2
    }
  }
};

// Demo API functions
const createDemoPromise = (data, delay = 500) => {
  return new Promise(resolve => {
    setTimeout(() => resolve({ data }), delay);
  });
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const tokenManager = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },
  clearTokens: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem('user');
  }
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = tokenManager.getRefreshToken();
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          tokenManager.setTokens(accessToken, newRefreshToken);

          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        tokenManager.clearTokens();
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      }
    }

    // Handle common error responses
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action.');
    } else if (error.response?.status === 404) {
      toast.error('Resource not found.');
    }

    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  register: async (userData) => {
    if (isDemoMode) {
      const user = { ...demoData.user, ...userData, id: 'demo-' + Date.now() };
      localStorage.setItem('user', JSON.stringify(user));
      return createDemoPromise({ user, accessToken: 'demo-token', refreshToken: 'demo-refresh' });
    }
    
    const response = await api.post('/auth/register', userData);
    const { user, accessToken, refreshToken } = response.data;
    
    tokenManager.setTokens(accessToken, refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  },

  login: async (credentials) => {
    if (isDemoMode) {
      const user = { ...demoData.user, email: credentials.email };
      localStorage.setItem('user', JSON.stringify(user));
      return createDemoPromise({ user, accessToken: 'demo-token', refreshToken: 'demo-refresh' });
    }
    
    const response = await api.post('/auth/login', credentials);
    const { user, accessToken, refreshToken } = response.data;
    
    
    tokenManager.setTokens(accessToken, refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  },

  logout: async () => {
    tokenManager.clearTokens();
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    
    // Update stored user data
    const updatedUser = response.data.user;
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    return response.data;
  },

  changePassword: async (passwordData) => {
    const response = await api.put('/auth/change-password', passwordData);
    return response.data;
  },

  googleLogin: async (googleData) => {
    const response = await api.post('/auth/google', googleData);
    const { user, accessToken, refreshToken } = response.data;
    
    tokenManager.setTokens(accessToken, refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  }
};

// Applications API
export const applicationsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/applications', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/applications/stats');
    return response.data;
  },

  applyToCampaign: async (campaignId, applicationData) => {
    const response = await api.post(`/applications/campaigns/${campaignId}`, applicationData);
    return response.data;
  },

  updateStatus: async (applicationId, statusData) => {
    const response = await api.put(`/applications/${applicationId}/status`, statusData);
    return response.data;
  },

  submitContent: async (applicationId, contentData) => {
    const response = await api.put(`/applications/${applicationId}/content`, contentData);
    return response.data;
  }
};

// Campaigns API
export const campaignsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/campaigns', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/campaigns/${id}`);
    return response.data;
  },

  create: async (campaignData) => {
    const response = await api.post('/campaigns', campaignData);
    return response.data;
  },

  update: async (id, campaignData) => {
    const response = await api.put(`/campaigns/${id}`, campaignData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/campaigns/${id}`);
    return response.data;
  }
};

// Influencers API (placeholder for future implementation)
export const influencersAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/influencers', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/influencers/${id}`);
    return response.data;
  },

  search: async (searchParams) => {
    const response = await api.get('/influencers/search', { params: searchParams });
    return response.data;
  }
};

// Analytics API
export const analyticsAPI = {
  getDashboardStats: async () => {
    if (isDemoMode) {
      return createDemoPromise(demoData.analytics);
    }
    
    const response = await api.get('/analytics/dashboard');
    return response.data;
  },

  getCampaignAnalytics: async (campaignId, startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get(`/analytics/campaigns/${campaignId}`, { params });
    return response.data;
  },

  getInfluencerAnalytics: async (platform, startDate, endDate) => {
    const params = {};
    if (platform) params.platform = platform;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get('/analytics/influencer', { params });
    return response.data;
  },

  addAnalytics: async (analyticsData) => {
    const response = await api.post('/analytics', analyticsData);
    return response.data;
  },

  getPerformanceComparison: async (timeframe, platforms, metricTypes) => {
    const params = { timeframe };
    if (platforms) params.platforms = platforms.join(',');
    if (metricTypes) params.metricTypes = metricTypes.join(',');
    
    const response = await api.get('/analytics/comparison', { params });
    return response.data;
  }
};

// Social Media API
export const socialMediaAPI = {
  getSocialAccounts: async () => {
    const response = await api.get('/social-media');
    return response.data;
  },

  addSocialAccount: async (accountData) => {
    const response = await api.post('/social-media', accountData);
    return response.data;
  },

  updateSocialAccount: async (id, accountData) => {
    const response = await api.put(`/social-media/${id}`, accountData);
    return response.data;
  },

  deleteSocialAccount: async (id) => {
    const response = await api.delete(`/social-media/${id}`);
    return response.data;
  },

  getSocialAccountById: async (id) => {
    const response = await api.get(`/social-media/${id}`);
    return response.data;
  },

  syncSocialAccount: async (id) => {
    const response = await api.post(`/social-media/${id}/sync`);
    return response.data;
  },

  getPlatformStats: async () => {
    const response = await api.get('/social-media/stats');
    return response.data;
  }
};

// Generic API utility functions
export const apiUtils = {
  handleApiError: (error) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || 'An error occurred';
      return { success: false, error: message, status: error.response.status };
    } else if (error.request) {
      // Request was made but no response received
      return { success: false, error: 'Network error. Please check your connection.' };
    } else {
      // Something else happened
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  },

  isAuthenticated: () => {
    return !!tokenManager.getAccessToken();
  }
};

export default api;