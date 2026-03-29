import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaHatWizard, FaFire, FaBolt, FaHeadphones, FaMicrophone, FaMusic, FaClock, FaChartBar, FaSun, FaCloudSun, FaCloudMoon, FaMoon } from 'react-icons/fa';
import './Recommendations.css';

const intensityLabels: Record<string, string> = {
  passionate: 'Страстен слушател',
  active: 'Активен слушател',
  regular: 'Слушател',
};

const intensityIcons: Record<string, React.ReactNode> = {
  passionate: <FaFire />,
  active: <FaBolt />,
  regular: <FaHeadphones />,
};

const timeIcons: Record<string, React.ReactNode> = {
  sunrise: <FaSun />,
  sun: <FaSun />,
  'cloud-sun': <FaCloudSun />,
  afternoon: <FaSun />,
  sunset: <FaCloudSun />,
  moon: <FaCloudMoon />,
  night: <FaMoon />,
};

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
    return (
      <div className="recommendations-page">
        <p className="auth-prompt">Моля, влезте в системата</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="recommendations-page">
        <div className="rec-loading">
          <div className="rec-loading-spinner"></div>
          <p>Генериране на персонализирани препоръки...</p>
        </div>
      </div>
    );
  }

  const ctx = prediction?.currentTimeContext;
  const patterns = prediction?.listeningPatterns;
  const intensityLabel = intensityLabels[prediction?.intensityLevel] || 'Слушател';
  const intensityIcon = intensityIcons[prediction?.intensityLevel] || <FaHeadphones />;

  return (
    <div className="recommendations-page">
      <div className="rec-header">
        <button className="glass-button back-btn" onClick={() => navigate('/')}>
          ← Назад към начало
        </button>
        <h1><FaHatWizard /> Твоя дневна прогноза</h1>
        {ctx && (
          <div className="rec-time-info">
            {timeIcons[ctx.emoji] || <FaClock />} {ctx.period} · {intensityIcon} {intensityLabel}
          </div>
        )}
      </div>

      {prediction && (
        <div className="rec-content">
          {/* Prediction Card */}
          <div className="glass-card rec-prediction-card">
            <div className="rec-prediction-icon"><FaHatWizard /></div>
            <h2>Дневна прогноза</h2>
            <p className="rec-prediction-text">{prediction.dailyPrediction}</p>
          </div>

          {/* Peak Hour */}
          <div className="glass-card rec-peak-section">
            <h2><FaClock /> Твой пиков час</h2>
            <div className="rec-peak-display">
              <div className="rec-peak-time">{prediction.peakHour}:00 ч.</div>
              <p>Това е часът, когато обикновено слушаш най-много музика</p>
              {prediction.secondPeak !== undefined && prediction.secondPeak !== prediction.peakHour && (
                <p className="rec-second-peak">Втори пиков час: {prediction.secondPeak}:00 ч.</p>
              )}
            </div>
          </div>

          {/* Listening Patterns */}
          {patterns && (
            <div className="glass-card rec-patterns-section">
              <h2><FaChartBar /> Модел на слушане</h2>
              <div className="rec-patterns-grid">
                <div className="rec-pattern-item">
                  <span className="rec-pattern-emoji"><FaSun /></span>
                  <span className="rec-pattern-label">Сутрин</span>
                  <span className="rec-pattern-value">{patterns.morning}</span>
                </div>
                <div className="rec-pattern-item">
                  <span className="rec-pattern-emoji"><FaSun /></span>
                  <span className="rec-pattern-label">Следобед</span>
                  <span className="rec-pattern-value">{patterns.afternoon}</span>
                </div>
                <div className="rec-pattern-item">
                  <span className="rec-pattern-emoji"><FaCloudSun /></span>
                  <span className="rec-pattern-label">Вечер</span>
                  <span className="rec-pattern-value">{patterns.evening}</span>
                </div>
                <div className="rec-pattern-item">
                  <span className="rec-pattern-emoji"><FaMoon /></span>
                  <span className="rec-pattern-label">Нощ</span>
                  <span className="rec-pattern-value">{patterns.night}</span>
                </div>
              </div>
            </div>
          )}

          {/* Recommended Artists */}
          <div className="glass-card rec-artists-section">
            <h2><FaMicrophone /> Препоръчани артисти</h2>
            <div className="rec-artist-grid">
              {prediction.recommendedArtists?.map((artist: any, i: number) => (
                <div key={i} className="rec-artist-card">
                  <div className="rec-artist-rank">#{i + 1}</div>
                  <div className="rec-artist-name">{artist.name}</div>
                  <div className="rec-artist-score">{artist.score} слушания</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Genres */}
          {prediction.topGenres && prediction.topGenres.length > 0 && (
            <div className="glass-card rec-genres-section">
              <h2><FaMusic /> Любими жанрове</h2>
              <div className="rec-genres-list">
                {prediction.topGenres.map((genre: string, i: number) => (
                  <span key={i} className="rec-genre-tag">{genre}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecommendationsExpanded;
