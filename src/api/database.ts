import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import type { 
  User, 
  Scrobble, 
  Reading, 
  ArtistStats, 
  GenreStats 
} from '../models/index.ts';
import { COLLECTIONS } from '../models/index.ts';

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'muzimind';

class DatabaseService {
  private static instance: DatabaseService;
  private client: MongoClient;
  private db: Db | null = null;
  
  private constructor() {
    this.client = new MongoClient(MONGODB_URI);
  }
  
  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }
  
  async connect(): Promise<void> {
    if (this.db) return;
    
    try {
      console.log('🔗 Connecting to MongoDB...');
      await this.client.connect();
      this.db = this.client.db(DB_NAME);
      console.log('✅ Connected to MongoDB:', this.db.databaseName);
      
      // Create indexes for better performance
      await this.createIndexes();
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }
  
  private async createIndexes(): Promise<void> {
    if (!this.db) return;
    
    console.log('🔧 Creating database indexes...');
    
    try {
      await this.db.collection(COLLECTIONS.SCROBBLES).createIndexes([
        { key: { userId: 1, timestamp: -1 } },
        { key: { userId: 1, 'track.artist': 1 } },
        { key: { timestamp: -1 } }
      ]);
      
      await this.db.collection(COLLECTIONS.READINGS).createIndexes([
        { key: { userId: 1, date: -1 } }
      ]);
      
      await this.db.collection(COLLECTIONS.ARTIST_STATS).createIndexes([
        { key: { userId: 1, artist: 1 }, unique: true }
      ]);
      
      await this.db.collection(COLLECTIONS.GENRE_STATS).createIndexes([
        { key: { userId: 1, genre: 1 }, unique: true }
      ]);
      
      await this.db.collection(COLLECTIONS.USERS).createIndexes([
        { key: { email: 1 }, unique: true },
        { key: { username: 1 }, unique: true }
      ]);

      await this.db.collection(COLLECTIONS.TRACK_HISTORY).createIndexes([
        { key: { userId: 1, playedAt: -1 } },
        { key: { currentlyPlaying: 1, syncedAt: -1 } }
      ]);
      
      console.log('✅ Indexes created successfully');
    } catch (error) {
      console.warn('⚠️ Could not create indexes (they may already exist):', (error as Error).message);
    }
  }
  
  // Collection getters
  get users(): Collection<User> {
    if (!this.db) throw new Error('Database not connected. Call connect() first.');
    return this.db.collection(COLLECTIONS.USERS);
  }
  
  get scrobbles(): Collection<Scrobble> {
    if (!this.db) throw new Error('Database not connected. Call connect() first.');
    return this.db.collection(COLLECTIONS.SCROBBLES);
  }
  
  get readings(): Collection<Reading> {
    if (!this.db) throw new Error('Database not connected. Call connect() first.');
    return this.db.collection(COLLECTIONS.READINGS);
  }
  
  get artistStats(): Collection<ArtistStats> {
    if (!this.db) throw new Error('Database not connected. Call connect() first.');
    return this.db.collection(COLLECTIONS.ARTIST_STATS);
  }
  
  get genreStats(): Collection<GenreStats> {
    if (!this.db) throw new Error('Database not connected. Call connect() first.');
    return this.db.collection(COLLECTIONS.GENRE_STATS);
  }

  get trackHistory(): Collection<any> {
    if (!this.db) throw new Error('Database not connected. Call connect() first.');
    return this.db.collection(COLLECTIONS.TRACK_HISTORY);
  }
  
  // User operations
  async findUserByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ email });
  }
  
  async findUserById(id: string): Promise<User | null> {
    try {
      return this.users.findOne({ _id: new ObjectId(id) });
    } catch {
      return null;
    }
  }
  
  async createUser(user: Omit<User, '_id'>): Promise<string> {
    const result = await this.users.insertOne(user as User);
    return result.insertedId.toString();
  }
  
  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    await this.users.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );
  }
  
  // Scrobble operations
  async addScrobble(scrobble: Omit<Scrobble, '_id'>): Promise<string> {
    const result = await this.scrobbles.insertOne(scrobble as Scrobble);
    return result.insertedId.toString();
  }
  
  async getRecentScrobbles(userId: string, limit: number = 50): Promise<Scrobble[]> {
    return this.scrobbles
      .find({ userId: new ObjectId(userId) })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }
  
  async getScrobblesByDateRange(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<Scrobble[]> {
    return this.scrobbles
      .find({
        userId: new ObjectId(userId),
        timestamp: { $gte: startDate, $lte: endDate }
      })
      .sort({ timestamp: -1 })
      .toArray();
  }
  
  // Reading operations
  async addReading(reading: Omit<Reading, '_id'>): Promise<string> {
    const result = await this.readings.insertOne(reading as Reading);
    return result.insertedId.toString();
  }
  
  async getLatestReading(userId: string): Promise<Reading | null> {
    return this.readings
      .find({ userId: new ObjectId(userId) })
      .sort({ date: -1 })
      .limit(1)
      .next();
  }
  
  async getUserStats(userId: string) {
    const [totalScrobbles, totalArtists, totalGenres] = await Promise.all([
      this.scrobbles.countDocuments({ userId: new ObjectId(userId) }),
      this.artistStats.countDocuments({ userId: new ObjectId(userId) }),
      this.genreStats.countDocuments({ userId: new ObjectId(userId) })
    ]);
    
    return { totalScrobbles, totalArtists, totalGenres };
  }
  
  async disconnect(): Promise<void> {
    await this.client.close();
    this.db = null;
    console.log('🔌 MongoDB connection closed');
  }
}

export const db = DatabaseService.getInstance();