import axios from 'axios';
import toast from 'react-hot-toast';

// API base configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Check if we're in GitHub Pages demo mode
const isGitHubPages = window.location.hostname === 'ajay9760.github.io';
const isDemoMode = isGitHubPages || process.env.REACT_APP_DEMO_MODE === 'true';

// Enhanced demo mode detection
const isLiveDemo = isGitHubPages || window.location.hostname.includes('github.io');

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
  withCredentials: true, // Include httpOnly cookies in requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Secure token management - access tokens in memory, refresh tokens in httpOnly cookies
let accessToken = null;
let accessTokenExpiry = null;

export const tokenManager = {
  getAccessToken: () => {
    // Check if token is expired
    if (accessToken && accessTokenExpiry && new Date() >= accessTokenExpiry) {
      accessToken = null;
      accessTokenExpiry = null;
    }
    return accessToken;
  },
  
  setAccessToken: (token, expiresIn = '15m') => {
    accessToken = token;
    // Parse expires in (e.g., '15m', '1h', '7d')
    const duration = parseDuration(expiresIn);
    accessTokenExpiry = new Date(Date.now() + duration);
  },
  
  clearTokens: () => {
    accessToken = null;
    accessTokenExpiry = null;
    localStorage.removeItem('user');
  },
  
  isTokenExpired: () => {
    return !accessToken || (accessTokenExpiry && new Date() >= accessTokenExpiry);
  }
};

// Helper function to parse duration strings
const parseDuration = (duration) => {
  const units = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000
  };
  
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 15 * 60 * 1000; // Default to 15 minutes
  }
  
  const [, value, unit] = match;
  return parseInt(value) * units[unit];
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
        // Try to refresh token (refresh token is in httpOnly cookie)
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
          withCredentials: true
        });

        const { accessToken, accessTokenExpiresIn } = response.data;
        tokenManager.setAccessToken(accessToken, accessTokenExpiresIn);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        // Refresh failed, redirect to login
        tokenManager.clearTokens();
        
        // Only redirect if not already on auth page
        if (!window.location.pathname.includes('/auth')) {
          window.location.href = '/auth';
        }
        
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
      tokenManager.setAccessToken('demo-token', '15m');
      return createDemoPromise({ user, accessToken: 'demo-token' });
    }
    
    const response = await api.post('/auth/register', userData);
    const { user, accessToken, accessTokenExpiresIn } = response.data;
    
    // Store access token in memory and refresh token is in httpOnly cookie
    tokenManager.setAccessToken(accessToken, accessTokenExpiresIn);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  },

  login: async (credentials) => {
    if (isDemoMode) {
      const user = { ...demoData.user, email: credentials.email };
      localStorage.setItem('user', JSON.stringify(user));
      tokenManager.setAccessToken('demo-token', '15m');
      return createDemoPromise({ user, accessToken: 'demo-token' });
    }
    
    const response = await api.post('/auth/login', credentials);
    const { user, accessToken, accessTokenExpiresIn } = response.data;
    
    // Store access token in memory and refresh token is in httpOnly cookie
    tokenManager.setAccessToken(accessToken, accessTokenExpiresIn);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  },

  logout: async () => {
    try {
      // Call logout endpoint to revoke refresh token
      await api.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if request fails
      console.warn('Logout request failed:', error);
    } finally {
      tokenManager.clearTokens();
    }
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
    const { user, accessToken, accessTokenExpiresIn } = response.data;
    
    // Store access token in memory and refresh token is in httpOnly cookie
    tokenManager.setAccessToken(accessToken, accessTokenExpiresIn);
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

// File Upload API
export const uploadAPI = {
  // Get upload limits and allowed file types
  getUploadLimits: async () => {
    const response = await api.get('/uploads/limits');
    return response.data;
  },

  // Validate file before upload
  validateFile: async (fileName, fileSize, contentType) => {
    const response = await api.post('/uploads/validate', {
      fileName,
      fileSize,
      contentType
    });
    return response.data;
  },

  // Get presigned upload URL
  getUploadUrl: async (fileName, fileSize, contentType) => {
    const response = await api.post('/uploads/sign-upload', {
      fileName,
      fileSize,
      contentType
    });
    return response.data;
  },

  // Upload file to S3 using presigned URL
  uploadToS3: async (uploadData, file, onProgress) => {
    const formData = new FormData();
    
    // Add all the fields from presigned post
    Object.keys(uploadData.fields).forEach(key => {
      formData.append(key, uploadData.fields[key]);
    });
    
    // Add the file last
    formData.append('file', file);
    
    // Upload directly to S3
    const uploadResponse = await axios.post(uploadData.uploadUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });
    
    return uploadResponse;
  },

  // Complete upload and trigger virus scan
  completeUpload: async (key, metadata = {}) => {
    const response = await api.post('/uploads/complete', {
      key,
      metadata
    });
    return response.data;
  },

  // Get file download URL
  getDownloadUrl: async (key, expiresIn = 3600) => {
    const response = await api.get(`/uploads/download/${encodeURIComponent(key)}`, {
      params: { expiresIn }
    });
    return response.data;
  },

  // Delete file
  deleteFile: async (key) => {
    const response = await api.delete(`/uploads/${encodeURIComponent(key)}`);
    return response.data;
  },

  // List user files
  listFiles: async (maxKeys = 100) => {
    const response = await api.get('/uploads', {
      params: { maxKeys }
    });
    return response.data;
  },

  // Complete file upload flow (validate → get URL → upload → complete)
  uploadFile: async (file, onProgress) => {
    try {
      // Step 1: Validate file
      await uploadAPI.validateFile(file.name, file.size, file.type);
      
      // Step 2: Get presigned upload URL
      const uploadData = await uploadAPI.getUploadUrl(file.name, file.size, file.type);
      
      // Step 3: Upload to S3
      await uploadAPI.uploadToS3(uploadData.uploadData, file, onProgress);
      
      // Step 4: Complete upload and trigger scan
      const result = await uploadAPI.completeUpload(uploadData.uploadData.key);
      
      return {
        success: true,
        key: uploadData.uploadData.key,
        fileName: uploadData.uploadData.fileName,
        ...result
      };
      
    } catch (error) {
      throw error;
    }
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
    return !!tokenManager.getAccessToken() && !tokenManager.isTokenExpired();
  }
};

export default api;