import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface User {
  id: string;
  username: string;
  email: string;
  lastfmUsername?: string;
  role?: 'user' | 'admin';
  preferences: {
    language: 'bg' | 'en';
    theme: 'light' | 'dark';
  };
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, lastfmUsername?: string) => Promise<{ pending?: boolean; pendingVerification?: boolean; email?: string; message?: string }>;
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
    const checkAuth = async () => {
      try {
        const resp = await fetch(`${API_URL}/api/user`, { credentials: 'include' });
        if (resp.ok) {
          const userData = await resp.json();
          setUser(userData as User);
          // Cache for mobile Safari which blocks cross-site cookies
          sessionStorage.setItem('mz_user', JSON.stringify(userData));
        } else {
          // Cookie rejected (mobile Safari ITP) — fall back to sessionStorage cache
          const cached = sessionStorage.getItem('mz_user');
          if (cached) setUser(JSON.parse(cached) as User);
        }
      } catch {
        const cached = sessionStorage.getItem('mz_user');
        if (cached) setUser(JSON.parse(cached) as User);
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
        const error: any = new Error((err && (err.error || err.message)) || 'Login failed');
        if (err?.code) error.code = err.code;
        throw error;
      }

      const data = await response.json();
      setUser(data.user);
      sessionStorage.setItem('mz_user', JSON.stringify(data.user));
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
      if (data.pendingVerification) {
        return { pendingVerification: true, email: data.email, message: data.message };
      }
      if (data.pending) {
        return { pending: true, message: data.message };
      }
      setUser(data.user || null);
      return {};
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const syncWithLastFM = async (_lastfmUsername?: string) => {
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
      sessionStorage.removeItem('mz_user');
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