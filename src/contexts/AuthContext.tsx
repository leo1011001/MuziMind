import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface User {
  id: string;
  username: string;
  email: string;
  lastfmUsername?: string;
  preferences: {
    language: 'bg' | 'en';
    theme: 'light' | 'dark';
  };
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, lastfmUsername?: string) => Promise<void>;
  logout: () => Promise<void>;
  syncWithLastFM: (lastfmUsername: string) => Promise<{ success: boolean; newScrobbles: number }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in (e.g., from localStorage or token)
    const checkAuth = async () => {
      try {
        // Call server to check session (uses cookies)
        const resp = await fetch(`${API_URL}/api/user`, { credentials: 'include' });
        if (resp.ok) {
          const userData = await resp.json();
          setUser(userData as User);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err && (err.error || err.message)) || 'Login failed');
      }

      const data = await response.json();
      // server returns user object
      setUser(data.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string, lastfmUsername?: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, lastfmUsername }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err && (err.error || err.message)) || 'Registration failed');
      }

      const data = await response.json();
      setUser(data.user || null);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const syncWithLastFM = async (lastfmUsername?: string) => {
    try {
      setLoading(true);
      // lastfmUsername can be passed for explicit syncing
      const response = await fetch(`${API_URL}/api/sync/lastfm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err && (err.error || err.message)) || 'Sync failed');
      }

      const data = await response.json();
      return { 
        success: true, 
        newScrobbles: data.newScrobbles || 0,
        syncedTracks: data.syncedTracks || 0,
        nowPlaying: data.nowPlaying
      };
    } catch (error) {
      console.error('Last.fm sync error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    syncWithLastFM,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};