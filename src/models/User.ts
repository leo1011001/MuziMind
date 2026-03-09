import { ObjectId } from 'mongodb';

export interface UserPreferences {
  language: 'bg' | 'en';
  theme: 'dark' | 'light';
  notifications: boolean;
  readingFrequency: 'daily' | 'weekly' | 'monthly';
}

export interface UserProfile {
  bio?: string;
  pronouns?: string;
  nationality?: string;
  gender?: string;
  avatar?: string;
}

export interface User {
  _id?: ObjectId;
  email: string;
  username: string;
  passwordHash: string;
  role?: 'user' | 'admin';
  approved?: boolean;
  profile?: UserProfile;
  lastfmUsername?: string;
  lastfmSessionKey?: string;
  lastfmConnectedAt?: Date;
  preferences: UserPreferences;
  createdAt: Date;
  lastLogin?: Date;
  stats?: {
    totalScrobbles: number;
    totalArtists: number;
    totalTags: number;
  };
}

export const createDefaultUser = (email: string, username: string, passwordHash: string): User => {
  return {
    email,
    username,
    passwordHash,
    role: 'user',
    approved: false,
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
      totalTags: 0
    }
  };
};