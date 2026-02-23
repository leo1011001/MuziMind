export * from './User.ts';
export * from './Scrobble.ts';
export * from './Reading.ts';
export * from './ArtistStats.ts';
export * from './GenreStats.ts';

// Collection names for MongoDB
export const COLLECTIONS = {
  USERS: 'users',
  SCROBBLES: 'scrobbles',
  READINGS: 'readings',
  ARTIST_STATS: 'artist_stats',
  GENRE_STATS: 'genre_stats',
  TRACK_HISTORY: 'track_history'
} as const;