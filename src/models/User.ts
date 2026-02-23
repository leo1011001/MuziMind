import { ObjectId } from 'mongodb';

export interface UserPreferences {
  language: 'bg' | 'en';
  theme: 'dark' | 'light';
  notifications: boolean;
  readingFrequency: 'daily' | 'weekly' | 'monthly';
}

export interface User {
  _id?: ObjectId;
  email: string;
  username: string;
  passwordHash: string;
  role?: 'user' | 'admin';
  lastfmUsername?: string;
  lastfmSessionKey?: string;
  lastfmConnectedAt?: Date;
  preferences: UserPreferences;
  createdAt: Date;
  lastLogin?: Date;
  stats?: {
    totalScrobbles: number;
    totalArtists: number;
    totalGenres: number;
  };
}

export const createDefaultUser = (email: string, username: string, passwordHash: string): User => {
  return {
    email,
    username,
    passwordHash,
    role: 'user',
    preferences: {
      language: 'bg',
      theme: 'dark',
      notifications: true,
      readingFrequency: 'daily'
    },
    createdAt: new Date(),
    stats: {
      totalScrobbles: 0,
      totalArtists: 0,
      totalGenres: 0
    }
  };
};