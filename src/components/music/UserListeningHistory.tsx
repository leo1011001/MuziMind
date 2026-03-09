import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaCalendarAlt, FaMusic, FaHistory } from 'react-icons/fa';
import './MusicComponents.css';

interface HistoryTrack {
  track: {
    name: string;
    artist: string;
    album: string;
    url?: string;
  };
  timestamp: string;
}

export const UserListeningHistory: React.FC = () => {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<HistoryTrack[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (user?.lastfmUsername) {
      fetchListeningHistory();
    }
  }, [user?.lastfmUsername]);

  const fetchListeningHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/stats`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setTracks(data.recentScrobbles || []);
      }
    } catch (error) {
      console.error('Error fetching listening history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.lastfmUsername) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="listening-history">
      <div className="history-header">
        <h2><FaHistory /> Последно слушана музика</h2>
      </div>

      {loading ? (
        <div className="loading">Зареждане на твоята история...</div>
      ) : tracks && tracks.length > 0 ? (
        <div className="tracks-list">
          {tracks.slice(0, 15).map((track, index) => (
            <div key={index} className="history-track-item">
              <div className="track-number">{index + 1}</div>
              <div className="track-details">
                <div className="track-title">{track.track.name}</div>
                <div className="track-artist">{track.track.artist}</div>
                <div className="track-time">
                  <FaCalendarAlt /> {formatDate(track.timestamp)}
                </div>
              </div>
              {track.track.url && (
                <a href={track.track.url} target="_blank" rel="noopener noreferrer" className="track-link">
                  Last.fm
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-data">
          <FaMusic /> Няма данни за слушана музика
        </div>
      )}
    </div>
  );
};
