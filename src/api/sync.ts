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
            artist: typeof nowPlaying.artist === 'string' ? nowPlaying.artist : ((nowPlaying.artist as any)?.name || nowPlaying.artist?.['#text'] || 'Unknown'),
            album: typeof nowPlaying.album === 'string' ? nowPlaying.album : ((nowPlaying.album as any)?.name || nowPlaying.album?.['#text'] || ''),
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
      await db.artistStats.updateOne(
        { _id: existingStats._id },
        {
          $inc: { playCount: 1 },
          $set: { lastPlayed: new Date() },
          $addToSet: { lovedTracks: trackName }
        }
      );
    } else {
      const artistStats: Omit<ArtistStats, '_id'> = {
        userId: new ObjectId(userId),
        artist,
        playCount: 1,
        firstPlayed: new Date(),
        lastPlayed: new Date(),
        tags: [],
        lovedTracks: [trackName]
      };
      await db.artistStats.insertOne(artistStats as ArtistStats);
    }
  }
  
  private async updateUserStats(userId: string): Promise<void> {
    const [totalScrobbles, totalArtists] = await Promise.all([
      db.scrobbles.countDocuments({ userId: new ObjectId(userId) }),
      db.artistStats.countDocuments({ userId: new ObjectId(userId) })
    ]);
    // Calculate unique tags
    const artistStats = await db.artistStats.find({ userId: new ObjectId(userId) }).toArray();
    const tagSet = new Set<string>();
    artistStats.forEach(a => a.tags?.forEach(tag => tagSet.add(tag)));
    const totalTags = tagSet.size;
    await db.updateUser(userId.toString(), {
      stats: {
        totalScrobbles,
        totalArtists,
        totalTags
      }
    });
  }
  
  async getUserListeningData(userId: string) {
    const [scrobbles, topArtistsRaw, user] = await Promise.all([
      db.getRecentScrobbles(userId, 500),
      db.artistStats
        .find({ userId: new ObjectId(userId), artist: { $exists: true, $ne: '' } })
        .sort({ playCount: -1 })
        .limit(10)
        .toArray(),
      db.findUserById(userId)
    ]);
    const topArtists = topArtistsRaw.filter(a => a.artist && a.artist.trim() !== '');
    // Calculate listening hours
    const listeningHours = Array(24).fill(0);
    scrobbles.forEach(scrobble => {
      const hour = scrobble.timestamp.getHours();
      listeningHours[hour]++;
    });
    // Aggregate top songs from scrobble history
    const songMap: Record<string, { name: string; artist: string; playCount: number }> = {};
    scrobbles.forEach(scrobble => {
      const key = `${scrobble.track.artist}|||${scrobble.track.name}`;
      if (!songMap[key]) {
        songMap[key] = { name: scrobble.track.name, artist: scrobble.track.artist, playCount: 0 };
      }
      songMap[key].playCount++;
    });
    let topSongs = Object.values(songMap)
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 10);
    // If no scrobbles in DB, fallback to Last.fm API top tracks
    if (topSongs.length === 0 && user?.lastfmUsername) {
      try {
        const { lastFMService } = await import('./lastfm');
        const topTracksResp = await lastFMService.getTopTracks(user.lastfmUsername, '7day', 10);
        const tracks = topTracksResp?.toptracks?.track || [];
        topSongs = tracks.map((t: any) => ({
          name: t.name,
          artist: typeof t.artist === 'string' ? t.artist : t.artist?.name || t.artist?.['#text'] || 'Unknown',
          playCount: parseInt(t.playcount, 10) || 0
        }));
      } catch (e) {
        console.log('Last.fm top tracks fallback failed:', e);
      }
    }
    return {
      totalScrobbles: user?.stats?.totalScrobbles || 0,
      topArtists: topArtists.map(a => ({
        name: a.artist,
        playCount: a.playCount
      })),
      topSongs,
      topTags: [],
      listeningHours,
      recentScrobbles: scrobbles.slice(0, 20)
    };
  }
  
  // calculateTopGenres removed. Use tags from ArtistStats instead.
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
  const topGenre = stats.topGenres?.[0]?.name || 'смесена музика';
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
  
  // Pick a random variation to avoid repetitive feel
  const rand = Math.floor(Math.random() * 3);
  const secondArtist = recommendedArtists[1]?.name || topArtist;
  const thirdArtist = recommendedArtists[2]?.name || secondArtist;
  
  if (peakHour === currentHour) {
    const variants = [
      `🔥 Точно сега е твоят пиков час! Перфектен момент да пуснеш ${topArtist} — твоят #{1} артист. Наслади се на ${topThreeGenres[0]}!`,
      `⚡ Ей, ${peakHour}:00 ч. е! Обикновено тук слушаш най-много. Какво ще кажеш за ${topArtist} или нещо ново от ${topThreeGenres[0]}?`,
      `🎯 Уцели пиковия си час! Сега е моментът за любимите ти — ${topArtist}, ${secondArtist} и чист ${topThreeGenres[0]} звук.`
    ];
    dailyPrediction = variants[rand];
  } else if (currentHour === secondPeak) {
    const variants = [
      `🎶 Вторият ти най-активен час е тук (${secondPeak}:00 ч.)! Идеален за ${topThreeGenres[0]} и нови открития.`,
      `💫 Около ${secondPeak}:00 ч. винаги намираш време за музика. Опитай ${secondArtist} или нещо от ${topThreeGenres[0]}.`,
      `🌟 ${secondPeak}:00 ч. — твоят скрит музикален момент. Препоръка: ${topArtist} с нотка ${topThreeGenres[0]}.`
    ];
    dailyPrediction = variants[rand];
  } else if (listeningHours[currentHour] > avgListeningsPerHour * 0.8) {
    const variants = [
      `🎵 ${timeContext.charAt(0).toUpperCase() + timeContext.slice(1)} е силно време за теб. ${topArtist} и ${topThreeGenres[0]} — класическата ти комбинация!`,
      `🎧 Статистиката показва, че обичаш да слушаш ${timeContext}. Днес пробвай ${secondArtist} за разнообразие!`,
      `💿 ${timeContext.charAt(0).toUpperCase() + timeContext.slice(1)} + ${topThreeGenres[0]} = твоята формула. Но може би ${thirdArtist} ще те изненада?`
    ];
    dailyPrediction = variants[rand];
  } else if (listeningHours[peakHour] > 0 && peakHour !== currentHour) {
    const variants = [
      `⏰ Пиковият ти час е ${peakHour}:00 ч. — до тогава разгледай ${topArtist} и ${secondArtist} за настроение!`,
      `🎼 Обикновено около ${peakHour}:00 ч. слушаш най-интензивно. Междувременно, ${topThreeGenres[0]} звучи добре за ${timeContext}.`,
      `💡 Знаеш ли, че ${peakHour}:00 ч. е твоят музикален връх? Опитай ${topArtist} или артисти подобни на ${secondArtist} сега.`
    ];
    dailyPrediction = variants[rand];
  } else {
    const variants = [
      `🎧 Добър ${currentDay} за музика! Предложение: ${topArtist} и ${topThreeGenres[0]} за перфектен саундтрак.`,
      `🎵 ${currentDay} — ден за открития. Започни с ${topArtist}, после виж какво крие ${topThreeGenres[0]}.`,
      `💿 Нов ден, нова музика! ${topArtist} е вечна класика, но ${thirdArtist} може да стане нов фаворит.`
    ];
    dailyPrediction = variants[rand];
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
    const artistDisplay = currentTrack.artist || 'Unknown';
    enhancedPrediction += ` \n🎶 Сега слушаш: "${currentTrack.name}" от ${artistDisplay}`;
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