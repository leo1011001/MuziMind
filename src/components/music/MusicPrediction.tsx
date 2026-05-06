import React, { useEffect, useState } from 'react';
import { authFetch } from '../../utils/authFetch';
import { useNavigate } from 'react-router-dom';
import { FaHatWizard, FaFire, FaBolt, FaHeadphones, FaMicrophone, FaClock, FaSun, FaMoon, FaCloudMoon, FaCloudSun, FaArrowUp } from 'react-icons/fa';
import './MusicComponents.css';

interface PredictionData {
  dailyPrediction: string;
  recommendedArtists: Array<{ name: string; score: number; trending?: boolean }>;
  peakHour: number;
  topGenres: string[];
  topArtist: string;
  totalScrobbles: number;
  intensityLevel: string;
  currentTimeContext: { hour: number; period: string; emoji: string };
  listeningPatterns: { morning: number; afternoon: number; evening: number; night: number };
}

const timeIcons: Record<string, React.ReactNode> = {
  sunrise: <FaSun />,
  sun: <FaSun />,
  'cloud-sun': <FaCloudSun />,
  afternoon: <FaSun />,
  sunset: <FaCloudSun />,
  moon: <FaCloudMoon />,
  night: <FaMoon />,
};

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

export const MusicPrediction: React.FC = () => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPrediction();
  }, []);

  const fetchPrediction = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_URL}/api/predict?localHour=${new Date().getHours()}`);
      if (res.ok) {
        const json = await res.json();
        setPrediction(json);
      }
    } catch (e) {
      console.error('Error fetching prediction', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card music-prediction">
        <div className="prediction-header">
          <h3><FaHatWizard /> Дневна прогноза</h3>
        </div>
        <div className="prediction-loading">
          <div className="loading-spinner"></div>
          <p>Генерирам вашата прогноза...</p>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="glass-card music-prediction">
        <div className="prediction-header">
          <h3><FaHatWizard /> Дневна прогноза</h3>
        </div>
        <p className="prediction-empty">Няма налични данни за прогноза.</p>
      </div>
    );
  }

  const intensityLabel = intensityLabels[prediction.intensityLevel] || 'Слушател';
  const intensityIcon = intensityIcons[prediction.intensityLevel] || <FaHeadphones />;
  const ctx = prediction.currentTimeContext;

  return (
    <div className="glass-card music-prediction">
      <div className="prediction-header">
        <div className="prediction-header-left">
          <h3><FaHatWizard /> Дневна прогноза</h3>
          <span className="prediction-time-badge">
            {timeIcons[ctx?.emoji] || <FaClock />} {ctx?.period}
          </span>
        </div>
        <div className="intensity-badge" title={intensityLabel}>
          <span>{intensityIcon}</span>
          <span>{intensityLabel}</span>
        </div>
      </div>

      <div className="prediction-body">
        <p className="prediction-message">{prediction.dailyPrediction}</p>
      </div>

      {prediction.recommendedArtists && prediction.recommendedArtists.length > 0 && (
        <div className="prediction-artists">
          <h4><FaMicrophone /> Препоръчани артисти</h4>
          <div className="prediction-artists-list">
            {prediction.recommendedArtists.map((a, i) => (
              <div key={i} className="prediction-artist-item">
                <div className="prediction-artist-rank">#{i + 1}</div>
                <div className="prediction-artist-name">
                  {a.name}
                  {a.trending && (
                    <span className="trending-badge" title="Трендинг за теб"><FaArrowUp /></span>
                  )}
                </div>
                <div className="prediction-artist-score">
                  {typeof a.score === 'number' && a.score < 1
                    ? `${Math.round(a.score * 100)}%`
                    : `${a.score}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="prediction-footer">
        <div className="prediction-peak">
          <FaClock /> Пиков час: <strong>{prediction.peakHour}:00 ч.</strong>
        </div>
        <button className="glass-button prediction-expand-btn" onClick={() => navigate('/recommendations-expanded')}>
          Виж повече →
        </button>
      </div>
    </div>
  );
};

export default MusicPrediction;
