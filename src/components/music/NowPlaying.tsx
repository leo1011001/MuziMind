import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authFetch } from '../../utils/authFetch';
import { FaMusic, FaClock, FaExternalLinkAlt } from 'react-icons/fa';
import './MusicComponents.css';

interface TrackData {
  name: string;
  artist: string;
  album: string;
  url?: string;
  image?: string;
}

interface NowPlayingData {
  currentlyPlaying: {
    track: TrackData;
    currentlyPlaying: boolean;
    playedAt: string;
    syncedAt: string;
  } | null;
  lastSync: string;
}

const POLL_INTERVAL = 15_000; // 15 seconds

export const NowPlaying: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<NowPlayingData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchNowPlaying();
    const id = setInterval(fetchNowPlaying, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [user]);

  const fetchNowPlaying = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/now-playing');
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silent — keep showing last state
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;
  if (loading && !data) {
    return (
      <div className="glass-card now-playing-card">
        <div className="now-playing-header">
          <FaMusic className="icon" />
          <h3>Зареждане...</h3>
        </div>
      </div>
    );
  }
  if (!data?.currentlyPlaying) return null;

  const { track, currentlyPlaying: isPlaying, playedAt } = data.currentlyPlaying;
  const timeStr = playedAt ? new Date(playedAt).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className={`glass-card now-playing-card ${isPlaying ? 'active' : ''}`}>
      <div className="now-playing-header">
        <FaMusic className="icon" style={{ color: isPlaying ? '#4ade80' : undefined }} />
        <h3>{isPlaying ? 'Слуша се сега' : 'Последен трак'}</h3>
        {isPlaying && <span className="live-dot" />}
      </div>

      <div className="track-info">
        {track.image && (
          <img
            src={track.image}
            alt={track.album || track.name}
            className="track-artwork"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div className="track-name">{track.name}</div>
        <div className="track-artist">{track.artist}</div>
        {track.album && <div className="track-album">{track.album}</div>}
      </div>

      {!isPlaying && timeStr && (
        <div className="track-time">
          <FaClock /> {timeStr}
        </div>
      )}

      {track.url && (
        <a href={track.url} target="_blank" rel="noopener noreferrer" className="last-fm-link">
          <FaExternalLinkAlt /> Виж на Last.fm
        </a>
      )}
    </div>
  );
};

export default NowPlaying;
