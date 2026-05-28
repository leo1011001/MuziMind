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
  role?: 'user' | 'moderator' | 'admin';
  approved?: boolean;
  // Email verification
  emailVerified?: boolean;
  emailVerificationCode?: string;
  emailVerificationExpires?: Date;
  // Password reset (token stored as SHA-256 hash)
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  profile?: UserProfile;
  lastfmUsername?: string;
  lastfmSessionKey?: string;
  lastfmConnectedAt?: Date;
  preferences: UserPreferences;
  createdAt: Date;
  lastLogin?: Date;
  suspended?: boolean;
  suspendedReason?: string;
  modNotes?: string;
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