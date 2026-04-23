import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaHatWizard, FaFire, FaBolt, FaHeadphones, FaMicrophone, FaMusic, FaClock, FaChartBar, FaSun, FaCloudSun, FaCloudMoon, FaMoon, FaNewspaper, FaArrowUp } from 'react-icons/fa';
import { ArtistStories, ArtistSpotlight } from '../../components/ui/ArtistStories/ArtistStories';
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
  const [spotlight, setSpotlight] = useState<ArtistSpotlight[]>([]);
  const [showStories, setShowStories] = useState(false);
  const [storiesStartIndex, setStoriesStartIndex] = useState(0);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      try {
        // Fetch prediction and live top artists in parallel
        const [predResult, topArtistsResult] = await Promise.allSettled([
          fetch(`${API_URL}/api/predict`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
          fetch(`${API_URL}/api/top-artists?period=7day`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        ]);

        const predData = predResult.status === 'fulfilled' ? predResult.value : null;
        if (predData) setPrediction(predData);

        // Use live Last.fm top artists for the stories carousel
        const liveArtists: string[] = (topArtistsResult.status === 'fulfilled' && Array.isArray(topArtistsResult.value))
          ? topArtistsResult.value
          : [];

        // Fallback to recommendedArtists from predict if live fetch returned nothing
        const artistNames: string[] = liveArtists.length > 0
          ? liveArtists
          : (predData?.recommendedArtists || []).map((a: any) => a.name);

        if (artistNames.length > 0) {
          try {
            const spotlightRes = await fetch(
              `${API_URL}/api/artist-spotlight?artists=${encodeURIComponent(artistNames.join(','))}`,
              { credentials: 'include' }
            );
            if (spotlightRes.ok) {
              setSpotlight(await spotlightRes.json());
            }
          } catch (e) {
            console.log('Spotlight fetch failed:', e);
          }
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
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

      {/* ── Artist Stories bubble strip ──────────────────── */}
      {spotlight.length > 0 && (
        <div className="rec-stories-strip">
          <p className="rec-stories-strip-label"><FaMicrophone /> Твоите артисти — натисни за история</p>
          <div className="rec-stories-bubbles">
            {spotlight.map((artist, i) => (
              <button
                key={i}
                className="rec-story-bubble"
                onClick={() => { setStoriesStartIndex(i); setShowStories(true); }}
                title={artist.name}
              >
                {artist.image
                  ? <img src={artist.image} alt={artist.name} className="rec-story-img" />
                  : <div className="rec-story-placeholder"><FaMusic /></div>
                }
                <span className="rec-story-name">{artist.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
            <div className="rec-artists-header">
              <h2><FaMicrophone /> Препоръчани артисти</h2>
              {spotlight.length > 0 && (
                <button
                  className="glass-button rec-spotlight-btn"
                  onClick={() => { setStoriesStartIndex(0); setShowStories(true); }}
                >
                  <FaNewspaper /> Виж истории
                </button>
              )}
            </div>
            <div className="rec-artist-grid">
              {prediction.recommendedArtists?.map((artist: any, i: number) => (
                <div
                  key={i}
                  className="rec-artist-card"
                  onClick={() => {
                    if (spotlight.length > 0) {
                      setStoriesStartIndex(i);
                      setShowStories(true);
                    }
                  }}
                  style={{ cursor: spotlight.length > 0 ? 'pointer' : 'default' }}
                >
                  <div className="rec-artist-rank">#{i + 1}</div>
                  <div className="rec-artist-name">
                    {artist.name}
                    {artist.trending && <FaArrowUp className="trending-badge" />}
                  </div>
                  <div className="rec-artist-score">
                    {artist.score < 1
                      ? `${Math.round(artist.score * 100)}%`
                      : artist.score}
                  </div>
                  {spotlight.length > 0 && <div className="rec-artist-story-hint">→ история</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Top Genres / Tags — visual bar chart */}
          {prediction.topTagsWithCounts?.length > 0 && (
            <div className="glass-card rec-genres-section">
              <h2><FaMusic /> Топ жанрове</h2>
              <div className="rec-genre-bars">
                {(() => {
                  const tags: Array<{ tag: string; count: number }> = prediction.topTagsWithCounts.slice(0, 8);
                  const max = tags[0]?.count || 1;
                  return tags.map((t, i) => (
                    <div key={i} className="rec-genre-bar-row">
                      <span className="rec-genre-bar-label">{t.tag}</span>
                      <div className="rec-genre-bar-track">
                        <div
                          className="rec-genre-bar-fill"
                          style={{ width: `${Math.round((t.count / max) * 100)}%` }}
                        />
                      </div>
                      <span className="rec-genre-bar-count">{t.count}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
          {/* Fallback plain tags if no counts */}
          {!prediction.topTagsWithCounts?.length && prediction.topGenres?.length > 0 && (
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

      {/* Artist Stories Modal */}
      {showStories && spotlight.length > 0 && (
        <ArtistStories
          artists={spotlight}
          startIndex={storiesStartIndex}
          onClose={() => setShowStories(false)}
        />
      )}
    </div>
  );
};

export default RecommendationsExpanded;
