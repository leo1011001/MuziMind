import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { RecentScrobbles } from '../../components/music/RecentScrobbles';
import { DailyReading } from '../../components/reading/DailyReading';
import { QuickStats } from '../../components/stats/QuickStats';
import { MusicPrediction } from '../../components/music/MusicPrediction';
import { NowPlaying } from '../../components/music/NowPlaying';
import { UserListeningHistory } from '../../components/music/UserListeningHistory';
import { FaMusic, FaSync, FaExclamationTriangle, FaLink, FaCheckCircle, FaTimesCircle, FaChartBar, FaRobot, FaHeadphones, FaUserPlus, FaSignInAlt, FaStar, FaGlobe, FaLastfm } from 'react-icons/fa';
import './Home.css';

interface HomeStats {
  totalScrobbles: number;
  topArtists: Array<{ name: string; playCount: number }>;
  listeningHours: number[];
  recentScrobbles: any[];
}

const GuestLanding: React.FC = () => {
  return (
    <div className="guest-landing">
      {/* Hero */}
      <div className="guest-hero">
        <div className="guest-hero-icon"><FaMusic /></div>
        <h1 className="guest-hero-title">Добре дошъл в MuziMind</h1>
        <p className="guest-hero-subtitle">
          Твоята персонализирана музикална вселена. Анализ на вкуса, AI прогнози и истории за любимите ти артисти.
        </p>
        <div className="guest-hero-actions">
          <a href="/login?tab=register" className="glass-button primary guest-cta-btn">
            <FaUserPlus /> Създай акаунт
          </a>
          <a href="/login" className="glass-button guest-cta-btn">
            <FaSignInAlt /> Влез
          </a>
        </div>
      </div>

      {/* Feature cards */}
      <div className="guest-features">
        <div className="guest-feature-card glass-card">
          <div className="guest-feature-icon" style={{ color: '#a78bfa' }}><FaChartBar /></div>
          <h3>Музикална статистика</h3>
          <p>Топ артисти, песни, жанрове и пиков час на слушане — всичко визуализирано от твоя Last.fm профил.</p>
        </div>
        <div className="guest-feature-card glass-card">
          <div className="guest-feature-icon" style={{ color: '#34d399' }}><FaRobot /></div>
          <h3>AI Дневен прочит</h3>
          <p>Персонализиран текст генериран от AI всеки ден на български език, базиран на музикалния ти вкус.</p>
        </div>
        <div className="guest-feature-card glass-card">
          <div className="guest-feature-icon" style={{ color: '#fb923c' }}><FaHeadphones /></div>
          <h3>Artist Stories</h3>
          <p>Карусел "сторита" с биографии, снимки и информация за любимите ти изпълнители.</p>
        </div>
        <div className="guest-feature-card glass-card">
          <div className="guest-feature-icon" style={{ color: '#f472b6' }}><FaStar /></div>
          <h3>AI Прогнози</h3>
          <p>Умни препоръки за нови артисти и жанрове, базирани на твоите музикални навици.</p>
        </div>
        <div className="guest-feature-card glass-card">
          <div className="guest-feature-icon" style={{ color: '#60a5fa' }}><FaGlobe /></div>
          <h3>Last.fm интеграция</h3>
          <p>Свържи своя Last.fm профил и MuziMind автоматично синхронизира цялата ти история на слушане.</p>
        </div>
        <div className="guest-feature-card glass-card">
          <div className="guest-feature-icon" style={{ color: '#fbbf24' }}><FaMusic /></div>
          <h3>NowPlaying</h3>
          <p>Виж в реално време коя песен слушаш в момента — обновява се автоматично на всеки 15 секунди.</p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="guest-bottom-cta glass-card">
        <h2>Готов да започнеш?</h2>
        <p>Свържи своя Last.fm и открий музикалната си личност.</p>
        <a href="/login?tab=register" className="glass-button primary">
          <FaUserPlus /> Регистрирай се безплатно
        </a>
      </div>
    </div>
  );
};

