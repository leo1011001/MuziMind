import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaChartBar, FaMusic, FaTrophy, FaFire, FaArrowLeft, FaHeadphones } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './Stats.css';

export const StatsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (!user) return;
    
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/api/stats`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (!user) {
    return <div className="stats-page"><p>Моля, влезте в системата</p></div>;
  }

  if (loading) {
    return <div className="stats-page"><p>Зареждане на статистика...</p></div>;
  }

  return (
    <div className="stats-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <FaArrowLeft /> Назад
        </button>
        <h1><FaChartBar /> Твоята музикална статистика</h1>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card big">
            <div className="stat-icon"><FaMusic /></div>
            <div className="stat-value">{stats.totalScrobbles?.toLocaleString() || 0}</div>
            <div className="stat-label">Общо слушания</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><FaTrophy /></div>
            <div className="stat-value">{(stats.totalArtists ?? stats.topArtists?.length ?? 0).toLocaleString()}</div>
            <div className="stat-label">Любими артисти</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><FaFire /></div>
            <div className="stat-value">{(stats.listeningHours || []).indexOf(Math.max(...(stats.listeningHours || [0])))}:00</div>
            <div className="stat-label">Пиков час</div>
          </div>
        </div>
      )}

      <div className="stats-lists-grid">
        {/* Top Artists bar ranking */}
        {stats?.topArtists?.length > 0 && (
          <div className="glass-card stats-bar-section">
            <h2><FaTrophy /> Топ артисти</h2>
            <div className="stats-bar-list">
              {(() => {
                const artists = stats.topArtists.slice(0, 10);
                const max = artists[0]?.playCount || 1;
                return artists.map((a: any, i: number) => (
                  <div key={i} className="stats-bar-row">
                    <span className="stats-bar-rank">#{i + 1}</span>
                    <span className="stats-bar-label">{a.name}</span>
                    <div className="stats-bar-track">
                      <div className="stats-bar-fill" style={{ width: `${Math.round((a.playCount / max) * 100)}%` }} />
                    </div>
                    <span className="stats-bar-count">{a.playCount}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Top Songs bar ranking */}
        {stats?.topSongs?.length > 0 && (
          <div className="glass-card stats-bar-section">
            <h2><FaMusic /> Топ песни</h2>
            <div className="stats-bar-list">
              {(() => {
                const songs = stats.topSongs.slice(0, 9);
                const max = songs[0]?.playCount || 1;
                return songs.map((s: any, i: number) => (
                  <div key={i} className="stats-bar-row">
                    <span className="stats-bar-rank">#{i + 1}</span>
                    <span className="stats-bar-label">{s.name}<span className="stats-bar-sublabel"> · {s.artist}</span></span>
                    <div className="stats-bar-track">
                      <div className="stats-bar-fill" style={{ width: `${Math.round((s.playCount / max) * 100)}%` }} />
                    </div>
                    <span className="stats-bar-count">{s.playCount}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Top Genres bar chart */}
      {stats?.topTagsWithCounts?.length > 0 && (
        <div className="glass-card stats-bar-section stats-genres-section">
          <h2><FaHeadphones /> Топ жанрове</h2>
          <div className="stats-bar-list">
            {(() => {
              const tags = stats.topTagsWithCounts.slice(0, 8);
              const max = tags[0]?.count || 1;
              return tags.map((t: any, i: number) => (
                <div key={i} className="stats-bar-row">
                  <span className="stats-bar-label">{t.tag}</span>
                  <div className="stats-bar-track">
                    <div className="stats-bar-fill stats-bar-fill--genre" style={{ width: `${Math.round((t.count / max) * 100)}%` }} />
                  </div>
                  <span className="stats-bar-count">{t.count}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsPage;
