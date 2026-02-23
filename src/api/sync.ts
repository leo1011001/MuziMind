import { db } from './database.ts';
import { lastFMService } from './lastfm.ts';
import type { Scrobble, TrackHistory } from '../models/Scrobble.ts';
import type { ArtistStats } from '../models';
import { ObjectId } from 'mongodb';

export class DataSyncService {
  async syncUserWithLastFM(userId: string, lastfmUsername: string, days: number = 7): Promise<{
    success: boolean;
    newScrobbles: number;
    nowPlaying?: any;
    syncedTracks?: number;
    error?: string;
  }> {
    try {
      console.log(`🔄 Syncing ${lastfmUsername} from last ${days} days...`);
      
      // Fetch tracks from last 7 days
      const tracks = await lastFMService.getRecentTracksFromPeriod(lastfmUsername, days);
      
      // Also get currently playing track
      const nowPlaying = await lastFMService.getNowPlaying(lastfmUsername);
      
      let newScrobbles = 0;
      const processedTracks: any[] = [];
      
      // Process each track
      for (const track of tracks) {
        // Skip now playing tracks (they don't have date)
        if (!track.date || track['@attr']?.nowplaying === 'true') continue;
        
        const trackTimestamp = new Date(parseInt(track.date.uts) * 1000);
        
        // Check if scrobble already exists
        const artistName = typeof track.artist === 'string' ? track.artist : track.artist['#text'];
        const albumName = typeof track.album === 'string' ? track.album : track.album['#text'];
        
        const existing = await db.scrobbles.findOne({
          userId: new ObjectId(userId),
          'track.name': track.name,
          'track.artist': artistName,
          timestamp: trackTimestamp
        });
        
        if (!existing) {
          // Create new scrobble
          const scrobble: Omit<Scrobble, '_id'> = {
            userId: new ObjectId(userId),
            track: {
              name: track.name,
              artist: artistName,
              album: albumName,
              mbid: track.mbid,
              url: track.url
            },
            timestamp: trackTimestamp,
            source: {
              type: 'lastfm',
              importedAt: new Date()
            }
          };
          
          await db.addScrobble(scrobble);
          newScrobbles++;
          processedTracks.push(scrobble.track);
          
          // Update artist stats
          await this.updateArtistStats(userId, artistName, track.name);
        }
      }
      
      // Record currently playing track in history
      let nowPlayingData = null;
      if (nowPlaying) {
        // Extract large image if available
        let imageUrl = '';
        if (Array.isArray(nowPlaying.image)) {
          const largeImage = nowPlaying.image.find((img: any) => img.size === 'large');
          imageUrl = largeImage ? largeImage['#text'] : nowPlaying.image[nowPlaying.image.length - 1]?.['#text'] || '';
        }

        nowPlayingData = {
          track: {
            name: nowPlaying.name,
            artist: typeof nowPlaying.artist === 'string' ? nowPlaying.artist : nowPlaying.artist['#text'],
            album: typeof nowPlaying.album === 'string' ? nowPlaying.album : nowPlaying.album['#text'],
            mbid: nowPlaying.mbid,
            url: nowPlaying.url,
            image: imageUrl
          },
          currentlyPlaying: true,
          playedAt: new Date()
        };
        
        // Save to track history
        await this.saveTrackToHistory(userId, nowPlayingData);
      }
      
      // Update user stats
      await this.updateUserStats(userId);
      
      console.log(`✅ Sync complete: ${newScrobbles} new scrobbles added, now playing: ${nowPlaying ? nowPlaying.name : 'none'}`);
      
      return {
        success: true,
        newScrobbles,
        syncedTracks: processedTracks.length,
        nowPlaying: nowPlayingData
      };
    } catch (error: any) {
      console.error('Sync error:', error);
      return {
        success: false,
        newScrobbles: 0,
        error: error.message || 'Unknown error'
      };
    }
  }

  private async saveTrackToHistory(userId: string, trackData: any): Promise<void> {
    try {
      const history: Omit<TrackHistory, '_id'> = {
        userId: new ObjectId(userId),
        track: trackData.track,
        currentlyPlaying: trackData.currentlyPlaying || false,
        playedAt: trackData.playedAt || new Date(),
        source: 'lastfm',
        syncedAt: new Date()
      };
      
      // Save to track_history collection
      const db_instance = (await import('./database.ts')).db;
      if (db_instance.trackHistory) {
        await db_instance.trackHistory.insertOne(history as TrackHistory);
      }
    } catch (error) {
      console.error('Error saving to track history:', error);
    }
  }
  
