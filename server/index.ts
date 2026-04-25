// Load environment as the very first thing
import './loadEnv.ts';

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import {
  generateVerificationCode,
  generateResetToken,
  hashToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyEmailConfig,
} from './email.ts';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}


console.log('Loaded LASTFM_API_KEY:', process.env.LASTFM_API_KEY ? 'YES' : 'NO');
console.log('Loaded MONGODB_URI:', process.env.MONGODB_URI ? 'YES' : 'NO');

// Import database and services
import { db } from './api/database.ts';
import { authService } from './api/auth.ts';
import { syncService } from './api/sync.ts';
import { lastFMService } from './api/lastfm.ts';


const app = express();
const PORT = process.env.PORT || 3000;

// Security HTTP headers
app.use(helmet());

// Trust Railway/Vercel proxy headers
app.set('trust proxy', 1);

// Rate limiting (basic, not too strict)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://muzimind.com',
  'https://www.muzimind.com',
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow any Vercel preview deployments for this project
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));

// Fix: Ensure JSON body parsing is enabled before routes
import bodyParser from 'body-parser';
app.use(bodyParser.json());
app.use(express.json());

const isProd = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET || 'muzimind-dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  // Persist sessions in MongoDB — survives restarts, no memory leaks
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60, // 1 day in seconds
    autoRemove: 'native',
  }),
  cookie: {
    secure: isProd,
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Connect to database and seed admin user if missing.
// NOTE: Heavy work (Last.fm sync) runs AFTER the server is already listening
// to avoid blocking the HTTP server startup.
async function initServer() {
  await db.connect();
  console.log('🔗 DB connected, checking admin user...');
  verifyEmailConfig(); // non-fatal: just logs if email isn't configured

  const admin = await db.users.findOne({ role: 'admin' });

  // If the seed user exists but lost admin role, restore it quickly
  if (!admin) {
    const existingAdminUser = await db.users.findOne({ email: 'admin@localhost' });
    if (existingAdminUser) {
      await db.updateUser(existingAdminUser._id!.toString(), { role: 'admin', approved: true } as any);
      console.log('✅ Restored admin role for admin@localhost');
      return; // done synchronously
    }
  }

  // Always ensure the seed user keeps admin role (cheap check)
  const seedAdmin = await db.users.findOne({ email: 'admin@localhost' });
  if (seedAdmin && (seedAdmin.role !== 'admin' || !seedAdmin.approved)) {
    await db.updateUser(seedAdmin._id!.toString(), { role: 'admin', approved: true } as any);
    console.log('🔧 Re-applied admin role/approved to admin@localhost');
  }

  if (admin || seedAdmin) {
    console.log('✅ Admin user exists.');
    return;
  }

  // First-ever boot: create the admin user synchronously (fast — just a DB write + bcrypt)
  console.log('⚙️ Creating default admin user (admin@localhost / adminpass)');
  try {
    const lastfmUsername = 'leo1011001';
    const result = await authService.register('admin@localhost', 'admin', 'adminpass', lastfmUsername);
    if (result.success && result.userId) {
      await db.updateUser(result.userId, { role: 'admin', approved: true } as any);
      console.log('✅ Admin user created. Scheduling background Last.fm sync...');

      // Defer the expensive Last.fm calls so the HTTP server starts immediately
      setImmediate(async () => {
        try {
          const info = await lastFMService.getUserInfo(lastfmUsername);
          console.log('Last.fm info fetched for', lastfmUsername, '->', info?.user?.name || 'NO_NAME');
        } catch { /* non-fatal */ }
        try {
          await syncService.syncUserWithLastFM(result.userId!, lastfmUsername, 7);
          console.log('✅ Background initial sync for admin completed');
        } catch (e) {
          console.warn('⚠️ Background initial sync failed:', e);
        }
      });
    } else {
      console.warn('⚠️ Could not create admin user:', result.error);
    }
  } catch (e) {
    console.warn('⚠️ Admin creation error:', e);
  }
}

// Auth middleware - DEFINE THIS BEFORE ROUTES
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Не сте влезли в системата' });
  }
  next();
};

// Define all routes BEFORE calling listen
// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Try to ping the database
    await db.users.findOne({});
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: errorMessage 
    });
  }
});

