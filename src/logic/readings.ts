import OpenAI from 'openai';
import { calculateListeningStats } from './metrics';
import { classifyProfile } from './traits';
import { db } from '../api/database';
import { ObjectId } from 'mongodb';

export class ReadingGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateReading(
    userId: string,
    language: 'bg' | 'en' = 'bg'
  ): Promise<string> {
    // Get user data
    const scrobbles = await db.getRecentScrobbles(userId, 100);
    const artistStats = await db.artistStats
      .find({ userId: new ObjectId(userId) })
      .sort({ playCount: -1 })
      .limit(10)
      .toArray();

    // Transform data to expected formats
    const trackPlays = scrobbles.map(scrobble => ({
      track: scrobble.track.name,
      artist: scrobble.track.artist,
      playcount: 1, // Each scrobble represents one play
      timestamp: scrobble.timestamp.getTime()
    }));

      const artistPlays = artistStats.map(stat => ({
        artist: stat.artist,
        playcount: stat.playCount,
        tags: stat.tags || []
      }));

    // Analyze patterns
    const metrics = calculateListeningStats(trackPlays, artistPlays);
    const traits = classifyProfile(metrics);

    // Prepare prompt for LLM
    const prompt = this.buildPrompt(metrics, traits, language);

    // Call LLM
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: language === 'bg'
            ? "Ти си забавен, музикален психолог. Даваш персонализирани музикални прочити с лека хуморна нотка, но никога не обиждаш. Използвай емоджи за забавност."
            : "You are a fun, musical psychologist. Give personalized music readings with light humor, but never offensive. Use emojis for fun."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content generated from OpenAI');
    }

    // Generate recommendations from top artists and similar artists
    const lastfmUsername = (await db.findUserById(userId))?.lastfmUsername;
    let recommendations = [];
    if (lastfmUsername) {
      const { lastFMService } = await import('../api/lastfm');
      // Get top artists
      const topArtistsResp = await lastFMService.getTopArtists(lastfmUsername, '7day', 5);
      const topArtists = (topArtistsResp?.topartists?.artist || []).slice(0, 5);
      // Get top tracks
      const topTracksResp = await lastFMService.getTopTracks(lastfmUsername, '7day', 5);
      const topTracks = (topTracksResp?.toptracks?.track || []).slice(0, 5);
      // Recommend from top tracks
      recommendations = topTracks.map((t: any) => ({
        artist: typeof t.artist === 'string' ? t.artist : t.artist['name'] || t.artist['#text'],
        track: t.name,
        reason: language === 'bg' ? 'Топ песен от любим артист' : 'Top track from favorite artist'
      }));
      // Recommend similar artists (if available)
      for (const artist of topArtists) {
        const similarResp = await lastFMService.getSimilarArtists(artist.name, 3);
        if (similarResp?.similarartists?.artist && Array.isArray(similarResp.similarartists.artist)) {
          for (const sim of similarResp.similarartists.artist.slice(0, 2)) {
            recommendations.push({
              artist: sim.name,
              track: '',
              reason: language === 'bg' ? `Подобен на ${artist.name}` : `Similar to ${artist.name}`
            });
          }
        }
      }
      // Limit to 6 recommendations
      recommendations = recommendations.slice(0, 6);
    }

    await db.addReading({
      userId: new ObjectId(userId),
      date: new Date(),
      type: 'daily',
      content: {
        bg: language === 'bg' ? content : '',
        en: language === 'en' ? content : '',
        mood: this.detectMood(metrics),
        dominantGenre: artistPlays.length > 0 ? artistPlays[0].artist : 'Unknown',
        recommendations
      },
      statsSnapshot: {
        totalScrobbles: metrics.totalPlays,
        topArtists: artistPlays.slice(0, 5).map(a => a.artist),
        topGenres: Array.from(new Set(artistPlays.flatMap(a => a.tags || []))).slice(0, 5),
          discoveryRate: Array.from(new Set(artistPlays.flatMap(a => a.tags || []))).length / Math.max(artistPlays.length, 1),
        listeningHours: Array(24).fill(0)
      },
      viewed: false
    });

    return content;
  }

  private buildPrompt(
    metrics: any,
    traits: any,
    language: string
  ): string {
    if (language === 'bg') {
      return `
        Създай забавен музикален прочит за потребител базиран на тези данни:

        Общо слушания: ${metrics.totalPlays}
        Уникални песни: ${metrics.uniqueTracks}
        Повторения: ${metrics.repeatRatio.toFixed(2)}
        Топ артисти дял: ${(metrics.topArtistsShare * 100).toFixed(1)}%
        Уникални жанрове: ${metrics.uniqueGenres}

        Личност: ${traits.listenerStyle}, ${traits.loyaltyLevel}, ${traits.genreSpread}

        Направи прочит, който:
        1. Започва със забавно наблюдение
        2. Описва музикалния им вкус с хумор
        3. Дава 2-3 препоръки за нови изпълнители
        4. Завършва с позитивно предсказание

        Пример: "Здравей, музикален алхимиче! 🎵 Виждам, че обичаш рок... Точно като мъдър старец, който знае какво харесва! 😄"

        Направи го личен, забавен, но уважителен.
      `;
    }

    return `
      Create a fun music reading for a user based on this data:

      Total plays: ${metrics.totalPlays}
      Unique tracks: ${metrics.uniqueTracks}
      Repeat ratio: ${metrics.repeatRatio.toFixed(2)}
      Top artists share: ${(metrics.topArtistsShare * 100).toFixed(1)}%
      Unique genres: ${metrics.uniqueGenres}

      Personality: ${traits.listenerStyle}, ${traits.loyaltyLevel}, ${traits.genreSpread}

      Make a reading that:
      1. Starts with a fun observation
      2. Describes their musical taste with humor
      3. Gives 2-3 recommendations for new artists
      4. Ends with a positive prediction

      Example: "Hello, musical alchemist! 🎵 I see you love rock... Just like a wise elder who knows what they like! 😄"

      Make it personal, fun, but respectful.
    `;
  }

  private detectMood(metrics: any): string {
    // Simple mood detection based on metrics
    if (metrics.repeatRatio > 3) return 'nostalgic';
    if (metrics.topArtistsShare > 0.5) return 'focused';
    if (metrics.uniqueGenres > 10) return 'adventurous';
    return 'balanced';
  }
}