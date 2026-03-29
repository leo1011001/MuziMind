import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { RecentScrobbles } from '../../components/music/RecentScrobbles';
import { DailyReading } from '../../components/reading/DailyReading';
import { QuickStats } from '../../components/stats/QuickStats';
import { MusicPrediction } from '../../components/music/MusicPrediction';
import { NowPlaying } from '../../components/music/NowPlaying';
import { UserListeningHistory } from '../../components/music/UserListeningHistory';
import { MusicOverview } from '../../components/music/MusicOverview';
import { FaMusic, FaSync, FaExclamationTriangle, FaLink, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import './Home.css';

interface HomeStats {
  totalScrobbles: number;
  topArtists: Array<{ name: string; playCount: number }>;
  listeningHours: number[];
  recentScrobbles: any[];
}

export const Home: React.FC = () => {
  const { user, syncWithLastFM } = useAuth();
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [syncSuccess, setSyncSuccess] = useState<boolean>(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (user) {
      // Auto-sync on login
      autoSync();
      fetchUserStats();
    } else {
      setLoading(false); // show guest content when not logged in
    }
  }, [user]);

  const autoSync = async () => {
    if (!user?.lastfmUsername) return;
    
    try {
      const result = await syncWithLastFM(user.lastfmUsername);
      if (result?.success) {
        setLastSynced(new Date());
        setSyncSuccess(true);
        setSyncMessage(`Auto-synced! Added ${result.newScrobbles || 0} new tracks.`);
        setTimeout(() => setSyncMessage(''), 5000);
      }
    } catch (error) {
      console.log('Auto-sync skipped:', error);
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/stats`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!user?.lastfmUsername) {
      alert('Моля, свържете вашия Last.fm профил първо в настройките.');
      return;
    }

    setSyncing(true);
    try {
      const result = await syncWithLastFM(user.lastfmUsername!);
      if (result?.success) {
        setLastSynced(new Date());
        setSyncSuccess(true);
        setSyncMessage(`Synced successfully! Added ${result.newScrobbles || 0} new tracks.`);
        await fetchUserStats(); // Refresh stats
        setTimeout(() => setSyncMessage(''), 5000);
      }
    } catch (error) {
      setSyncSuccess(false);
      setSyncMessage(`Sync error: ${(error as Error).message}`);
      setTimeout(() => setSyncMessage(''), 5000);
    } finally {
      setSyncing(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return `Добро утро, ${user?.username}!`;
    if (hour < 18) return `Добър ден, ${user?.username}!`;
    return `Добър вечер, ${user?.username}!`;
  };

  if (loading) {
    return (
      <div className="center-content">
        <div className="glass-spinner"></div>
        <p className="loading-text">Зареждаме твоята музикална вселена...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="home-header">
        <div className="header-left">
          <h1 className="welcome-title"><FaMusic /> {getGreeting()}</h1>
          <p className="welcome-subtitle">
            Твоето музикално пътешествие продължава тук...
          </p>
        </div>
        
        <div className="header-right">
          {/* LanguageToggle removed */}
          
          <button 
            onClick={handleSync}
            disabled={syncing || !user?.lastfmUsername}
            className="glass-button sync-button"
          >
            {syncing ? (
              <>
                <span className="spinner"></span>
                Синхронизиране...
              </>
            ) : (
              <>
                <FaSync /> Синхронизирай
              </>
            )}
          </button>
          
          {lastSynced && (
            <div className="last-sync">
              Последна синхронизация:{' '}
              {lastSynced.toLocaleTimeString()}
            </div>
          )}

          {syncMessage && (
            <div className={`sync-message ${syncSuccess ? 'success' : 'error'}`}>
              {syncSuccess ? <FaCheckCircle /> : <FaTimesCircle />} {syncMessage}
            </div>
          )}
        </div>
      </div>

      {!user?.lastfmUsername && (
        <div className="glass-card warning-card fade-in">
          <div className="warning-icon"><FaExclamationTriangle /></div>
          <div className="warning-content">
            <h3>Свържи Last.fm</h3>
            <p>
              Свържи своя Last.fm профил, за да видиш историята си на слушане и да получиш персонализирани прозрения.
            </p>
            <button 
              className="glass-button primary"
              onClick={() => window.location.href = '/profile?tab=connections'}
            >
              <FaLink /> Свържи сега
            </button>
          </div>
        </div>
      )}

      <div className="home-grid">
        {!user && (
          <div className="guest-column">
            <MusicOverview />
          </div>
        )}
        {/* Left Column */}
        <div className="grid-left">
          <NowPlaying />
          
          <DailyReading 
            userId={user?.id || ''}
          />
        </div>

        {/* Right Column */}
        <div className="grid-right">
          <QuickStats 
            stats={stats}
          />

          {user && (
            <MusicPrediction />
          )}
          
          <RecentScrobbles 
            scrobbles={stats?.recentScrobbles || []}
            language="bg"
          />
        </div>
      </div>

      {/* Listening History - Shows what user listened to */}
      {user && (
        <div className="listening-history-section">
          <UserListeningHistory />
        </div>
      )}
    </div>
  );
};

export default Home;
