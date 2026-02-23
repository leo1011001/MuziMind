import { useState, useEffect } from 'react';
import '../DailyReading/DailyReading.css';

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
  }, [userId]);

  const fetchReading = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real app, this would fetch from your API
      // For now, we'll use mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockReading: ReadingData = {
        content: language === 'bg'
          ? 'Здравей, музикален алхимиче! 🎵 Виждам, че тази седмица си се отдал/а на класически рок с нотка носталгия. Твоите слушания разказват история за дълбоки корени и уважение към музикалните легенди. Все едно слушаш винилова плоча в стара книжарница докато вали навън. ✨\n\nТвоят музикален вкус наподобява мъдър архивар, който пази скъпоценни реликви. Харесваш да задълбаваш в творби, които са издържали проверката на времето. Това не е просто слушане, а ритуал на почит към изкуството.\n\n🎶 **Музикална мъдрост за деня:** Понякога най-старите мелодии носят най-свежите емоции.'
          : 'Hello, musical alchemist! 🎵 I see you\'ve been diving into classic rock with a touch of nostalgia this week. Your listening patterns tell a story of deep roots and respect for musical legends. It\'s like listening to a vinyl record in an old bookstore while it rains outside. ✨\n\nYour musical taste resembles a wise archivist who preserves precious relics. You enjoy delving into works that have stood the test of time. This isn\'t just listening—it\'s a ritual of homage to art.\n\n🎶 **Musical Wisdom for Today:** Sometimes the oldest melodies carry the freshest emotions.',
        mood: 'nostalgic',
        date: new Date().toISOString(),
        recommendations: [
          {
            artist: 'Pink Floyd',
            track: 'Wish You Were Here',
            reason: language === 'bg'
              ? 'Перфектна комбинация от класически рок и дълбоки емоции'
              : 'Perfect blend of classic rock and deep emotions'
          },
          {
            artist: 'Dire Straits',
            track: 'Sultans of Swing',
            reason: language === 'bg'
              ? 'Майсторски инструментали, които ще оценят истинските познавачи'
              : 'Masterful instrumentation that true connoisseurs will appreciate'
          },
          {
            artist: 'Fleetwood Mac',
            track: 'Dreams',
            reason: language === 'bg'
              ? 'Времево доказана класика, която отговаря на твоя вкус'
              : 'Timeless classic that matches your refined taste'
          }
        ]
      };
      
      setReading(mockReading);
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
      
      // In a real app, this would call your API to generate a new reading
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const moods = Object.keys(moodEmoji);
      const randomMood = moods[Math.floor(Math.random() * moods.length)];
      
      const newReading: ReadingData = {
        content: language === 'bg'
          ? '✨ **Нов прочит!** Твоята музикална аура се е променила! Забелязвам повече разнообразие в избора ти. Изглежда търсиш нови звуци, които да разширят хоризонтите ти. 🎶\n\nТази път си по-скоро изследовател отколкото архивар. Опитваш се да намериш баланс между познатото и новото, което е страхотен признак за музикален растеж.\n\n🎵 **Прогноза:** Тази седмица ще откриеш артист, който ще те изненада приятно!'
          : '✨ **New Reading!** Your musical aura has shifted! I notice more diversity in your choices. It seems you\'re seeking new sounds to expand your horizons. 🎶\n\nThis time you\'re more of an explorer than an archivist. You\'re trying to find balance between the familiar and the new, which is a great sign of musical growth.\n\n🎵 **Prediction:** This week you\'ll discover an artist that will pleasantly surprise you!',
        mood: randomMood,
        date: new Date().toISOString(),
        recommendations: [
          {
            artist: 'Tame Impala',
            track: 'The Less I Know the Better',
            reason: language === 'bg'
              ? 'Модерен звук с винтажни влияния' 
              : 'Modern sound with vintage influences'
          },
          {
            artist: 'Khruangbin',
            track: 'White Gloves',
            reason: language === 'bg'
              ? 'Инструментално майсторство с международен вкус'
              : 'Instrumental mastery with international flavor'
          },
          {
            artist: 'Lana Del Rey',
            track: 'Video Games',
            reason: language === 'bg'
              ? 'Носталгичен поп, който отговаря на твоя вкус'
              : 'Nostalgic pop that matches your taste'
          }
        ]
      };
      
      setReading(newReading);
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
  const moodIcon = moodEmoji[reading.mood] || '🎵';

  return (
    <div className="glass-card daily-reading">
      <div className="reading-header">
        <div className="header-left">
          <h3>🔮 {language === 'en' ? 'Daily Reading' : 'Дневен прочит'}</h3>
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
          <span className="mood-emoji">{moodIcon}</span>
          <span className="mood-label">{moodLabel}</span>
        </div>
      </div>
      
      <div className="reading-content">
        {reading.content.split('\n\n').map((paragraph, index) => (
          <p key={index} className="reading-paragraph">
            {paragraph}
          </p>
        ))}
      </div>
      
      {reading.recommendations && reading.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4>🎵 {language === 'en' ? 'Recommended for you' : 'Препоръчано за теб'}</h4>
          <div className="recommendations-list">
            {reading.recommendations.map((rec, index) => (
              <div key={index} className="recommendation-item">
                <div className="recommendation-rank">{index + 1}</div>
                <div className="recommendation-info">
                  <div className="recommendation-track">
                    <strong>{rec.track}</strong> by {rec.artist}
                  </div>
                  <div className="recommendation-reason">{rec.reason}</div>
                </div>
                <button className="listen-btn" title={language === 'en' ? 'Listen' : 'Слушай'}>
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
              {language === 'en' ? 'Generating...' : 'Генериране...'}
            </>
          ) : (
            <>
              ✨ {language === 'en' ? 'Generate New Reading' : 'Нов прочит'}
            </>
          )}
        </button>
        
        <div className="reading-actions">
          <button className="action-btn" title={language === 'en' ? 'Save' : 'Запази'}>
            💾
          </button>
          <button className="action-btn" title={language === 'en' ? 'Share' : 'Сподели'}>
            📤
          </button>
          <button className="action-btn" title={language === 'en' ? 'Previous' : 'Предишни'}>
            📚
          </button>
        </div>
      </div>
    </div>
  );
}
