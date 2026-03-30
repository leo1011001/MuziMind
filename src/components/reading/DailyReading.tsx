import { useState, useEffect } from 'react';
import { FaSmile, FaHistory, FaBolt, FaCloud, FaCompass, FaHeart, FaBullseye, FaCloudRain, FaHatWizard, FaPaintBrush, FaBalanceScale, FaMusic, FaExclamationTriangle, FaBook, FaStar, FaBrain } from 'react-icons/fa';
import './ReadingComponents.css';

interface DailyReadingProps {
  userId: string;
  language?: string;
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

const moodIcons: Record<string, React.ReactNode> = {
  happy: <FaSmile />, nostalgic: <FaHistory />, energetic: <FaBolt />, calm: <FaCloud />,
  adventurous: <FaCompass />, romantic: <FaHeart />, focused: <FaBullseye />,
  melancholic: <FaCloudRain />, mysterious: <FaHatWizard />, creative: <FaPaintBrush />, balanced: <FaBalanceScale />,
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
  balanced: 'rgba(180, 160, 255, 0.2)',
};

const moodLabels: Record<string, string> = {
  happy: 'Радостен', nostalgic: 'Носталгичен', energetic: 'Енергичен',
  calm: 'Спокоен', adventurous: 'Приключенски', romantic: 'Романтичен',
  focused: 'Сконцентриран', melancholic: 'Меланхоличен',
  mysterious: 'Мистериозен', creative: 'Творчески', balanced: 'Балансиран',
};

export function DailyReading({ userId }: DailyReadingProps) {
  const [reading, setReading] = useState<ReadingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchReading();
      fetchInsight();
    }
  }, [userId]);

  const fetchInsight = async () => {
    try {
      setInsightLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${API_URL}/api/reading/insight`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.insight) setInsight(data.insight);
      }
    } catch {
      // silently fail — insight is optional
    } finally {
      setInsightLoading(false);
    }
  };

  const fetchReading = async () => {
    try {
      setLoading(true);
      setError(null);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${API_URL}/api/reading/latest`, { credentials: 'include' });
      if (res.status === 404) {
        // No reading at all — auto-generate
        await generateNewReading();
        return;
      }
      if (!res.ok) throw new Error('Грешка при зареждане');
      const data = await res.json();
      // Auto-regenerate if the stored reading is from a previous day
      const readingDate = new Date(data.date);
      const today = new Date();
      const isStale = readingDate.toDateString() !== today.toDateString();
      if (isStale) {
        setLoading(false);
        await generateNewReading();
        return;
      }
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
        body: JSON.stringify({ userId })
      });
      if (!res.ok) throw new Error('Грешка при генериране');
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
          <h3><FaHatWizard /> Дневен прочит</h3>
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
          <h3><FaHatWizard /> Дневен прочит</h3>
        </div>
        <div className="error-state">
          <div className="error-icon"><FaExclamationTriangle /></div>
          <p>{error}</p>
          <button onClick={generateNewReading} disabled={generating} className="glass-button retry-btn">
            {generating ? 'Генериране...' : 'Генерирай прочит'}
          </button>
        </div>
      </div>
    );
  }

  if (!reading) {
    return (
      <div className="glass-card daily-reading empty">
        <div className="reading-header">
          <h3><FaHatWizard /> Дневен прочит</h3>
        </div>
        <div className="empty-state">
          <div className="empty-icon"><FaBook /></div>
          <p>Няма наличен прочит</p>
          <button onClick={generateNewReading} disabled={generating} className="glass-button primary generate-btn">
            {generating ? 'Генериране...' : 'Генерирай първи прочит'}
          </button>
        </div>
      </div>
    );
  }

  const moodLabel = moodLabels[reading.mood] || reading.mood;
  const moodColor = moodColors[reading.mood] || 'rgba(180, 160, 255, 0.2)';
  const moodIcon = moodIcons[reading.mood] || <FaMusic />;

  return (
    <div className="glass-card daily-reading">
      <div className="reading-header">
        <div className="header-left">
          <h3><FaHatWizard /> Дневен прочит</h3>
          <div className="reading-date">
            {new Date(reading.date).toLocaleDateString('bg-BG', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </div>
        </div>
        <div className="mood-badge" style={{ backgroundColor: moodColor }}>
          <span className="mood-icon">{moodIcon}</span>
          <span className="mood-label">{moodLabel}</span>
        </div>
      </div>
      <div className="reading-content">
        <div className="reading-paragraphs">
          {reading.content.split('\n\n').map((paragraph, index) => (
            <p key={index} className="reading-paragraph">{paragraph}</p>
          ))}
        </div>
      </div>
      {(insight || insightLoading) && (
        <div className="reading-insight-card">
          <div className="reading-insight-header">
            <FaBrain /> <span>Музикална личност</span>
          </div>
          {insightLoading
            ? <div className="reading-insight-skeleton" />
            : <p className="reading-insight-text">{insight}</p>
          }
        </div>
      )}
      {reading.recommendations && reading.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4><FaMusic /> Препоръчано за теб</h4>
          <div className="recommendations-list">
            {reading.recommendations.map((rec, index) => (
              <div key={index} className="recommendation-item">
                <div className="recommendation-rank">{index + 1}</div>
                <div className="recommendation-info">
                  <div className="recommendation-track">
                    {rec.track ? <><strong>{rec.track}</strong> от {rec.artist}</> : <strong>{rec.artist}</strong>}
                  </div>
                  <div className="recommendation-reason">{rec.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="reading-footer">
        <button onClick={generateNewReading} disabled={generating} className="glass-button generate-new-btn">
          {generating ? <><span className="spinner-small"></span> Генериране...</> : <><FaStar /> Нов прочит</>}
        </button>
      </div>
    </div>
  );
}