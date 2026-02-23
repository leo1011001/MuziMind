import bcrypt from 'bcryptjs';
import { db } from './database.ts';
import type { User, UserPreferences } from '../models/User.ts';
import { createDefaultUser } from '../models/User.ts';

export class AuthService {
  private saltRounds = 10;
  
  async register(
    email: string,
    username: string,
    password: string,
    lastfmUsername?: string
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      // Check if user already exists
      const existingEmail = await db.findUserByEmail(email);
      if (existingEmail) {
        return { success: false, error: 'Потребител с този имейл вече съществува' };
      }
      
      // Check if username is taken
      const existingUsername = await db.users.findOne({ username });
      if (existingUsername) {
        return { success: false, error: 'Потребителското име е заето' };
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, this.saltRounds);
      
      // Create user
      const user = createDefaultUser(email, username, passwordHash);
      if (lastfmUsername) {
        user.lastfmUsername = lastfmUsername;
      }
      
      const userId = await db.createUser(user);
      
      return { success: true, userId };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Грешка при регистрация' };
    }
  }
  
  async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Find user
      const user = await db.findUserByEmail(email);
      if (!user) {
        return { success: false, error: 'Невалиден имейл или парола' };
      }
      
      // Check password
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return { success: false, error: 'Невалиден имейл или парола' };
      }
      
      // Update last login
      await db.updateUser(user._id!.toString(), { lastLogin: new Date() });
      
      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Грешка при вход' };
    }
  }
  
  async updatePreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<boolean> {
    try {
      // Get current user to merge preferences
      const user = await db.findUserById(userId);
      if (!user) return false;
      
      const updatedPreferences = { ...user.preferences, ...preferences };
      await db.updateUser(userId, { preferences: updatedPreferences });
      return true;
    } catch (error) {
      console.error('Update preferences error:', error);
      return false;
    }
  }
  
  async connectLastFM(
    userId: string,
    lastfmUsername: string,
    lastfmSessionKey?: string
  ): Promise<boolean> {
    try {
      const updates: any = { lastfmUsername };
      if (lastfmSessionKey) {
        updates.lastfmSessionKey = lastfmSessionKey;
        updates.lastfmConnectedAt = new Date();
      }
      
      await db.updateUser(userId, updates);
      return true;
    } catch (error) {
      console.error('Connect Last.fm error:', error);
      return false;
    }
  }
}

export const authService = new AuthService();