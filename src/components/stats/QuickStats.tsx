import React from 'react';
import { FaChartBar, FaMusic, FaMicrophone, FaClock, FaCompactDisc, FaCrown } from 'react-icons/fa';
import './StatsComponents.css';

interface QuickStatsProps {
  stats: any;
  language?: string;
}

export const QuickStats: React.FC<QuickStatsProps> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="glass-card quick-stats">
        <h3><FaChartBar /> Бързи статистики</h3>
        <p className="no-stats-text">Няма налични данни. Синхронизирай Last.fm профила си.</p>
      </div>
    );
  }

  const totalScrobbles = stats.totalScrobbles || 0;
  const topArtistsCount = stats.topArtists?.length || 0;
  const topSongsCount = stats.topSongs?.length || 0;

  // Find peak listening hour
  const listeningHours: number[] = stats.listeningHours || [];
  let peakHour = 0;
  let peakCount = 0;
  listeningHours.forEach((count: number, hour: number) => {
    if (count > peakCount) {
      peakCount = count;
      peakHour = hour;
    }
  });

  // Top artist
  const topArtist = stats.topArtists?.[0];

  return (
    <div className="glass-card quick-stats">
      <h3><FaChartBar /> Бързи статистики</h3>
      <div className="stats-items">
        <div className="stat-card">
          <div className="stat-icon"><FaMusic /></div>
          <div className="stat-info">
            <div className="stat-value">{totalScrobbles.toLocaleString()}</div>
            <div className="stat-label">Общо слушания</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><FaMicrophone /></div>
          <div className="stat-info">
            <div className="stat-value">{topArtistsCount}</div>
            <div className="stat-label">Изпълнители</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><FaClock /></div>
          <div className="stat-info">
            <div className="stat-value">{peakHour}:00 ч.</div>
            <div className="stat-label">Пиков час</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><FaCompactDisc /></div>
          <div className="stat-info">
            <div className="stat-value">{topSongsCount}</div>
            <div className="stat-label">Топ песни</div>
          </div>
        </div>

        {topArtist && (
          <div className="stat-card highlight">
            <div className="stat-icon"><FaCrown /></div>
            <div className="stat-info">
              <div className="stat-value">{topArtist.name}</div>
              <div className="stat-label">{topArtist.playCount} слушания</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
