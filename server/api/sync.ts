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
      
      console.log(`Sync complete: ${newScrobbles} new scrobbles added, now playing: ${nowPlaying ? nowPlaying.name : 'none'}`);
      
      return {
        success: true,
        newScrobbles,
        syncedTracks: processedTracks.length,
        nowPlaying: nowPlayingData
      };
    } catch (error: any) {
      if (error?.lastfmUserNotFound) {
        // Username doesn't exist / is private on Last.fm — log once as warning, not error
        console.warn(`⚠️ Last.fm sync skipped for "${lastfmUsername}": user not found or profile is private.`);
        return { success: false, newScrobbles: 0, error: 'Last.fm user not found' };
      }
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
    const [scrobbles, topArtistsRaw, user, totalArtistsCount] = await Promise.all([
      db.getRecentScrobbles(userId, 500),
      db.artistStats
        .find({ userId: new ObjectId(userId), artist: { $exists: true, $ne: '' } })
        .sort({ playCount: -1 })
        .limit(10)
        .toArray(),
      db.findUserById(userId),
      db.artistStats.countDocuments({ userId: new ObjectId(userId), artist: { $exists: true, $ne: '' } })
    ]);
    let topArtists = topArtistsRaw.filter(a => a.artist && a.artist.trim() !== '');

    // Enrich artists that have no tags yet — fetch from Last.fm and persist
    const artistsNeedingTags = topArtists.filter(a => !a.tags || a.tags.length === 0).slice(0, 5);
    if (artistsNeedingTags.length > 0) {
      try {
        const { lastFMService: lfm } = await import('./lastfm');
        await Promise.allSettled(artistsNeedingTags.map(async (a) => {
          const info = await lfm.getArtistInfo(a.artist);
          const tags: string[] = (info?.artist?.tags?.tag || [])
            .map((t: any) => t.name?.toLowerCase())
            .filter(Boolean)
            .slice(0, 6);
          if (tags.length > 0) {
            await db.artistStats.updateOne(
              { _id: a._id },
              { $set: { tags } }
            );
            a.tags = tags; // update in-memory for this request
          }
        }));
      } catch { /* tag enrichment is best-effort */ }
    }
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
    const allUniqueSongs = Object.values(songMap).sort((a, b) => b.playCount - a.playCount);
    const totalUniqueSongs = allUniqueSongs.length;
    let topSongs = allUniqueSongs.slice(0, 9);
    // If no scrobbles in DB, fallback to Last.fm API top tracks
    if (topSongs.length === 0 && user?.lastfmUsername) {
      try {
        const { lastFMService } = await import('./lastfm');
        const topTracksResp = await lastFMService.getTopTracks(user.lastfmUsername, '7day', 9);
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
      totalArtists: totalArtistsCount,
      totalUniqueSongs,
      topArtists: topArtists.map(a => ({
        name: a.artist,
        playCount: a.playCount
      })),
      topSongs,
      topTags: topArtists.flatMap(a => a.tags || []).filter((t, i, arr) => arr.indexOf(t) === i).slice(0, 10),
      topTagsWithCounts: (() => {
        const tagMap: Record<string, number> = {};
        topArtists.forEach(a => (a.tags || []).forEach((tag: string) => {
          tagMap[tag] = (tagMap[tag] || 0) + a.playCount;
        }));
        return Object.entries(tagMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([tag, count]) => ({ tag, count }));
      })(),
      listeningHours,
      recentScrobbles: scrobbles.slice(0, 20)
    };
  }
  
  // calculateTopGenres removed. Use tags from ArtistStats instead.
}

export const syncService = new DataSyncService();

// ─── AI Prediction helper ─────────────────────────────────────────────────

