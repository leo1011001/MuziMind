import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { FaPlay, FaMusic, FaClock } from 'react-icons/fa';
import '../Music.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface NowPlayingTrack {
  name: string;
  artist: string;
  album: string;
  nowplaying?: boolean;
  date?: string;
  url?: string;
  image?: string;
}

export const NowPlaying: React.FC = () => {
  const { user } = useAuth();
  const [track, setTrack] = useState<NowPlayingTrack | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCurrentlyPlaying, setIsCurrentlyPlaying] = useState(false);

  useEffect(() => {
    if (user?.lastfmUsername) {
      fetchNowPlaying();
      const interval = setInterval(fetchNowPlaying, 10000);
      return () => clearInterval(interval);
    }
  }, [user?.lastfmUsername]);

  const fetchNowPlaying = async () => {
    if (!user?.lastfmUsername) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/now-playing`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const current = data.currentlyPlaying;
        
        if (current && current.track) {
          setTrack({
            name: current.track.name,
            artist: current.track.artist,
            album: current.track.album,
            nowplaying: current.currentlyPlaying === true,
            date: current.playedAt,
            url: current.track?.url,
            image: current.track?.image
          });
          setIsCurrentlyPlaying(current.currentlyPlaying === true);
        }
      } else {
        console.warn('Failed to fetch now playing:', response.status);
      }
    } catch (error) {
      console.error('Error fetching now playing:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.lastfmUsername) {
    return null;
  }

  if (loading && !track) {
    return <div className="glass-card now-playing-card">Зареждане...</div>;
  }

  if (!track) {
    return null;
  }

  return (
    <div className={`now-playing-highlight ${isCurrentlyPlaying ? 'active' : ''}`}>
      <div className="now-playing-content">
        {track.image && (
          <img src={track.image} alt={track.album} className="now-playing-album-art" />
        )}
        
        <div className="now-playing-header">
          <FaMusic className="icon" />
          <h3>{isCurrentlyPlaying ? '🎶 Now Playing' : '⏸ Last Track'}</h3>
        </div>

        <div className="now-playing-title">{track.name}</div>
        <div className="now-playing-artist">{track.artist}</div>
        
        <div className="track-info">
          <div className="track-album">{track.album}</div>
        </div>

        {isCurrentlyPlaying && (
          <button className="play-button play-resume">
            <FaPlay /> Continue Listening
          </button>
        )}

        {!isCurrentlyPlaying && track.date && (
          <div className="track-time">
            <FaClock /> {new Date(track.date).toLocaleTimeString()}
          </div>
        )}

        {track.url && (
          <a href={track.url} target="_blank" rel="noopener noreferrer" className="last-fm-link">
            View on Last.fm →
          </a>
        )}
      </div>
    </div>
  );
};

export default NowPlaying;