  private async updateArtistStats(
    userId: string,
    artist: string,
    trackName: string
  ): Promise<void> {
    const existingStats = await db.artistStats.findOne({
      userId: new ObjectId(userId),
      artist
    });
    
    if (existingStats) {
      // Update existing
      await db.artistStats.updateOne(
        { _id: existingStats._id },
        {
          $inc: { playCount: 1 },
          $set: { lastPlayed: new Date() },
          $addToSet: { lovedTracks: trackName }
        }
      );
    } else {
      // Create new
      const artistStats: Omit<ArtistStats, '_id'> = {
        userId: new ObjectId(userId),
        artist,
        playCount: 1,
        firstPlayed: new Date(),
        lastPlayed: new Date(),
        genres: [],
        tags: [],
        lovedTracks: [trackName]
      };
      
      await db.artistStats.insertOne(artistStats as ArtistStats);
    }
  }
  
  private async updateUserStats(userId: string): Promise<void> {
    const [totalScrobbles, totalArtists, totalGenres] = await Promise.all([
      db.scrobbles.countDocuments({ userId: new ObjectId(userId) }),
      db.artistStats.countDocuments({ userId: new ObjectId(userId) }),
      db.genreStats.countDocuments({ userId: new ObjectId(userId) })
    ]);
    
    await db.updateUser(userId.toString(), {
      stats: {
        totalScrobbles,
        totalArtists,
        totalGenres
      }
    });
  }
  
  async getUserListeningData(userId: string) {
    const [scrobbles, topArtists, user] = await Promise.all([
      db.getRecentScrobbles(userId, 100),
      db.artistStats
        .find({ userId: new ObjectId(userId) })
        .sort({ playCount: -1 })
        .limit(10)
        .toArray(),
      db.findUserById(userId)
    ]);
    
    // Calculate listening hours
    const listeningHours = Array(24).fill(0);
    scrobbles.forEach(scrobble => {
      const hour = scrobble.timestamp.getHours();
      listeningHours[hour]++;
    });
    
    // Calculate top genres (simplified - would need genre data)
    const topGenres = await this.calculateTopGenres(userId);
    
    return {
      totalScrobbles: user?.stats?.totalScrobbles || 0,
      topArtists: topArtists.map(a => ({
        name: a.artist,
        playCount: a.playCount
      })),
      topGenres,
      listeningHours,
      recentScrobbles: scrobbles.slice(0, 20)
    };
  }
  
  private async calculateTopGenres(userId: string): Promise<Array<{name: string, playCount: number}>> {
    const genres = await db.genreStats
      .find({ userId: new ObjectId(userId) })
      .sort({ playCount: -1 })
      .limit(5)
      .toArray();
    
    return genres.map(g => ({
      name: g.genre,
      playCount: g.playCount
    }));
  }
}

export const syncService = new DataSyncService();

