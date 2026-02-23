import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaHandSparkles, FaArrowLeft, FaMusic, FaClock } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './Recommendations.css';

export const RecommendationsExpanded: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (!user) return;

    const fetchPrediction = async () => {
      try {
        const res = await fetch(`${API_URL}/api/predict`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setPrediction(data);
        }
      } catch (error) {
        console.error('Error fetching prediction:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrediction();
  }, [user]);

  if (!user) {
    return <div className="page-container"><p>Моля, влезте в системата</p></div>;
  }

  if (loading) {
    return <div className="page-container"><p>Генериране на персонализирани препоръки...</p></div>;
  }

  return (
    <div className="page-container recommendations-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <FaArrowLeft /> Назад
        </button>
        <h1><FaHandSparkles /> Твоя дневна прогноза</h1>
      </div>

      {prediction && (
        <>
          <div className="prediction-card featured">
            <div className="card-icon"><FaHandSparkles /></div>
            <h2>Дневна прогноза</h2>
            <p className="prediction-text">{prediction.dailyPrediction}</p>
          </div>

          <div className="section peak-hour">
            <h2><FaClock /> Твой пиков час</h2>
            <div className="peak-display">
              <div className="peak-time">{prediction.peakHour}:00</div>
              <p>Това е часът на дня, когато обикновено слушаш най-много музика</p>
            </div>
          </div>

          <div className="section recommendations">
            <h2><FaMusic /> Препоръчани артисти</h2>
            <div className="artist-grid">
              {prediction.recommendedArtists?.map((artist: any, i: number) => (
                <div key={i} className="artist-card">
                  <div className="artist-rank">#{i + 1}</div>
                  <div className="artist-name">{artist.name}</div>
                  <div className="artist-score">Оценка: {artist.score}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RecommendationsExpanded;
