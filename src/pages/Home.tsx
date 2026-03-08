import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RecentScrobbles } from '../components/music/RecentScrobbles';
import { DailyReading } from '../components/reading/DailyReading';
import { QuickStats } from '../components/stats/QuickStats';
import { MusicPrediction } from '../components/music/MusicPrediction';
import { NowPlaying } from '../components/music/NowPlaying';
import { UserListeningHistory } from '../components/music/UserListeningHistory';
import { MusicOverview } from '../components/music/MusicOverview';
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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (user) fetchUserStats();
    else setLoading(false); // show guest content when not logged in
  }, [user]);

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
        await fetchUserStats(); // Refresh stats
        alert(`✅ Синхронизирано успешно! Добавени ${result.newScrobbles} нови песни.`);
      }
    } catch (error) {
      alert('❌ Грешка при синхронизация: ' + (error as Error).message);
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
      <div className="page-container center-content">
        <div className="glass-spinner"></div>
        <p className="loading-text">Зареждаме твоята музикална вселена...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="home-header">
        <div className="header-left">
          <h1 className="welcome-title">🎵 {getGreeting()}</h1>
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
                🔄 Синхронизирай
              </>
            )}
          </button>
          
          {lastSynced && (
            <div className="last-sync">
              Последна синхронизация:{' '}
              {lastSynced.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {!user?.lastfmUsername && (
        <div className="glass-card warning-card fade-in">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h3>Свържи Last.fm</h3>
            <p>
              Свържи своя Last.fm профил, за да видиш историята си на слушане и да получиш персонализирани прозрения.
            </p>
            <button 
              className="glass-button primary"
              onClick={() => window.location.href = '/profile?tab=connections'}
            >
              🔗 Свържи сега
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

      {/* Stats Overview */}
      {stats && (
        <div className="stats-overview glass-card fade-in">
          <h2>📊 Преглед на слушането</h2>
          
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{stats.totalScrobbles.toLocaleString()}</div>
              <div className="stat-label">Общо слушания</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-value">{stats.topArtists.length}</div>
              <div className="stat-label">Любими изпълнители</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-value">
                {stats.listeningHours ? Math.max(...stats.listeningHours) : 0}
              </div>
              <div className="stat-label">Пикови слушания</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;