// Register endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { email, username, password, lastfmUsername } = req.body;

    if (!email || !username || !password || !lastfmUsername) {
      return res.status(400).json({ error: 'Моля, попълнете всички полета включително Last.fm потребител' });
    }

    const result = await authService.register(email, username, password, lastfmUsername);
    if (!result.success || !result.userId) {
      return res.status(400).json({ error: result.error || 'Registration failed' });
    }

    // Generate and store a 6-digit verification code (expires in 24 h)
    const code = generateVerificationCode();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.updateUser(result.userId, {
      emailVerificationCode: code,
      emailVerificationExpires: expires,
      emailVerified: false,
      approved: false,
    } as any);

    // Fire-and-forget — don't block response on email delivery
    sendVerificationEmail(email, username, code).catch(err =>
      console.error('Verification email send error:', err)
    );

    res.json({
      success: true,
      pendingVerification: true,
      email,
      message: 'Регистрацията е успешна! Изпратихме верификационен код на имейла ти.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Вътрешна грешка на сървъра' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Моля, попълнете имейл и парола' });
    }
    
    const result = await authService.login(email, password);
    
    if (result.success && result.user && result.user._id) {
      // Block unverified users (admin bypasses)
      if (!result.user.emailVerified && result.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Имейлът ти не е верифициран. Провери пощата си за верификационен код.',
          code: 'EMAIL_NOT_VERIFIED',
          email: result.user.email,
        });
      }
      // Block unapproved non-admin users (legacy / manual block)
      if (!result.user.approved && result.user.role !== 'admin') {
        return res.status(403).json({ error: 'Акаунтът ви все още не е одобрен от администратор.' });
      }
      req.session.userId = result.user._id.toString();
      res.json({ 
        success: true, 
        user: {
          id: result.user._id.toString(),
          email: result.user.email,
          username: result.user.username,
          role: result.user.role,
          preferences: result.user.preferences,
          lastfmUsername: result.user.lastfmUsername,
          stats: result.user.stats
        }
      });
    } else {
      res.status(401).json({ error: result.error });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Вътрешна грешка на сървъра' });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Вътрешна грешка на сървъра' });
    }
    res.json({ success: true });
  });
});

// ── Email verification ────────────────────────────────────────────────────────

// POST /api/auth/verify-email  — submit 6-digit code
app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Имейл и код са задължителни' });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'Потребителят не е намерен' });
    }
    if (user.emailVerified) {
      return res.json({ success: true, alreadyVerified: true });
    }
    if (
      !user.emailVerificationCode ||
      user.emailVerificationCode !== code.trim() ||
      !user.emailVerificationExpires ||
      new Date() > user.emailVerificationExpires
    ) {
      return res.status(400).json({ error: 'Невалиден или изтекъл код. Провери отново или поискай нов.' });
    }

    // Mark verified & auto-approve
    await db.updateUser(user._id!.toString(), {
      emailVerified: true,
      approved: true,
      emailVerificationCode: undefined,
      emailVerificationExpires: undefined,
    } as any);

    res.json({ success: true, message: 'Имейлът е верифициран успешно! Вече можеш да влезеш.' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Вътрешна грешка на сървъра' });
  }
});

// POST /api/auth/resend-verification  — resend code (rate-limited to 1 per 2 min)
app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Имейлът е задължителен' });

    const user = await db.findUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'Потребителят не е намерен' });
    if (user.emailVerified) return res.json({ success: true, alreadyVerified: true });

    // Throttle: block resend if code was issued < 2 minutes ago.
    // Codes expire in 24h, so "issued < 2 min ago" means expires > now + 23h58m.
    const twoMinThreshold = new Date(Date.now() + (24 * 60 - 2) * 60 * 1000);
    if (user.emailVerificationExpires && user.emailVerificationExpires > twoMinThreshold) {
      return res.status(429).json({ error: 'Изчакай малко преди да поискаш нов код.' });
    }

    const code = generateVerificationCode();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.updateUser(user._id!.toString(), {
      emailVerificationCode: code,
      emailVerificationExpires: expires,
    } as any);

    sendVerificationEmail(email, user.username, code).catch(err =>
      console.error('Resend verification email error:', err)
    );

    res.json({ success: true, message: 'Нов код е изпратен на имейла ти.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Вътрешна грешка на сървъра' });
  }
});

// ── Password reset ────────────────────────────────────────────────────────────

// POST /api/auth/forgot-password  — send reset link
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Имейлът е задължителен' });

    // Always return success to prevent email enumeration
    const user = await db.findUserByEmail(email);
    if (user) {
      const token = generateResetToken();
      const tokenHash = hashToken(token);
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.updateUser(user._id!.toString(), {
        passwordResetToken: tokenHash,
        passwordResetExpires: expires,
      } as any);

      sendPasswordResetEmail(email, user.username, token).catch(err =>
        console.error('Password reset email error:', err)
      );
    }

    res.json({
      success: true,
      message: 'Ако акаунт с този имейл съществува, изпратихме линк за нулиране на паролата.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Вътрешна грешка на сървъра' });
  }
});

