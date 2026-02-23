import React, { useEffect, useState } from 'react';
import './MusicComponents.css';

export const MusicPrediction: React.FC = () => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [prediction, setPrediction] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPrediction();
  }, []);

  const fetchPrediction = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/predict`, {
        credentials: 'include'
      });
      if (res.ok) {
        const json = await res.json();
        setPrediction(json);
      } else {
        const err = await res.json().catch(() => ({}));
        console.warn('Prediction fetch failed', err);
      }
    } catch (e) {
      console.error('Error fetching prediction', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="glass-card">Генерирам вашата ежедневна прогноза...</div>;
  if (!prediction) return <div className="glass-card">Няма прогнозни данни.</div>;

  return (
    <div className="glass-card music-prediction">
      <h3>🔮 Дневна прогноза</h3>
      <p>{prediction.dailyPrediction}</p>
      <h4>Препоръчани артисти</h4>
      <ul>
        {prediction.recommendedArtists?.map((a: any, i: number) => (
          <li key={i}>{a.name} ({a.score})</li>
        ))}
      </ul>
    </div>
  );
};

export default MusicPrediction;
