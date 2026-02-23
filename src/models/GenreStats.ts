import { ObjectId } from 'mongodb';

export interface GenreStats {
  _id?: ObjectId;
  userId: ObjectId;
  genre: string;
  playCount: number;
  topArtists: string[];
  lastUpdated: Date;
}

export const createGenreStats = (
  userId: ObjectId,
  genre: string
): GenreStats => {
  return {
    userId,
    genre,
    playCount: 0,
    topArtists: [],
    lastUpdated: new Date()
  };
};