// POST /api/auth/reset-password  — set new password using token
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Токен и нова парола са задължителни' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Паролата трябва да е поне 6 символа' });
    }

    const tokenHash = hashToken(token);
    const user = await db.users.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Токенът е невалиден или е изтекъл. Поискай нов линк.' });
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(password, 10);

    await db.updateUser(user._id!.toString(), {
      passwordHash,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
    } as any);

    res.json({ success: true, message: 'Паролата е сменена успешно! Вече можеш да влезеш.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Вътрешна грешка на сървъра' });
  }
});

// Get current user
app.get('/api/user', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Не сте влезли в системата' });
    }
    const user = await db.findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Потребител не е намерен' });
    }
    
    // Don't send password hash
    const { passwordHash, ...userData } = user;
    res.json(userData);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Вътрешна грешка на сървъра' });
  }
});

// Sync with Last.fm
app.post('/api/sync/lastfm', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Не сте влезли в системата' });
    }
    
    const user = await db.findUserById(userId);
    
    if (!user?.lastfmUsername) {
      return res.status(400).json({ 
        error: 'Моля, свържете вашия Last.fm профил първо' 
      });
    }
    
    // Sync from last 7 days
    const result = await syncService.syncUserWithLastFM(
      req.session.userId!,
      user.lastfmUsername,
      7
    );
    
    res.json(result);
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Вътрешна грешка при синхронизация' });
  }
});

// Get user stats
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Не сте влезли в системата' });
    }
    const data = await syncService.getUserListeningData(userId);
    res.json(data);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Вътрешна грешка при зареждане на статистика' });
  }
});

// Get currently playing track
app.get('/api/now-playing', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Не сте влезли в системата' });
    }
    
    const db_instance = db;
    const trackHistory = await db_instance.trackHistory
      .find({ userId: new ObjectId(userId) })
      .sort({ playedAt: -1 })
      .limit(5)
      .toArray();
    
    const currentlyPlaying = trackHistory[0] || null;
    const recentHistory = trackHistory.slice(1, 5) || [];
    
    res.json({
      currentlyPlaying,
      recentHistory,
      lastSync: new Date()
    });
  } catch (error) {
    console.error('Get now playing error:', error);
    res.status(500).json({ error: 'Вътрешна грешка при зареждане на текущата песен' });
  }
});

// Get user profile
app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Не сте влезли в системата' });
    const user = await db.findUserById(userId);
    if (!user) return res.status(404).json({ error: 'Потребител не е намерен' });
    res.json({
      username: user.username,
      email: user.email,
      lastfmUsername: user.lastfmUsername || '',
      role: user.role || 'user',
      createdAt: user.createdAt,
      profile: user.profile || {},
      stats: user.stats || {},
      verificationStatus: (user as any).verificationStatus || 'none'
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Вътрешна грешка на сървъра' });
  }
});

// Update user profile
app.put('/api/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Не сте влезли в системата' });

    const { bio, pronouns, nationality, gender } = req.body;
    const profile: Record<string, string> = {};
    if (typeof bio === 'string') profile.bio = bio.slice(0, 500);
    if (typeof pronouns === 'string') profile.pronouns = pronouns.slice(0, 50);
    if (typeof nationality === 'string') profile.nationality = nationality.slice(0, 100);
    if (typeof gender === 'string') profile.gender = gender.slice(0, 50);

    await db.updateUser(userId, { profile } as any);
    res.json({ success: true, profile });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Вътрешна грешка на сървъра' });
  }
});

// Request profile verification
app.post('/api/profile/request-verification', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Не сте влезли в системата' });
    const user = await db.findUserById(userId);
    if (!user) return res.status(404).json({ error: 'Потребител не е намерен' });
    const currentStatus = (user as any).verificationStatus;
    if (currentStatus === 'pending') return res.status(400).json({ error: 'Вече имате чакаща заявка' });
    if (currentStatus === 'approved') return res.status(400).json({ error: 'Профилът ви вече е верифициран' });
    await db.updateUser(userId, { verificationStatus: 'pending' } as any);
    res.json({ success: true, verificationStatus: 'pending' });
  } catch (error) {
    console.error('Request verification error:', error);
    res.status(500).json({ error: 'Вътрешна грешка на сървъра' });
  }
});

// Admin: list all users
app.get('/api/admin/users', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Не сте влезли в системата' });
    const admin = await db.findUserById(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Нямате права за тази операция' });
    }
    const users = await db.users.find({}).project({ passwordHash: 0 }).toArray();
    res.json(users);
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ error: 'Вътрешна грешка на сървъра' });
  }
});

