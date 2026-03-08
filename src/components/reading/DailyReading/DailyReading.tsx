
import { useState, useEffect } from 'react';
import '../DailyReading/DailyReading.css';

interface DailyReadingProps {
  userId: string;
}

interface ReadingData {
  content: string;
  mood: string;
  date: string;
  recommendations: Array<{
    artist: string;
    track: string;
    reason: string;
  }>;
}

const moodEmoji: Record<string, string> = {
  happy: '😊',
  nostalgic: '🕰️',
  energetic: '⚡',
  calm: '☁️',
  adventurous: '🧭',
  romantic: '💖',
  focused: '🎯',
  melancholic: '🌧️',
  mysterious: '🔮',
  creative: '🎨',
};

const moodColors: Record<string, string> = {
  happy: 'rgba(255, 215, 0, 0.2)',
  nostalgic: 'rgba(147, 112, 219, 0.2)',
  energetic: 'rgba(255, 99, 71, 0.2)',
  calm: 'rgba(135, 206, 235, 0.2)',
  adventurous: 'rgba(50, 205, 50, 0.2)',
  romantic: 'rgba(255, 182, 193, 0.2)',
  focused: 'rgba(70, 130, 180, 0.2)',
  melancholic: 'rgba(128, 128, 128, 0.2)',
  mysterious: 'rgba(138, 43, 226, 0.2)',
  creative: 'rgba(255, 140, 0, 0.2)',
};

const moodLabels: Record<string, string> = {
  happy: 'Happy',
  nostalgic: 'Nostalgic',
  energetic: 'Energetic',
  calm: 'Calm',
  adventurous: 'Adventurous',
  romantic: 'Romantic',
  focused: 'Focused',
  melancholic: 'Melancholic',
  mysterious: 'Mysterious',
  creative: 'Creative',
};

export function DailyReading({ userId }: DailyReadingProps) {
  const [reading, setReading] = useState<ReadingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReading();
  }, [userId]);

  const fetchReading = async () => {
    try {
      setLoading(true);
      setError(null);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${API_URL}/api/reading/latest?userId=${userId}&lang=bg`, { credentials: 'include' });
      if (!res.ok) throw new Error('Грешка при зареждане на прочита');
      const data = await res.json();
      setReading(data);
    } catch (err) {
      setError('Грешка при зареждане на прочита');
      console.error('Error fetching reading:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateNewReading = async () => {
    try {
      setGenerating(true);
      setError(null);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${API_URL}/api/reading/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, language: 'bg' })
      });
      if (!res.ok) throw new Error('Грешка при генериране на прочит');
      const data = await res.json();
      setReading(data);
    } catch (err) {
      setError('Грешка при генериране на прочит');
      console.error('Error generating reading:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card daily-reading loading">
        <div className="reading-header">
          <h3>🔮 Дневен прочит</h3>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Консултирам се с музикалния оракул...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card daily-reading error">
        <div className="reading-header">
          <h3>🔮 Дневен прочит</h3>
        </div>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button 
            onClick={fetchReading}
            className="glass-button retry-btn"
          >
            Опитай отново
          </button>
        </div>
      </div>
    );
  }

  if (!reading) {
    return (
      <div className="glass-card daily-reading empty">
        <div className="reading-header">
          <h3>🔮 Дневен прочит</h3>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📖</div>
          <p>Няма наличен прочит</p>
          <button 
            onClick={generateNewReading}
            disabled={generating}
            className="glass-button primary generate-btn"
          >
            {generating 
              ? 'Генериране...'
              : 'Генерирай първи прочит'
            }
          </button>
        </div>
      </div>
    );
  }

  const moodLabel = moodLabels[reading.mood] || reading.mood;
  const moodColor = moodColors[reading.mood] || 'rgba(180, 160, 255, 0.2)';
  const moodIcon = moodEmoji[reading.mood] || '🎵';

  // Reader component alongside recommendations
  const Reader = () => (
    <div className="reader-section">
      <h4>📖 Прочит</h4>
      {reading.content.split('\n\n').map((paragraph, index) => (
        <p key={index} className="reading-paragraph">
          {paragraph}
        </p>
      ))}
    </div>
  );

  return (
    <div className="glass-card daily-reading">
      <div className="reading-header">
        <div className="header-left">
          <h3>🔮 Дневен прочит</h3>
          <div className="reading-date">
            {new Date(reading.date).toLocaleDateString('bg-BG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
        <div 
          className="mood-badge"
          style={{ backgroundColor: moodColor }}
        >
          <span className="mood-emoji">{moodIcon}</span>
          <span className="mood-label">{moodLabel}</span>
        </div>
      </div>
      <Reader />
      {reading.recommendations && reading.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4>🎵 Препоръчано за теб</h4>
          <div className="recommendations-list">
            {reading.recommendations.map((rec, index) => (
              <div key={index} className="recommendation-item">
                <div className="recommendation-rank">{index + 1}</div>
                <div className="recommendation-info">
                  <div className="recommendation-track">
                    <strong>{rec.track}</strong> {rec.track ? 'от' : ''} {rec.artist}
                  </div>
                  <div className="recommendation-reason">{rec.reason}</div>
                </div>
                <button className="listen-btn" title="Слушай">
                  ▶
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="reading-footer">
        <button 
          onClick={generateNewReading}
          disabled={generating}
          className="glass-button generate-new-btn"
        >
          {generating ? (
            <>
              <span className="spinner-small"></span>
              Генериране...
            </>
          ) : (
            <>
              ✨ Нов прочит
            </>
          )}
        </button>
        <div className="reading-actions">
          <button className="action-btn" title="Запази">
            💾
          </button>
          <button className="action-btn" title="Сподели">
            📤
          </button>
          <button className="action-btn" title="Предишни">
            📚
          </button>
        </div>
      </div>
    </div>
  );
}
