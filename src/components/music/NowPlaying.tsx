import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaPlay, FaMusic, FaClock } from 'react-icons/fa';
import './MusicComponents.css';

interface NowPlayingTrack {
  name: string;
  artist: string;
  album: string;
  nowplaying?: boolean;
  date?: string;
  url?: string;
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
      const response = await fetch(`/api/stats`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const recent = data.recentScrobbles?.[0];
        if (recent) {
          // Check if track has @attr.nowplaying flag which indicates it's currently being streamed
          const nowPlayingFlag = recent['@attr']?.nowplaying === 'true';
          
          setTrack({
            name: recent.track.name,
            artist: recent.track.artist,
            album: recent.track.album,
            nowplaying: nowPlayingFlag,
            date: recent.timestamp,
            url: recent.track?.url
          });
          // Only show as currently playing if Last.fm explicitly marks it with nowplaying flag
          setIsCurrentlyPlaying(nowPlayingFlag);
        }
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
    <div className={`glass-card now-playing-card ${isCurrentlyPlaying ? 'active' : ''}`}>
      <div className="now-playing-header">
        <FaMusic className="icon" />
        <h3>{isCurrentlyPlaying ? 'Слушане' : 'Последен трак'}</h3>
      </div>

      <div className="track-info">
        <div className="track-name">{track.name}</div>
        <div className="track-artist">{track.artist}</div>
        <div className="track-album">{track.album}</div>
      </div>

      {isCurrentlyPlaying && (
        <button className="play-button play-resume">
          <FaPlay /> Продължи слушането
        </button>
      )}

      {!isCurrentlyPlaying && track.date && (
        <div className="track-time">
          <FaClock /> {new Date(track.date).toLocaleTimeString()}
        </div>
      )}

      {track.url && (
        <a href={track.url} target="_blank" rel="noopener noreferrer" className="last-fm-link">
          Виж на Last.fm
        </a>
      )}
    </div>
  );
};

export default NowPlaying;