// Admin: update user (approve, set role, verify, delete)
app.put('/api/admin/users/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Не сте влезли в системата' });
    const admin = await db.findUserById(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Нямате права за тази операция' });
    }

    const targetId = String(req.params.id);
    // Prevent admin from changing their own role
    if (targetId === userId && req.body.role !== undefined) {
      return res.status(400).json({ error: 'Не можете да промените собствената си роля' });
    }
    const { role, approved, verified, verificationStatus, username, email, lastfmUsername } = req.body;
    const updates: Record<string, any> = {};
    if (role === 'user' || role === 'admin') updates.role = role;
    if (typeof approved === 'boolean') updates.approved = approved;
    if (typeof verified === 'boolean') updates.verified = verified;
    if (verificationStatus === 'approved' || verificationStatus === 'rejected' || verificationStatus === 'pending' || verificationStatus === 'none') {
      updates.verificationStatus = verificationStatus;
    }
    if (typeof username === 'string' && username.trim().length >= 3) updates.username = username.trim();
    if (typeof email === 'string' && email.includes('@')) updates.email = email.trim();
    if (typeof lastfmUsername === 'string') updates.lastfmUsername = lastfmUsername.trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Няма промени за прилагане' });
    }

    await db.updateUser(targetId, updates as any);
    res.json({ success: true });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Вътрешна грешка на сървъра' });
  }
});

// Admin: delete user
app.delete('/api/admin/users/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Не сте влезли в системата' });
    const admin = await db.findUserById(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Нямате права за тази операция' });
    }

    const targetId = String(req.params.id);
    // Prevent self-deletion
    if (targetId === userId) {
      return res.status(400).json({ error: 'Не можете да изтриете собствения си акаунт' });
    }
    await db.users.deleteOne({ _id: new ObjectId(targetId) });
    res.json({ success: true });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Вътрешна грешка на сървъра' });
  }
});

// Update preferences
app.put('/api/preferences', requireAuth, async (req, res) => {
  try {
    const { preferences } = req.body;
    const success = await authService.updatePreferences(
      req.session.userId!,
      preferences
    );
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Грешка при обновяване на настройките' });
    }
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Вътрешна грешка на сървъра' });
  }
});

// Connect Last.fm
app.post('/api/connect/lastfm', requireAuth, async (req, res) => {
  try {
    const { lastfmUsername } = req.body;
    
    if (!lastfmUsername) {
      return res.status(400).json({ error: 'Моля, въведете Last.fm потребителско име' });
    }
    
    const success = await authService.connectLastFM(req.session.userId!, lastfmUsername);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Грешка при свързване с Last.fm' });
    }
  } catch (error) {
    console.error('Connect Last.fm error:', error);
    res.status(500).json({ error: 'Вътрешна грешка на сървъра' });
  }
});

// Frontend is served by Vercel — no static file serving needed here

// Get latest reading
app.get('/api/reading/latest', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const reading = await db.getLatestReading(userId);
    if (!reading) {
      return res.status(404).json({ error: 'No reading found' });
    }

    // Return in the shape the frontend expects
    res.json({
      content: reading.content?.bg || reading.content?.en || '',
      mood: reading.content?.mood || 'balanced',
      date: reading.date?.toISOString() || new Date().toISOString(),
      recommendations: reading.content?.recommendations || []
    });
  } catch (error) {
    console.error('Get reading error:', error);
    res.status(500).json({ error: 'Error fetching reading' });
  }
});

// AI listener personality insight (quick, on-demand)
app.get('/api/reading/insight', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const user = await db.findUserById(userId);
    if (!user?.lastfmUsername) return res.status(400).json({ error: 'No Last.fm connected' });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey || groqKey === 'your_groq_api_key_here') {
      return res.status(503).json({ error: 'AI not configured' });
    }

    // Get quick stats
    const [topArtistsResp, topTagsResp] = await Promise.allSettled([
      lastFMService.getTopArtists(user.lastfmUsername, '1month', 5),
      lastFMService.getTopTags(user.lastfmUsername, 5)
    ]);

    const topArtists = (topArtistsResp.status === 'fulfilled'
      ? topArtistsResp.value?.topartists?.artist || []
      : []).slice(0, 5).map((a: any) => a.name).join(', ');

    const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 180,
        temperature: 0.85,
        messages: [
          {
            role: 'system',
            content: 'Пишеш САМО на БЪЛГАРСКИ с КИРИЛИЦА. Никога не използвай латиница за български думи. Имената на артисти остават в оригинал.'
          },
          {
            role: 'user',
            content: `Въз основа на топ артистите за последния месец: ${topArtists || 'разнообразни'}

Напиши кратка "музикална личностна характеристика" за слушателя — 2 изречения. Топло, образно, малко поетично. Без заглавия, без въведение, само характеристиката.`
          }
        ]
      })
    });

    if (!groqResp.ok) return res.status(503).json({ error: 'AI unavailable' });
    const data: any = await groqResp.json();
    const insight = data.choices?.[0]?.message?.content?.trim() || '';
    res.json({ insight });
  } catch (error) {
    console.error('Insight error:', error);
    res.status(500).json({ error: 'Error generating insight' });
  }
});