/** Call Groq (free tier, no SDK needed — pure fetch) and return a Bulgarian prediction string. */
async function generateAIPrediction(context: {
  topArtists: Array<{ name: string; score: number; trending: boolean }>;
  topGenres: string[];
  peakHour: number;
  secondPeak: number;
  currentHour: number;
  currentDay: string;
  timePeriod: string;
  totalScrobbles: number;
  intensityLevel: string;
  listeningPatterns: { morning: number; afternoon: number; evening: number; night: number };
  currentlyPlaying: { name: string; artist: string } | null;
}): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim().length === 0 || apiKey === 'your_groq_api_key_here') {
    return null as any;
  }

  const artistList = context.topArtists
    .slice(0, 5)
    .map((a, i) => `${i + 1}. ${a.name}${a.trending ? ' (trending ↑)' : ''}`)
    .join('\n');

  const patternSummary = [
    context.listeningPatterns.morning   > 0 ? `сутрин: ${context.listeningPatterns.morning}` : null,
    context.listeningPatterns.afternoon > 0 ? `следобед: ${context.listeningPatterns.afternoon}` : null,
    context.listeningPatterns.evening   > 0 ? `вечер: ${context.listeningPatterns.evening}` : null,
    context.listeningPatterns.night     > 0 ? `нощ: ${context.listeningPatterns.night}` : null,
  ].filter(Boolean).join(', ');

  const nowPlayingLine = context.currentlyPlaying
    ? `Слуша в момента: "${context.currentlyPlaying.name}" от ${context.currentlyPlaying.artist}.`
    : '';

  const prompt = `Ти си персонален музикален асистент за MuziMind.
Напиши кратко, топло предсказание на БЪЛГАРСКИ (2–3 изречения) за слушателя.

Данни:
- ${context.currentDay}, ${context.currentHour}:00 ч. (${context.timePeriod})
- Пиков час: ${context.peakHour}:00 ч.
- Слушания по деня: ${patternSummary || 'няма данни'}
- Топ артисти:\n${artistList}
- Жанрове: ${context.topGenres.slice(0, 3).join(', ') || 'разнообразни'}
- Общо: ${context.totalScrobbles} изслушвания (${context.intensityLevel})
${nowPlayingLine}

Правила: само БЪЛГАРСКИ, имена на артисти в оригинал, топло и поетично, спомени 1–2 артиста, макс 3 изречения, без заглавия.`;

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 220,
        temperature: 0.75,
        messages: [
          {
            role: 'system',
            content: 'Пишеш САМО на БЪЛГАРСКИ ЕЗИК с КИРИЛИЦА. НИКОГА не използвай латиница за български думи. Имената на артисти остават в оригиналния им вид.'
          },
          { role: 'user', content: prompt }
        ],
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.warn('Groq prediction failed:', err);
      return null as any;
    }
    const data: any = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || null as any;
  } catch (e) {
    console.warn('Groq prediction error:', (e as any).message);
    return null as any;
  }
}

// ─── Prediction helpers ────────────────────────────────────────────────────

/** Exponential recency weight: scrobbles in the last 24 h = 1.0, fading to ~0.1 over 7 days */
function recencyWeight(ts: Date, nowMs: number): number {
  const ageHours = (nowMs - ts.getTime()) / 3_600_000;
  return Math.exp(-0.018 * ageHours); // half-life ≈ 38 h
}

/** Map hour → which time-of-day bucket (0–3) */
function timeBucket(hour: number): number {
  if (hour >= 6 && hour < 12) return 0;  // morning
  if (hour >= 12 && hour < 18) return 1; // afternoon
  if (hour >= 18 && hour < 24) return 2; // evening
  return 3;                               // night
}

