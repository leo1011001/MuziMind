import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authFetch } from '../utils/authFetch';

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
        // authFetch sends the session cookie AND the Bearer JWT (if stored),
        // so this works on both desktop (cookie) and Safari ITP (JWT).
        const resp = await authFetch(`${API_URL}/api/user`);
        if (resp.ok) {
          const userData = await resp.json();
          setUser(userData as User);
          sessionStorage.setItem('mz_user', JSON.stringify(userData));
        } else {
          // Server says not authenticated — clear stale cache so the user
          // sees the login page rather than a broken authenticated UI.
          sessionStorage.removeItem('mz_user');
          localStorage.removeItem('mz_token');
          setUser(null);
        }
      } catch {
        // Network error — use cached user optimistically
        const cached = sessionStorage.getItem('mz_user');
        if (cached) {
          try { setUser(JSON.parse(cached) as User); } catch { /* ignore */ }
        }
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
      // Store JWT so Safari ITP users can authenticate subsequent API calls
      // via the Authorization: Bearer header (authFetch adds it automatically).
      if (data.token) {
        localStorage.setItem('mz_token', data.token);
      }
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
    // Do NOT touch the global `loading` flag — this runs in the background.
    try {
      const response = await authFetch(`${API_URL}/api/sync/lastfm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    }
  };

  const logout = async () => {
    // Clear state immediately so the UI transitions to the login page at once.
    setUser(null);
    sessionStorage.removeItem('mz_user');
    localStorage.removeItem('mz_token');
    // Fire server-side session destruction in the background.
    fetch(`${API_URL}/api/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
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