// AI-generated music wisdom quote
app.get('/api/reading/wisdom', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const user = await db.findUserById(userId);
    if (!user?.lastfmUsername) return res.status(400).json({ error: 'No Last.fm connected' });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey || groqKey === 'your_groq_api_key_here') {
      return res.status(503).json({ error: 'AI not configured' });
    }

    // Get quick stats
    const [topArtistsResp, topTracksResp] = await Promise.allSettled([
      lastFMService.getTopArtists(user.lastfmUsername, '7day', 3),
      lastFMService.getTopTracks(user.lastfmUsername, '7day', 3)
    ]);

    const topArtists = (topArtistsResp.status === 'fulfilled'
      ? topArtistsResp.value?.topartists?.artist || []
      : []).slice(0, 3).map((a: any) => a.name);

    const topTracks = (topTracksResp.status === 'fulfilled'
      ? topTracksResp.value?.toptracks?.track || []
      : []).slice(0, 3).map((t: any) => t.name);

    const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 80,
        temperature: 0.9,
        messages: [
          {
            role: 'system',
            content: 'Пишеш САМО на BULGARIAN с КИРИЛИЦА. НИКОГА не използвай латиница за български думи. Имената на артисти и песни остават в оригинал.'
          },
          {
            role: 'user',
            content: `Слушателят с топ артисти: ${topArtists.join(', ') || 'разнообразни'} и топ песни: ${topTracks.join(', ') || 'разнообразни'}.

Напиши ЕДИН ред музикална мъдрост/образ инспириран от неговия музикален свят. Поетично, кратко (макс 15 думи), личностно. Без въведение, без точка, само образът.`
          }
        ]
      })
    });

    if (!groqResp.ok) return res.status(503).json({ error: 'AI unavailable' });
    const data: any = await groqResp.json();
    const wisdom = data.choices?.[0]?.message?.content?.trim() || '';
    res.json({ wisdom });
  } catch (error) {
    console.error('Wisdom error:', error);
    res.status(500).json({ error: 'Error generating wisdom' });
  }
});

