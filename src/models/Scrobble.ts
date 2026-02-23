import { ObjectId } from 'mongodb';

export interface Track {
  name: string;
  artist: string;
  album?: string;
  mbid?: string;
  url?: string;
  image?: string;
}

export interface TrackHistory {
  _id?: ObjectId;
  userId: ObjectId;
  track: Track;
  currentlyPlaying?: boolean;
  playedAt: Date;
  duration?: number;
  source: 'lastfm' | 'manual' | 'spotify';
  syncedAt: Date;
}

export interface Scrobble {
  _id?: ObjectId;
  userId: ObjectId;
  track: Track;
  timestamp: Date;
  loved?: boolean;
  source: {
    type: 'lastfm' | 'manual' | 'spotify';
    importedAt: Date;
  };
  metadata?: {
    duration?: number;
    genre?: string[];
    tags?: string[];
  };
}

export const createScrobble = (
  userId: ObjectId,
  track: Track,
  sourceType: 'lastfm' | 'manual' | 'spotify' = 'lastfm'
): Scrobble => {
  return {
    userId,
    track,
    timestamp: new Date(),
    source: {
      type: sourceType,
      importedAt: new Date()
    }
  };
};