export const Home: React.FC = () => {
  const { user, syncWithLastFM } = useAuth();
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [syncSuccess, setSyncSuccess] = useState<boolean>(true);

  // Last.fm connect modal
  const [showLastfmModal, setShowLastfmModal] = useState(false);
  const [lastfmInput, setLastfmInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (user) {
      autoSync();
      fetchUserStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const autoSync = async () => {
    if (!user?.lastfmUsername) return;
    try {
      const result = await syncWithLastFM(user.lastfmUsername);
      if (result?.success) {
        setLastSynced(new Date());
        setSyncSuccess(true);
        setSyncMessage(`Синхронизирано! Добавени ${result.newScrobbles || 0} нови записа.`);
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
      const response = await fetch(`${API_URL}/api/stats`, { credentials: 'include' });
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
        setSyncMessage(`Синхронизирано! Добавени ${result.newScrobbles || 0} нови записа.`);
        await fetchUserStats();
        setTimeout(() => setSyncMessage(''), 5000);
      }
    } catch (error) {
      setSyncSuccess(false);
      setSyncMessage(`Грешка: ${(error as Error).message}`);
      setTimeout(() => setSyncMessage(''), 5000);
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectLastfm = async () => {
    if (!lastfmInput.trim()) return;
    setConnecting(true);
    setConnectMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/profile/lastfm`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastfmUsername: lastfmInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setConnectMsg({ text: `✓ Свързан с ${data.lastfmUsername}! Синхронизираме...`, ok: true });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setConnectMsg({ text: data.error || 'Грешка при свързване', ok: false });
      }
    } catch {
      setConnectMsg({ text: 'Грешка при свързване', ok: false });
    } finally {
      setConnecting(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.username || 'гост';
    if (hour < 12) return `Добро утро, ${name}!`;
    if (hour < 18) return `Добър ден, ${name}!`;
    return `Добър вечер, ${name}!`;
  };

  // Guest view
  if (!user) return <GuestLanding />;

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
          <p className="welcome-subtitle">Твоето музикално пътешествие продължава тук...</p>
        </div>

        <div className="header-right">
          <button
            onClick={handleSync}
            disabled={syncing || !user?.lastfmUsername}
            className="glass-button sync-button"
          >
            {syncing ? (
              <><span className="spinner"></span>Синхронизиране...</>
            ) : (
              <><FaSync /> Синхронизирай</>
            )}
          </button>

          {lastSynced && (
            <div className="last-sync">
              Последна синхронизация: {lastSynced.toLocaleTimeString()}
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
            <p>Свържи своя Last.fm профил, за да видиш историята си на слушане и да получиш персонализирани прозрения.</p>
            <button className="glass-button primary" onClick={() => { setShowLastfmModal(true); setConnectMsg(null); setLastfmInput(''); }}>
              <FaLink /> Свържи сега
            </button>
          </div>
        </div>
      )}

      {/* Last.fm connect modal */}
      {showLastfmModal && (
        <div className="pw-modal-overlay" onClick={() => !connecting && setShowLastfmModal(false)}>
          <div className="pw-modal glass-card" onClick={e => e.stopPropagation()}>
            <h3><FaLastfm /> Свържи Last.fm профил</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: '0 0 1.25rem' }}>
              Въведи Last.fm потребителското си име. Ще го проверим и ще го запишем в профила ти.
            </p>
            <div className="profile-form">
              <div className="form-group">
                <label>Last.fm потребителско име</label>
                <input
                  type="text"
                  value={lastfmInput}
                  onChange={e => setLastfmInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !connecting && handleConnectLastfm()}
                  placeholder="напр. leo1011001"
                  autoFocus
                  disabled={connecting}
                />
              </div>

              {connectMsg && (
                <div className={`profile-message ${connectMsg.ok ? 'success' : 'error'}`}>
                  {connectMsg.ok ? <FaCheckCircle /> : <FaTimesCircle />} {connectMsg.text}
                </div>
              )}

              <div className="profile-form-actions">
                <button
                  className="glass-button save-btn"
                  onClick={handleConnectLastfm}
                  disabled={connecting || !lastfmInput.trim()}
                >
                  <FaLastfm /> {connecting ? 'Проверяване...' : 'Свържи'}
                </button>
                <button className="glass-button" onClick={() => setShowLastfmModal(false)} disabled={connecting}>
                  Отказ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="home-grid">
        <div className="grid-left">
          <NowPlaying />
          <DailyReading userId={user?.id || ''} />
        </div>
        <div className="grid-right">
          <QuickStats stats={stats} />
          <MusicPrediction />
          <RecentScrobbles scrobbles={stats?.recentScrobbles || []} language="bg" />
        </div>
      </div>

      <div className="listening-history-section">
        <UserListeningHistory />
      </div>
    </div>
  );
};

export default Home;