// Generate new reading using real Last.fm data
app.post('/api/reading/generate', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const user = await db.findUserById(userId);
    if (!user?.lastfmUsername) {
      return res.status(400).json({ error: 'No Last.fm account connected' });
    }

    // Fetch real data from Last.fm
    const [topArtistsResp, topTracksResp] = await Promise.all([
      lastFMService.getTopArtists(user.lastfmUsername, '7day', 5),
      lastFMService.getTopTracks(user.lastfmUsername, '7day', 10)
    ]);

    const topArtists = (topArtistsResp?.topartists?.artist || []).slice(0, 5);
    const topTracks = (topTracksResp?.toptracks?.track || []).slice(0, 10);

    // Build recommendations from top tracks
    const recommendations: Array<{artist: string; track: string; reason: string}> = [];
    for (const t of topTracks.slice(0, 3)) {
      const artistName = typeof t.artist === 'string' ? t.artist : (t.artist?.name || t.artist?.['#text'] || 'Unknown');
      recommendations.push({
        artist: artistName,
        track: t.name,
        reason: 'Топ песен от любим артист'
      });
    }

    // Add similar artists
    for (const artist of topArtists.slice(0, 3)) {
      try {
        const similarResp = await lastFMService.getSimilarArtists(artist.name, 3);
        if (similarResp?.similarartists?.artist && Array.isArray(similarResp.similarartists.artist)) {
          for (const sim of similarResp.similarartists.artist.slice(0, 1)) {
            recommendations.push({
              artist: sim.name,
              track: '',
              reason: `Подобен на ${artist.name}`
            });
          }
        }
      } catch (e) {
        // Skip if similar artists fails
      }
    }

    // Detect mood from listening patterns
    const topArtistNames = topArtists.map((a: any) => a.name).join(', ');
    const totalPlaycount = topTracks.reduce((sum: number, t: any) => sum + parseInt(t.playcount || '0'), 0);
    let mood = 'balanced';
    if (totalPlaycount > 100) mood = 'energetic';
    else if (totalPlaycount > 50) mood = 'focused';
    else if (topArtists.length <= 2) mood = 'nostalgic';
    else if (topArtists.length >= 5) mood = 'adventurous';

    // Try AI-generated reading via Groq (free, no SDK needed)
    let content = '';
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && groqKey.trim().length > 0 && groqKey !== 'your_groq_api_key_here') {
      try {
        const topTracksForPrompt = topTracks.slice(0, 5).map((t: any) => {
          const artist = typeof t.artist === 'string' ? t.artist : t.artist?.name || 'Unknown';
          return `"${t.name}" от ${artist} (${t.playcount} пъти)`;
        }).join(', ');
        const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 900,
            temperature: 0.75,
            messages: [
              {
                role: 'system',
                content: `Ти си персонален музикален асистент за MuziMind. Пишеш САМО на БЪЛГАРСКИ ЕЗИК с КИРИЛИЦА. НИКОГА не използвай латински букви за български думи — дори ако не знаеш правописа, пиши на кирилица. ЗАБРАНЕНО е използването на латински букви с диакритики (â, ô, û и подобни) за български думи. Имената на артисти и песни остават в оригиналния им вид (английски, корейски и т.н.).`
              },
              {
                role: 'user',
                content: `Напиши персонализирано музикално четене — точно 4 кратки абзаца, разделени с празен ред.

Данни:
- Топ артисти: ${topArtistNames}
- Топ песни (само за контекст): ${topTracksForPrompt}
- Слушания: ${totalPlaycount}
- Настроение: ${mood}

Абзац 1 (2 изречения): Кои 1-2 артиста доминират и какво настроение носят.
Абзац 2 (2 изречения): ${totalPlaycount} слушания — кратко за интензивността.
Абзац 3 (2 изречения): Поетичен образ от ЕДНА конкретна песен или артист. Не изреждай много песни.
Абзац 4 (1-2 изречения): Кратко пожелание за следващата седмица.

Правила: САМО кирилица за български думи. Имена в оригинал. Без заглавия и номера. Кратки ясни изречения. Не изреждай списъци от песни.`
              }
            ]
          })
        });
        if (groqResp.ok) {
          const groqData: any = await groqResp.json();
          let aiText = groqData.choices?.[0]?.message?.content?.trim() || '';
          // Strip garbled words: Latin with circumflex diacritics (â, ê, î, ô, û)
          // that indicate botched Cyrillic romanization (e.g. "sâuoka", "energiâ")
          // Circumflex accents are virtually never in English/Korean artist names
          aiText = aiText.replace(/\b\w*[\u00E2\u00EA\u00EE\u00F4\u00FB\u00C2\u00CA\u00CE\u00D4\u00DB]\w*\b/g, '').replace(/  +/g, ' ').trim();
          if (aiText) content = aiText;
        } else {
          console.warn('Groq reading failed:', await groqResp.text());
        }
      } catch (e) {
        console.warn('Groq reading error:', (e as any).message);
      }
    }
    // Fallback if AI unavailable — try to generate wisdom line via separate endpoint
    if (!content) {
      const intensityWord = totalPlaycount > 200 ? 'страст и отдаденост' : totalPlaycount > 80 ? 'любопитство и вкус' : 'нежна привързаност';
      let wisdomLine = 'Всяка песен е врата към нов свят'; // hardcoded default

      // Try to fetch AI-generated wisdom
      if (groqKey && groqKey.trim().length > 0 && groqKey !== 'your_groq_api_key_here') {
        try {
          const wisdomResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              max_tokens: 80,
              temperature: 0.9,
              messages: [
                {
                  role: 'system',
                  content: 'Пишеш САМО на BULGARIAN с КИРИЛИЦА. НИКОГА не използвай латиница за български думи. Имената на артисти остават в оригинал.'
                },
                {
                  role: 'user',
                  content: `Топ артисти: ${topArtistNames}. Напиши ЕДИН ред музикална мъдрост/образ. Кратко (макс 15 думи), поетично, без въведение, без точка.`
                }
              ]
            })
          });
          if (wisdomResp.ok) {
            const wisdomData: any = await wisdomResp.json();
            const aiWisdom = wisdomData.choices?.[0]?.message?.content?.trim() || '';
            if (aiWisdom) wisdomLine = aiWisdom;
          }
        } catch (e) {
          console.warn('Fallback wisdom generation error:', (e as any).message);
        }
      }

      content = `🎵 Тази седмица музикалният ти свят се върти около ${topArtistNames}.\n\nС ${totalPlaycount} слушания виждам ${intensityWord} към музиката — не просто фон, а истинска връзка с всяка нота.\n\n🎶 ${wisdomLine}\n\n✨ Нека следващата седмица донесе нови любимци и още повече моменти, когато музиката спира времето.`;
    }

    // Store in DB
    const { ObjectId: ObjId } = await import('mongodb');
    await db.addReading({
      userId: new ObjId(userId),
      date: new Date(),
      type: 'daily',
      content: {
        bg: content,
        en: '',
        mood,
        dominantGenre: topArtists[0]?.name || 'Unknown',
        recommendations: recommendations.slice(0, 6)
      },
      statsSnapshot: {
        totalScrobbles: totalPlaycount,
        topArtists: topArtists.map((a: any) => a.name),
        topGenres: [],
        discoveryRate: topArtists.length / 5,
        listeningHours: Array(24).fill(0)
      },
      viewed: false
    });

    res.json({
      content,
      mood,
      date: new Date().toISOString(),
      recommendations: recommendations.slice(0, 6)
    });
  } catch (error) {
    console.error('Generate reading error:', error);
    res.status(500).json({ error: 'Error generating reading' });
  }
});

