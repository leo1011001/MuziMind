import { ObjectId } from 'mongodb';

export interface ArtistStats {
  _id?: ObjectId;
  userId: ObjectId;
  artist: string;
  playCount: number;
  firstPlayed: Date;
  lastPlayed: Date;
  tags: string[];
  lovedTracks: string[];
}

export const createArtistStats = (
  userId: ObjectId,
  artist: string
): ArtistStats => {
  return {
    userId,
    artist,
    playCount: 0,
    firstPlayed: new Date(),
    lastPlayed: new Date(),
    tags: [],
    lovedTracks: []
  };
};