// Enhanced prediction method with weighted scoring
(syncService as any).predictForUser = async function(userId: string, clientHour?: number) {
  const stats = await this.getUserListeningData(userId);

  // Pull raw scrobbles from DB (up to 7 days) for per-artist scoring
  const db_instance = (await import('./database.ts')).db;
  const nowMs = Date.now();
  const sevenDaysAgo = new Date(nowMs - 7 * 86_400_000);

  let rawScrobbles: any[] = [];
  try {
    rawScrobbles = await db_instance.scrobbles
      .find({ userId: new ObjectId(userId), timestamp: { $gte: sevenDaysAgo } })
      .sort({ timestamp: -1 })
      .limit(500)
      .toArray();
  } catch { /* fallback to empty */ }

  // Get currently playing and recent track history
  let currentlyPlaying = null;
  let recentHistory: any[] = [];
  try {
    if (db_instance.trackHistory) {
      const history = await db_instance.trackHistory
        .find({ userId: new ObjectId(userId) })
        .sort({ playedAt: -1 })
        .limit(5)
        .toArray();
      if (history.length > 0) {
        currentlyPlaying = history[0];
        recentHistory = history.slice(1, 5);
      }
    }
  } catch (e) {
    console.log('Could not fetch track history:', e);
  }

  // ── Per-artist scoring ──────────────────────────────────────────────────
  // Score = Σ recencyWeight(t) per play  +  time-of-day affinity bonus  +  velocity bonus
  const currentBucket = timeBucket(clientHour ?? new Date().getHours());
  const midpoint = new Date(nowMs - 3.5 * 86_400_000); // split 7-day window in half

  interface ArtistScore {
    name: string;
    rawCount: number;
    weightedScore: number;
    recentCount: number; // plays in last 3.5 days
    oldCount: number;    // plays in previous 3.5 days
    bucketAffinity: number; // fraction of plays in current time bucket
  }
  const artistMap: Record<string, ArtistScore> = {};

  for (const s of rawScrobbles) {
    const name: string = s.track?.artist || 'Unknown';
    if (!name || name === 'Unknown') continue;
    if (!artistMap[name]) {
      artistMap[name] = { name, rawCount: 0, weightedScore: 0, recentCount: 0, oldCount: 0, bucketAffinity: 0 };
    }
    const entry = artistMap[name];
    entry.rawCount++;
    entry.weightedScore += recencyWeight(s.timestamp, nowMs);
    if (s.timestamp >= midpoint) entry.recentCount++; else entry.oldCount++;
    if (timeBucket(new Date(s.timestamp).getHours()) === currentBucket) entry.bucketAffinity++;
  }

  // Normalise & compute final score
  const maxWeighted = Math.max(...Object.values(artistMap).map(a => a.weightedScore), 1);
  const maxBucket   = Math.max(...Object.values(artistMap).map(a => a.bucketAffinity), 1);

  const scoredArtists = Object.values(artistMap).map(a => {
    const recencyNorm  = a.weightedScore / maxWeighted;
    const bucketNorm   = a.bucketAffinity / maxBucket;
    // Velocity: positive if trending up in recent half vs older half
    const velocity = a.oldCount > 0 ? (a.recentCount - a.oldCount) / a.oldCount : (a.recentCount > 0 ? 1 : 0);
    const velocityBonus = Math.min(0.3, Math.max(-0.1, velocity * 0.2));
    const finalScore = recencyNorm * 0.55 + bucketNorm * 0.25 + velocityBonus + (a.rawCount / (rawScrobbles.length || 1)) * 0.2;
    return { name: a.name, score: parseFloat(finalScore.toFixed(4)), rawCount: a.rawCount, velocity };
  }).sort((a, b) => b.score - a.score);

  // Fall back to topArtists from stats if no scrobble data
  const recommendedArtists = scoredArtists.length > 0
    ? scoredArtists.slice(0, 5)
    : stats.topArtists.slice(0, 5).map((a: any) => ({ name: a.name, score: a.playCount, rawCount: a.playCount, velocity: 0 }));

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
  const topGenre = stats.topTags?.[0] || 'смесена музика';
  const topArtist = recommendedArtists[0]?.name || 'unknown';
  
  // Calculate listening intensity
  const totalScrobbles = totalListenings; // alias used by AI context below
  const intensityLevel = totalListenings > 1000 ? 'passionate' : totalListenings > 500 ? 'active' : 'regular';
  
  // Get top 3 genres for deeper recommendations
  const topThreeGenres = stats.topTags?.slice(0, 3) || [topGenre];
  
  // Use client's local hour if provided (server runs UTC, users may be in different TZ)
  const currentHour = (clientHour !== undefined && clientHour >= 0 && clientHour <= 23)
    ? clientHour
    : new Date().getHours();
  const currentDay = new Date().toLocaleDateString('bg-BG', { weekday: 'long' });
  
  let timeContext = '';
  let timeEmoji = '';
  
  if (currentHour >= 6 && currentHour < 9) {
    timeContext = 'рано сутрин';
    timeEmoji = 'sunrise';
  } else if (currentHour >= 9 && currentHour < 12) {
    timeContext = 'сутрин';
    timeEmoji = 'sun';
  } else if (currentHour >= 12 && currentHour < 15) {
    timeContext = 'след обяд';
    timeEmoji = 'cloud-sun';
  } else if (currentHour >= 15 && currentHour < 18) {
    timeContext = 'следобед';
    timeEmoji = 'afternoon';
  } else if (currentHour >= 18 && currentHour < 21) {
    timeContext = 'вечер';
    timeEmoji = 'sunset';
  } else if (currentHour >= 21 && currentHour < 23) {
    timeContext = 'късна вечер';
    timeEmoji = 'moon';
  } else {
    timeContext = 'нощ';
    timeEmoji = 'night';
  }

  // Calculate listening patterns
  const morningListens = listeningHours.slice(6, 12).reduce((a: number, b: number) => a + b, 0);
  const afternoonListens = listeningHours.slice(12, 18).reduce((a: number, b: number) => a + b, 0);
  const eveningListens = listeningHours.slice(18, 24).reduce((a: number, b: number) => a + b, 0);
  const nightListens = listeningHours.slice(0, 6).reduce((a: number, b: number) => a + b, 0);

  // Build scored artist list for AI
  const artistsForAI = recommendedArtists.slice(0, 5).map((a: any) => ({
    name: a.name,
    score: a.score,
    trending: typeof a.velocity === 'number' && a.velocity > 0.1
  }));

  // Try AI generation first
  let enhancedPrediction = await generateAIPrediction({
    topArtists: artistsForAI,
    topGenres: topThreeGenres,
    peakHour,
    secondPeak,
    currentHour,
    currentDay,
    timePeriod: timeContext,
    totalScrobbles,
    intensityLevel,
    listeningPatterns: { morning: morningListens, afternoon: afternoonListens, evening: eveningListens, night: nightListens },
    currentlyPlaying: currentlyPlaying ? {
      name: currentlyPlaying.track?.name || '',
      artist: currentlyPlaying.track?.artist || ''
    } : null
  });

  // Fallback to template if AI unavailable
  if (!enhancedPrediction) {
    const rand = Math.floor(Math.random() * 3);
    const secondArtist = recommendedArtists[1]?.name || topArtist;
    const thirdArtist  = recommendedArtists[2]?.name || secondArtist;
    const templates: string[][] = [
      [
        `Точно сега е твоят пиков час! Перфектен момент да пуснеш ${topArtist}. Наслади се на ${topThreeGenres[0]}!`,
        `${peakHour}:00 ч. е! Обикновено по това време слушаш най-много. Какво ще кажеш за ${topArtist}?`,
        `Уцели пиковия си час! Сега е моментът за любимите ти — ${topArtist} и ${secondArtist}.`
      ],
      [
        `${timeContext.charAt(0).toUpperCase() + timeContext.slice(1)} е силно време за теб. ${topArtist} и ${topThreeGenres[0]} — класическата ти комбинация!`,
        `Статистиката показва, че обичаш да слушаш ${timeContext}. Днес пробвай ${secondArtist} за разнообразие!`,
        `${timeContext.charAt(0).toUpperCase() + timeContext.slice(1)} + ${topThreeGenres[0]} = твоята формула.`
      ],
      [
        `Пиковият ти час е ${peakHour}:00 ч. — до тогава разгледай ${topArtist} и ${secondArtist}!`,
        `Обикновено около ${peakHour}:00 ч. слушаш най-интензивно. Междувременно ${topThreeGenres[0]} звучи добре.`,
        `Знаеш ли, че ${peakHour}:00 ч. е твоят музикален връх? Опитай ${topArtist} или ${secondArtist} сега.`
      ],
      [
        `Добър ${currentDay} за музика! Предложение: ${topArtist} и ${topThreeGenres[0]} за перфектен саундтрак.`,
        `${currentDay} — ден за открития. Започни с ${topArtist}, после виж какво крие ${topThreeGenres[0]}.`,
        `Нов ден, нова музика! ${topArtist} е вечна класика, но ${thirdArtist} може да стане нов фаворит.`
      ]
    ];
    const bucket =
      peakHour === currentHour ? 0 :
      listeningHours[currentHour] > avgListeningsPerHour * 0.8 ? 1 :
      listeningHours[peakHour] > 0 ? 2 : 3;
    enhancedPrediction = templates[bucket][rand];
    if (currentlyPlaying) {
      enhancedPrediction += `\nСега слушаш: "${currentlyPlaying.track?.name}" от ${currentlyPlaying.track?.artist}`;
    }
  }
  
  return {
    recommendedArtists: recommendedArtists.slice(0, 5).map((a: any) => ({
      name: a.name,
      score: a.score,
      trending: typeof a.velocity === 'number' && a.velocity > 0.1
    })),
    peakHour,
    secondPeak,
    topGenres: topThreeGenres,
    topTagsWithCounts: (stats as any).topTagsWithCounts || [],
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