// Anthropic SDK removed - all AI generation now uses Groq API (llama-3.3-70b-versatile)

// Artist spotlight — enriched artist data from TheAudioDB + Last.fm + AI
// ── Artist spotlight in-memory cache (5 min TTL) ────────────────────────────
const spotlightCache = new Map<string, { data: any; ts: number }>();
const SPOTLIGHT_TTL = 5 * 60 * 1000; // 5 minutes

// Helper: fetch with timeout
async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// GET /api/top-artists — live top 5 from Last.fm (for the stories carousel)
app.get('/api/top-artists', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Не сте влезли в системата' });
    const user = await db.findUserById(userId);
    if (!user?.lastfmUsername) return res.json([]);

    const period = (req.query.period as string) || '7day';
    const cacheKey = `top5:${user.lastfmUsername}:${period}`;
    const cached = spotlightCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < SPOTLIGHT_TTL) {
      return res.json(cached.data);
    }

    const LASTFM_KEY = process.env.LASTFM_API_KEY || '';
    const raw = await fetchWithTimeout(
      `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${encodeURIComponent(user.lastfmUsername)}&period=${period}&limit=5&api_key=${LASTFM_KEY}&format=json`
    ).then(r => r.json()).catch(() => null);

    const artists: string[] = (raw?.topartists?.artist || [])
      .slice(0, 5)
      .map((a: any) => a.name)
      .filter(Boolean);

    spotlightCache.set(cacheKey, { data: artists, ts: Date.now() });
    res.json(artists);
  } catch (error) {
    console.error('Top artists error:', error);
    res.status(500).json({ error: 'Грешка при зареждане на топ артисти' });
  }
});

app.get('/api/artist-spotlight', requireAuth, async (req, res) => {
  try {
    const rawArtists = (req.query.artists as string) || '';
    const artistNames = rawArtists.split(',').map((a: string) => a.trim()).filter(Boolean).slice(0, 8);
    if (!artistNames.length) return res.json([]);

    const LASTFM_KEY = process.env.LASTFM_API_KEY || '';
    const AUDIODB_KEY = '2'; // TheAudioDB free public key

    // Check cache for the whole set
    const cacheKey = artistNames.join('|').toLowerCase();
    const cached = spotlightCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < SPOTLIGHT_TTL) {
      return res.json(cached.data);
    }

    const results = await Promise.allSettled(
      artistNames.map(async (artist: string) => {
        // Per-artist cache check
        const artistKey = `artist:${artist.toLowerCase()}`;
        const ac = spotlightCache.get(artistKey);
        if (ac && Date.now() - ac.ts < SPOTLIGHT_TTL) return ac.data;

        // Fetch from TheAudioDB and Last.fm in parallel with timeouts
        const [audiodbRes, lastfmRes] = await Promise.allSettled([
          fetchWithTimeout(`https://www.theaudiodb.com/api/v1/json/${AUDIODB_KEY}/search.php?s=${encodeURIComponent(artist)}`, 6000)
            .then(r => r.json()),
          fetchWithTimeout(`https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_KEY}&format=json&autocorrect=1`, 6000)
            .then(r => r.json())
        ]);

        const adb = audiodbRes.status === 'fulfilled' ? audiodbRes.value?.artists?.[0] : null;
        const lfm = lastfmRes.status === 'fulfilled' ? lastfmRes.value?.artist : null;

        // Build bio — prefer TheAudioDB (longer, more factual), fall back to Last.fm
        const rawBio: string = adb?.strBiographyEN || lfm?.bio?.content || lfm?.bio?.summary || '';
        // Strip Last.fm <a> tags and trim
        const bio = rawBio
          .replace(/<a[^>]*>.*?<\/a>/gi, '')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 5000);

        // Tags / genres
        const lastfmTags: string[] = (lfm?.tags?.tag || []).map((t: any) => t.name).slice(0, 5);
        const adbGenre: string = adb?.strGenre || adb?.strStyle || '';
        const tags = lastfmTags.length ? lastfmTags : (adbGenre ? [adbGenre] : []);

        // Listeners & plays from Last.fm
        const listeners = parseInt(lfm?.stats?.listeners || '0');
        const globalPlays = parseInt(lfm?.stats?.playcount || '0');

        const baseData = {
          name: adb?.strArtist || lfm?.name || artist,
          image: adb?.strArtistThumb || adb?.strArtistBanner || '',
          country: adb?.strCountry || '',
          formedYear: adb?.intFormedYear || '',
          genre: adb?.strGenre || '',
          mood: adb?.strMood || '',
          style: adb?.strStyle || '',
          website: adb?.strWebsite || lfm?.url || '',
          bio,
          tags,
          listeners,
          globalPlays,
          lastfmUrl: lfm?.url || `https://www.last.fm/music/${encodeURIComponent(artist)}`,
        };

        // Cache per-artist result
        spotlightCache.set(`artist:${artist.toLowerCase()}`, { data: baseData, ts: Date.now() });
        return baseData;
      })
    );

    const spotlight = results
      .filter(r => r.status === 'fulfilled')
      .map((r: any) => r.value);

    // Cache the full result set
    spotlightCache.set(cacheKey, { data: spotlight, ts: Date.now() });

    res.json(spotlight);
  } catch (error) {
    console.error('Artist spotlight error:', error);
    res.status(500).json({ error: 'Грешка при зареждане на артист данни' });
  }
});

