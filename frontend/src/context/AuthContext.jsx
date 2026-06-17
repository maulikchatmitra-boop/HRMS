import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient, { setAccessToken, getAccessToken } from '../api/axiosClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Restore session on app load
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await axiosClient.post('/auth/refresh-token');
        const token = res.data.data.accessToken;
        setAccessToken(token);
        setUser(res.data.data.user);
        setIsAuthenticated(true);
      } catch (err) {
        setAccessToken('');
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();

    // Listen for global logout events (from axiosClient interceptor on failed refresh)
    const handleGlobalLogout = () => {
      setAccessToken('');
      setUser(null);
      setIsAuthenticated(false);
    };

    window.addEventListener('auth-logout', handleGlobalLogout);
    return () => {
      window.removeEventListener('auth-logout', handleGlobalLogout);
    };
  }, []);

  const login = async (email, password, companyCode = '') => {
    try {
      const res = await axiosClient.post('/auth/login', {
        email,
        password,
        companyCode: companyCode || undefined,
      });

      const token = res.data.data.accessToken;
      setAccessToken(token);
      setUser(res.data.data.user);
      setIsAuthenticated(true);
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setAccessToken('');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await axiosClient.put('/auth/profile', profileData);
      if (res.data.success) {
        setUser((prev) => ({
          ...prev,
          ...res.data.data,
        }));
      }
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  const refreshPermissions = async () => {
    try {
      const res = await axiosClient.post('/auth/refresh-token');
      const token = res.data.data.accessToken;
      setAccessToken(token);
      setUser(res.data.data.user);
      setIsAuthenticated(true);
      return res.data.data.user;
    } catch (err) {
      console.error('Failed to refresh permissions:', err);
    }
  };

  const value = {
    user,
    setUser,
    isAuthenticated,
    loading,
    login,
    logout,
    updateProfile,
    refreshPermissions,
    accessToken: getAccessToken(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
