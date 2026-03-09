import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaChartBar, FaMusic, FaTrophy, FaFire, FaArrowLeft } from 'react-icons/fa';
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
    return <div className="page-container"><p>Моля, влезте в системата</p></div>;
  }

  if (loading) {
    return <div className="page-container"><p>Зареждане на статистика...</p></div>;
  }

  return (
    <div className="page-container stats-page">
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
            <div className="stat-value">{stats.topArtists?.length || 0}</div>
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
        <div className="stats-section">
          <h2><FaTrophy /> Топ артисти</h2>
          <div className="top-list scrollable">
            {stats?.topArtists?.map((artist: any, i: number) => (
              <div key={i} className="list-item">
                <div className="rank">{i + 1}</div>
                <div className="info">
                  <div className="name">{artist.name}</div>
                  <div className="count">{artist.playCount} слушания</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stats-section">
          <h2><FaMusic /> Топ песни</h2>
          <div className="top-list scrollable">
            {stats?.topSongs && stats.topSongs.length > 0 ? (
              stats.topSongs.map((song: any, i: number) => (
                <div key={i} className="list-item">
                  <div className="rank">{i + 1}</div>
                  <div className="info">
                    <div className="name">{song.name}</div>
                    <div className="count">{song.artist} · {song.playCount} слушания</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">Няма данни за песни</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