// Prediction endpoint (simple)
app.get('/api/predict', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Не сте влезли в системата' });
    // @ts-ignore - syncService gets a dynamic method
    const prediction = await (syncService as any).predictForUser(userId);
    res.json(prediction);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Грешка при генериране на прогноза' });
  }
});

// Guest stats endpoint - lightweight view from Last.fm for demo/guest mode
app.get('/api/guest-stats', async (req, res) => {
  try {
    const lastfmUsername = 'leo1011001';
    // Get top artists and some recent tracks
    const topArtistsResp = await lastFMService.getTopArtists(lastfmUsername, '7day', 10);
    const recentResp = await lastFMService.getRecentTracks(lastfmUsername, 10);

    const topArtists = (topArtistsResp?.topartists?.artist || []).slice(0, 10).map((a: any) => ({
      name: a.name,
      playCount: parseInt(a.playcount || '0')
    }));

    const recent = (recentResp || []).slice(0, 10).map((t: any) => ({
      name: t.name,
      artist: t.artist['#text'],
      album: t.album?.['#text'] || '',
      date: t.date?.['#text'] || null
    }));

    res.json({
      username: lastfmUsername,
      topArtists,
      recent
    });
  } catch (error) {
    console.error('Guest stats error:', error);
    res.status(500).json({ error: 'Could not fetch guest stats' });
  }
});

// Initialize server and start listening
console.log('🔄 Starting initServer...');
initServer()
  .catch(err => {
    // DB init failures are logged but should not block the server from starting
    console.error('⚠️ DB init error (server will still start):', err);
  })
  .then(() => {
    console.log('✅ initServer promise resolved');
    console.log('✅ Server init complete, now starting listener...');
    
    console.log('About to call app.listen on port:', PORT);
    const portNumber = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
    const server = app.listen(portNumber, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${portNumber}`);
      console.log(`📁 MongoDB database: muzimind`);
      console.log('✅ Server is READY to accept requests!');
      console.log('Server is ACTIVELY listening. Do not exit.');
    });

    // DO NOT CALL unref() - we want the server to keep the process alive
    // The server handle itself keeps the event loop alive

    console.log('✅ app.listen() call completed, server object created');

    server.on('error', (err) => {
      console.error('❌ Server error event:', err);
      // Continue running despite errors
    });

    server.on('close', () => {
      console.warn('⚠️ Server closed event fired');
    });

    // Set up a keepalive interval that won't prevent shutdown if needed
    const keepAliveInterval = setInterval(() => {
      // Do nothing, but keep process alive
      // const uptime = process.uptime();
      // if (uptime % 60 < 1) {
      //   console.log('Server still running, uptime:', uptime.toFixed(0), 'seconds');
      // }
    }, 30000); // Every 30 seconds (don't log constantly)
    
    // Keep the interval referenced so it keeps the process alive
    // Do NOT call unref() on it
    keepAliveInterval.ref();

    console.log('✅ Keep-alive interval configured');
    console.log('🎉 Backend initialization complete. Listening for incoming connections...');
  });

// Log exit event
process.on('exit', (code) => {
  console.log(`\n⚠️ Process exiting with code: ${code}\n`);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...\n');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...\n');
  process.exit(0);
});

// Prevent unhandled promise rejections from crashing the server
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled promise rejection (server will continue):', reason);
});

// Prevent uncaught exceptions from crashing the server
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught exception (server will continue):', err.message);
});