// Enhanced prediction method with personalization and track history
(syncService as any).predictForUser = async function(userId: string) {
  // Gather top artists and listening hour distribution
  const stats = await this.getUserListeningData(userId);

  // Get currently playing and recent track history
  const db_instance = (await import('./database.ts')).db;
  let currentlyPlaying = null;
  let recentHistory: any[] = [];
  
  try {
    if (db_instance.trackHistory) {
      const history = await db_instance.trackHistory
        .find({ userId: new ObjectId(userId) })
        .sort({ playedAt: -1 })
        .limit(5)
        .toArray();
      
      if (history && history.length > 0) {
        currentlyPlaying = history[0];
        recentHistory = history.slice(1, 5); // Last 4 before current
      }
    }
  } catch (e) {
    console.log('Could not fetch track history:', e);
  }

  // Recommend top 5 artists
  const recommendedArtists = stats.topArtists.slice(0, 5).map((a: any) => ({ name: a.name, score: a.playCount }));

  // Predict peak hour (hour with highest listens)
  const listeningHours = stats.listeningHours || [];
  let peakHour = 0;
  let peakCount = -1;
  let secondPeak = 0;
  listeningHours.forEach((c: number, i: number) => {
    if (c > peakCount) { 
      secondPeak = peakHour;
      peakCount = c; 
      peakHour = i; 
    }
  });

  // Analyze listening pattern
  const totalListenings = stats.totalScrobbles || 0;
  const avgListeningsPerHour = totalListenings / 24;
  const topGenre = stats.topGenres?.[0]?.name || 'diverse';
  const topArtist = recommendedArtists[0]?.name || 'unknown';
  
  // Calculate listening intensity
  const intensityLevel = totalListenings > 1000 ? 'passionate' : totalListenings > 500 ? 'active' : 'regular';
  
  // Get top 3 genres for deeper recommendations
  const topThreeGenres = stats.topGenres?.slice(0, 3).map((g: any) => g.name) || [topGenre];
  
  // Generate personalized predictions based on time of day
  const currentHour = new Date().getHours();
  const currentDay = new Date().toLocaleDateString('bg-BG', { weekday: 'long' });
  
  let timeContext = '';
  let timeEmoji = '';
  
  if (currentHour >= 6 && currentHour < 9) {
    timeContext = 'рано сутрин';
    timeEmoji = '🌅';
  } else if (currentHour >= 9 && currentHour < 12) {
    timeContext = 'сутрин';
    timeEmoji = '☀️';
  } else if (currentHour >= 12 && currentHour < 15) {
    timeContext = 'след обяд';
    timeEmoji = '🌤️';
  } else if (currentHour >= 15 && currentHour < 18) {
    timeContext = 'следобед';
    timeEmoji = '🌞';
  } else if (currentHour >= 18 && currentHour < 21) {
    timeContext = 'вечер';
    timeEmoji = '🌆';
  } else if (currentHour >= 21 && currentHour < 23) {
    timeContext = 'късна вечер';
    timeEmoji = '🌙';
  } else {
    timeContext = 'нощ';
    timeEmoji = '🌃';
  }

  // Create personalized daily prediction message
  let dailyPrediction = '';
  
  if (peakHour === currentHour) {
    dailyPrediction = `${timeEmoji} Сега е твоят ПИКОВ час за слушане! Това е перфектен момент за ${topArtist} или ${topThreeGenres[0]} музика. Наслаждай се!`;
  } else if (currentHour === secondPeak) {
    dailyPrediction = `🎯 Това е твоят втори най-активен час (обикновено слушаш много около ${secondPeak}:00). Сега е идеално време за музика - препоръчаме ${topGenre}!`;
  } else if (listeningHours[currentHour] > avgListeningsPerHour * 0.8) {
    dailyPrediction = `🎵 ${timeContext} обикновено е когато много слушаш. Сега би бил добър момент за ${topThreeGenres[0]} или ${topThreeGenres[1]}. Вкус: ${intensityLevel}!`;
  } else if (listeningHours[peakHour] > 0 && peakHour !== currentHour) {
    dailyPrediction = `💿 Обикновено слушаш най-много около ${peakHour}:00. Предложение: слушай още ${topArtist} и ${topThreeGenres.join(', ')} ${timeContext}!`;
  } else {
    dailyPrediction = `🎧 ${topThreeGenres.length > 0 ? `Днес е добър ден за ${topThreeGenres[0]}` : 'Днес е добър ден за музика'}. Твоята музикална дейност е ${intensityLevel}. Насладиха й ${currentDay}!`;
  }

  // Calculate listening patterns
  const morningListens = listeningHours.slice(6, 12).reduce((a: number, b: number) => a + b, 0);
  const afternoonListens = listeningHours.slice(12, 18).reduce((a: number, b: number) => a + b, 0);
  const eveningListens = listeningHours.slice(18, 24).reduce((a: number, b: number) => a + b, 0);
  const nightListens = listeningHours.slice(0, 6).reduce((a: number, b: number) => a + b, 0);
  
  // Enhance prediction with currently playing track
  let enhancedPrediction = dailyPrediction;
  if (currentlyPlaying) {
    const currentTrack = currentlyPlaying.track;
    enhancedPrediction += ` \n🎶 Сега слушаш: "${currentTrack.name}" от ${currentTrack.artist}`;
  }
  
  return {
    recommendedArtists: recommendedArtists.slice(0, 3), // Top 3 for conciseness
    peakHour,
    secondPeak,
    topGenres: topThreeGenres,
    topArtist,
    totalScrobbles: stats.totalScrobbles,
    dailyPrediction: enhancedPrediction,
    intensityLevel,
    currentlyPlaying: currentlyPlaying ? {
      track: currentlyPlaying.track,
      playedAt: currentlyPlaying.playedAt,
      syncedAt: currentlyPlaying.syncedAt
    } : null,
    recentHistory: recentHistory.map((h: any) => ({
      track: h.track,
      playedAt: h.playedAt
    })),
    listeningPatterns: {
      morning: morningListens,
      afternoon: afternoonListens,
      evening: eveningListens,
      night: nightListens
    },
    currentTimeContext: { hour: currentHour, period: timeContext, emoji: timeEmoji }
  };
};