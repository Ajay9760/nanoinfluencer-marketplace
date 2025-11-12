import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, apiUtils, tokenManager } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (from localStorage) 
    // and if access token is still valid or can be refreshed
    const checkAuthState = async () => {
      try {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          
          // Check if we have a valid access token or can refresh it
          if (apiUtils.isAuthenticated()) {
            setUser(parsedUser);
          } else {
            // Try to refresh token silently
            try {
              const response = await authAPI.getProfile();
              setUser(response.user);
            } catch (error) {
              // Refresh failed, clear user data
              localStorage.removeItem('user');
              tokenManager.clearTokens();
            }
          }
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        localStorage.removeItem('user');
        tokenManager.clearTokens();
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthState();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      setUser(response.user);
      return { success: true, user: response.user };
    } catch (error) {
      const errorResult = apiUtils.handleApiError(error);
      return { success: false, error: errorResult.error };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, userType) => {
    setLoading(true);
    try {
      const response = await authAPI.register({
        name,
        email,
        password,
        role: userType
      });
      setUser(response.user);
      return { success: true, user: response.user };
    } catch (error) {
      const errorResult = apiUtils.handleApiError(error);
      return { success: false, error: errorResult.error };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // console.error('Logout error:', error); // ESLint: no-console
    } finally {
      setUser(null);
      tokenManager.clearTokens();
    }
  };

  const googleLogin = async (credential, userType = 'brand') => {
    setLoading(true);
    try {
      const response = await authAPI.googleLogin({ credential, role: userType });
      setUser(response.user);
      return { success: true, user: response.user };
    } catch (error) {
      const errorResult = apiUtils.handleApiError(error);
      return { success: false, error: errorResult.error };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    googleLogin,
    isAuthenticated: !!user && apiUtils.isAuthenticated(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};