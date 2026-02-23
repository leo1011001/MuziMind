import { ObjectId } from 'mongodb';

export interface Recommendation {
  artist: string;
  track: string;
  reason: string;
}

export interface StatsSnapshot {
  totalScrobbles: number;
  topArtists: string[];
  topGenres: string[];
  discoveryRate: number;
  listeningHours: number[];
}

export interface ReadingContent {
  bg: string;
  en: string;
  mood: string;
  dominantGenre: string;
  recommendations: Recommendation[];
}

export interface Reading {
  _id?: ObjectId;
  userId: ObjectId;
  date: Date;
  type: 'daily' | 'weekly' | 'monthly' | 'discovery';
  content: ReadingContent;
  statsSnapshot: StatsSnapshot;
  viewed: boolean;
}

export const createReading = (
  userId: ObjectId,
  content: ReadingContent,
  statsSnapshot: StatsSnapshot,
  type: Reading['type'] = 'daily'
): Reading => {
  return {
    userId,
    date: new Date(),
    type,
    content,
    statsSnapshot,
    viewed: false
  };
};