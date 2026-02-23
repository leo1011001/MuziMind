import React from 'react';
import '../Music.css';

interface RecentScrobblesProps {
  scrobbles: any[];
  language?: 'bg' | 'en';
  maxItems?: number;
}

export const RecentScrobbles: React.FC<RecentScrobblesProps> = ({ 
  scrobbles, 
  language = 'bg',
  maxItems = 10
}) => {
  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (language === 'en') {
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString();
    }
    
    if (diffHours < 1) return 'Току що';
    if (diffHours < 24) return `преди ${diffHours}ч`;
    return d.toLocaleDateString('bg-BG');
  };

  const displayedScrobbles = scrobbles.slice(0, maxItems);

  return (
    <div className="glass-card recent-scrobbles">
      <div className="scrobbles-header">
        <h3>📝 {language === 'en' ? 'Recent Plays' : 'Последни слушания'}</h3>
        <span className="scrobbles-count">
          {scrobbles.length} {language === 'en' ? 'tracks' : 'песни'}
        </span>
      </div>
      
      {displayedScrobbles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎵</div>
          <p>{language === 'en' ? 'No scrobbles yet' : 'Все още нямаш слушания'}</p>
          <small>
            {language === 'en' 
              ? 'Connect Last.fm to see your listening history' 
              : 'Свържи Last.fm, за да видиш историята си'}
          </small>
        </div>
      ) : (
        <div className="scrobbles-list">
          {displayedScrobbles.map((scrobble, index) => (
            <div key={index} className="scrobble-item">
              <div className="scrobble-rank">{index + 1}</div>
              
              <div className="scrobble-info">
                <div className="scrobble-track">
                  <span className="track-name">{scrobble.track.name}</span>
                  <span className="track-separator">•</span>
                  <span className="track-artist">{scrobble.track.artist}</span>
                </div>
                <div className="scrobble-meta">
                  <span className="scrobble-time">
                    {formatTime(scrobble.timestamp)}
                  </span>
                  {scrobble.loved && (
                    <span className="loved-indicator" title={language === 'en' ? 'Loved' : 'Харесана'}>
                      ❤️
                    </span>
                  )}
                </div>
              </div>
              
              {scrobble.track.album && (
                <div className="scrobble-album">
                  {scrobble.track.album}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {scrobbles.length > maxItems && (
        <div className="scrobbles-footer">
          <button className="view-all-btn">
            {language === 'en' ? 'View All' : 'Виж всички'} →
          </button>
        </div>
      )}
    </div>
  );
};
