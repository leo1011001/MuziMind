import React, { useEffect, useState } from 'react';
import './MusicComponents.css';

export const MusicOverview: React.FC = () => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGuestStats();
  }, []);

  const fetchGuestStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/guest-stats`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching guest stats', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="glass-card">Зареждане на демонстрационни данни...</div>;

  if (!data) return <div className="glass-card">Няма данни за показване.</div>;

  return (
    <div className="glass-card music-overview">
      <h3>🎧 Демонстрационни данни ({data.username})</h3>
      <div className="overview-section">
        <h4>Топ изпълнители</h4>
        <ul>
          {data.topArtists.map((a: any, i: number) => (
            <li key={i}>{a.name} — {a.playCount}</li>
          ))}
        </ul>
      </div>

      <div className="overview-section">
        <h4>Последни слушания</h4>
        <ul>
          {data.recent.map((r: any, i: number) => (
            <li key={i}>{r.artist} — {r.name} {r.date ? `(${r.date})` : ''}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MusicOverview;
