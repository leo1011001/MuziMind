import React, { useState, useEffect } from 'react';
import './ReadingComponents.css';
import HappyIcon from '../../../assets/icons/happy.svg?react';
import NostalgicIcon from '../../../assets/icons/nostalgic.svg?react';
import EnergeticIcon from '../../../assets/icons/energetic.svg?react';
import CalmIcon from '../../../assets/icons/calm.svg?react';
import AdventurousIcon from '../../../assets/icons/adventurous.svg?react';
import RomanticIcon from '../../../assets/icons/romantic.svg?react';
import FocusedIcon from '../../../assets/icons/focused.svg?react';
import MelancholicIcon from '../../../assets/icons/melancholic.svg?react';
import MysteriousIcon from '../../../assets/icons/mysterious.svg?react';
import CreativeIcon from '../../../assets/icons/creative.svg?react';



interface DailyReadingProps {
  userId: string;
  language?: 'bg' | 'en';
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

const moodIcons: Record<string, React.ReactElement> = {
  happy: <HappyIcon />,
  nostalgic: <NostalgicIcon />,
  energetic: <EnergeticIcon />,
  calm: <CalmIcon />,
  adventurous: <AdventurousIcon />,
  romantic: <RomanticIcon />,
  focused: <FocusedIcon />,
  melancholic: <MelancholicIcon />,
  mysterious: <MysteriousIcon />,
  creative: <CreativeIcon />,
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

const moodLabels: Record<string, { bg: string; en: string }> = {
  happy: { bg: 'Радостен', en: 'Happy' },
  nostalgic: { bg: 'Носталгичен', en: 'Nostalgic' },
  energetic: { bg: 'Енергичен', en: 'Energetic' },
  calm: { bg: 'Спокоен', en: 'Calm' },
  adventurous: { bg: 'Приключенски', en: 'Adventurous' },
  romantic: { bg: 'Романтичен', en: 'Romantic' },
  focused: { bg: 'Сконцентриран', en: 'Focused' },
  melancholic: { bg: 'Меланхоличен', en: 'Melancholic' },
  mysterious: { bg: 'Мистериозен', en: 'Mysterious' },
  creative: { bg: 'Творчески', en: 'Creative' },
};

export function DailyReading({ userId, language = 'bg' }: DailyReadingProps) {
  const [reading, setReading] = useState<ReadingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReading();
    // eslint-disable-next-line
  }, [userId, language]);

  const fetchReading = async () => {
    try {
      setLoading(true);
      setError(null);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${API_URL}/api/reading/latest?userId=${userId}&lang=${language}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch reading');
      const data = await res.json();
      setReading(data);
    } catch (err) {
      setError(language === 'bg' 
        ? 'Грешка при зареждане на прочита' 
        : 'Error loading reading'
      );
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
        body: JSON.stringify({ userId, language })
      });
      if (!res.ok) throw new Error('Failed to generate reading');
      const data = await res.json();
      setReading(data);
    } catch (err) {
      setError(language === 'bg'
        ? 'Грешка при генериране на прочит'
        : 'Error generating reading'
      );
      console.error('Error generating reading:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card daily-reading loading">
        <div className="reading-header">
          <h3>🔮 {language === 'en' ? 'Daily Reading' : 'Дневен прочит'}</h3>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>{language === 'en' ? 'Consulting the musical oracle...' : 'Консултирам се с музикалния оракул...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card daily-reading error">
        <div className="reading-header">
          <h3>🔮 {language === 'en' ? 'Daily Reading' : 'Дневен прочит'}</h3>
        </div>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button 
            onClick={fetchReading}
            className="glass-button retry-btn"
          >
            {language === 'en' ? 'Try Again' : 'Опитай отново'}
          </button>
        </div>
      </div>
    );
  }

  if (!reading) {
    return (
      <div className="glass-card daily-reading empty">
        <div className="reading-header">
          <h3>🔮 {language === 'en' ? 'Daily Reading' : 'Дневен прочит'}</h3>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📖</div>
          <p>{language === 'en' ? 'No reading available' : 'Няма наличен прочит'}</p>
          <button 
            onClick={generateNewReading}
            disabled={generating}
            className="glass-button primary generate-btn"
          >
            {generating 
              ? (language === 'en' ? 'Generating...' : 'Генериране...')
              : (language === 'en' ? 'Generate First Reading' : 'Генерирай първи прочит')
            }
          </button>
        </div>
      </div>
    );
  }

  const moodLabel = moodLabels[reading.mood]?.[language] || reading.mood;
  const moodColor = moodColors[reading.mood] || 'rgba(180, 160, 255, 0.2)';
  const moodIcon = moodIcons[reading.mood] || <CreativeIcon />;

  return (
    <div className="glass-card daily-reading">
      <div className="reading-header">
        <div className="header-left">
          <h3>{language === 'en' ? 'Daily Reading' : 'Дневен прочит'}</h3>
          <div className="reading-date">
            {new Date(reading.date).toLocaleDateString(language === 'bg' ? 'bg-BG' : 'en-US', {
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
          <span className="mood-icon">{moodIcon}</span>
          <span className="mood-label">{moodLabel}</span>
        </div>
      </div>
      <div className="reading-content">
        <div className="reading-paragraphs">
          <div className="reading-bg">
            <div className="reading-bg-art" />
          </div>
          {reading.content.split('\n\n').map((paragraph, index) => (
            <p key={index} className="reading-paragraph">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
      {reading.recommendations && reading.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4>{language === 'en' ? 'Recommended for you' : 'Препоръчано за теб'}</h4>
          <div className="recommendations-list">
            {reading.recommendations.map((rec, index) => (
              <div key={index} className="recommendation-item">
                <div className="recommendation-rank">{index + 1}</div>
                <div className="recommendation-info">
                  <div className="recommendation-track">
                    <strong>{rec.track}</strong> {language === 'en' ? 'by' : 'от'} {rec.artist}
                  </div>
                  <div className="recommendation-reason">{rec.reason}</div>
                </div>
                <button className="listen-btn" title={language === 'en' ? 'Listen' : 'Слушай'}>
                  <svg width="20" height="20" viewBox="0 0 20 20"><polygon points="5,3 17,10 5,17" fill="#333" /></svg>
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
              {language === 'en' ? 'Generating...' : 'Генериране...'}
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" stroke="#333" strokeWidth="2" fill="none" /><path d="M9 3v6l4 2" stroke="#333" strokeWidth="2" fill="none" /></svg>
              {language === 'en' ? 'Generate New Reading' : 'Нов прочит'}
            </>
          )}
        </button>
        <div className="reading-actions">
          <button className="action-btn" title={language === 'en' ? 'Save' : 'Запази'}>
            <svg width="18" height="18" viewBox="0 0 18 18"><rect x="3" y="3" width="12" height="12" rx="2" fill="#333" /><rect x="6" y="6" width="6" height="6" fill="#fff" /></svg>
          </button>
          <button className="action-btn" title={language === 'en' ? 'Share' : 'Сподели'}>
            <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" stroke="#333" strokeWidth="2" fill="none" /><path d="M9 5v8M5 9h8" stroke="#333" strokeWidth="2" fill="none" /></svg>
          </button>
          <button className="action-btn" title={language === 'en' ? 'Previous' : 'Предишни'}>
            <svg width="18" height="18" viewBox="0 0 18 18"><polyline points="12,5 7,9 12,13" fill="none" stroke="#333" strokeWidth="2" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};