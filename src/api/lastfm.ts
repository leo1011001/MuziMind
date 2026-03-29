import { ObjectId } from 'mongodb';

const API_KEY = process.env.LASTFM_API_KEY || '';
const BASE_URL = "https://ws.audioscrobbler.com/2.0/";

export interface LastFMTrack {
  name: string;
  artist: { '#text': string } | string;
  album: { '#text': string; mbid?: string; image?: Array<{ size: string; '#text': string }> } | string;
  mbid: string;
  url: string;
  date?: { '#text': string; uts: string };
  '@attr'?: { nowplaying: string };
  image?: Array<{ size: string; '#text': string }>;
}

export interface LastFMResponse {
  recenttracks: {
    track: LastFMTrack[];
    '@attr': {
      user: string;
      totalPages: string;
      page: string;
      total: string;
      perPage: string;
    };
  };
}

export interface LastFMSession {
  name: string;
  key: string;
  subscriber: number;
}

export class LastFMService {
    async getSimilarArtists(artist: string, limit: number = 5): Promise<any> {
      const params = new URLSearchParams({
        method: 'artist.getsimilar',
        artist,
        api_key: this.apiKey,
        format: 'json',
        limit: limit.toString()
      });
      const response = await fetch(`${BASE_URL}?${params}`);
      return response.json();
    }
  private apiKey: string;
  
  constructor() {
    this.apiKey = API_KEY;
    if (!this.apiKey) {
      console.warn('Last.fm API key not found in environment variables');
    }
  }
  
  async getRecentTracks(
    username: string, 
    limit: number = 50,
    page: number = 1,
    from?: number,
    to?: number
  ): Promise<LastFMTrack[]> {
    const params = new URLSearchParams({
      method: 'user.getrecenttracks',
      user: username,
      api_key: this.apiKey,
      format: 'json',
      limit: limit.toString(),
      page: page.toString(),
      extended: '1'  // Get extended data including album images
    });
    
    // Add time range if provided (unix timestamps)
    if (from) params.append('from', from.toString());
    if (to) params.append('to', to.toString());
    
    try {
      const response = await fetch(`${BASE_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Last.fm API error: ${response.statusText}`);
      }
      
      const data: LastFMResponse = await response.json();
      return Array.isArray(data.recenttracks.track) 
        ? data.recenttracks.track 
        : [data.recenttracks.track];
    } catch (error) {
      console.error('Error fetching Last.fm tracks:', error);
      throw error;
    }
  }

  // Get tracks from the last N days
  async getRecentTracksFromPeriod(
    username: string,
    days: number = 7
  ): Promise<LastFMTrack[]> {
    const now = Math.floor(Date.now() / 1000);
    const from = now - (days * 24 * 60 * 60);
    
    const allTracks: LastFMTrack[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore && page <= 10) {
      const tracks = await this.getRecentTracks(username, 200, page, from, now);
      
      if (!Array.isArray(tracks) || tracks.length === 0) {
        hasMore = false;
      } else {
        allTracks.push(...tracks);
        page++;
      }
    }
    
    return allTracks;
  }

  // Get currently playing track
  async getNowPlaying(username: string): Promise<LastFMTrack | null> {
    const params = new URLSearchParams({
      method: 'user.getrecenttracks',
      user: username,
      api_key: this.apiKey,
      format: 'json',
      limit: '1',
      extended: '1'
    });
    
    try {
      const response = await fetch(`${BASE_URL}?${params}`);
      if (!response.ok) throw new Error(`Last.fm API error: ${response.statusText}`);
      
      const data: LastFMResponse = await response.json();
      const tracks = Array.isArray(data.recenttracks.track)
        ? data.recenttracks.track
        : [data.recenttracks.track];
      
      if (tracks.length > 0 && tracks[0]['@attr']?.nowplaying === 'true') {
        return tracks[0];
      }
      return null;
    } catch (error) {
      console.error('Error fetching now playing:', error);
      return null;
    }
  }
  
  async getUserInfo(username: string): Promise<any> {
    const params = new URLSearchParams({
      method: 'user.getinfo',
      user: username,
      api_key: this.apiKey,
      format: 'json'
    });
    
    const response = await fetch(`${BASE_URL}?${params}`);
    return response.json();
  }
  
  async getTopArtists(username: string, period: string = '7day', limit: number = 10): Promise<any> {
    const params = new URLSearchParams({
      method: 'user.gettopartists',
      user: username,
      api_key: this.apiKey,
      format: 'json',
      period,
      limit: limit.toString()
    });
    
    const response = await fetch(`${BASE_URL}?${params}`);
    return response.json();
  }
  
  async getTopTracks(username: string, period: string = '7day', limit: number = 10): Promise<any> {
    const params = new URLSearchParams({
      method: 'user.gettoptracks',
      user: username,
      api_key: this.apiKey,
      format: 'json',
      period,
      limit: limit.toString()
    });

    const response = await fetch(`${BASE_URL}?${params}`);
    return response.json();
  }

  async getTopTags(username: string, limit: number = 10): Promise<any> {
    const params = new URLSearchParams({
      method: 'user.gettoptags',
      user: username,
      api_key: this.apiKey,
      format: 'json',
      limit: limit.toString()
    });

    const response = await fetch(`${BASE_URL}?${params}`);
    return response.json();
  }

  async authenticate(username: string, password: string): Promise<LastFMSession> {
    // Note: This requires the user's Last.fm password
    // In production, use OAuth or mobile auth flow
    const params = new URLSearchParams({
      method: 'auth.getMobileSession',
      username,
      password,
      api_key: this.apiKey,
      format: 'json'
    });
    
    // Generate API signature if needed (for write operations)
    const response = await fetch(`${BASE_URL}?${params}`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.message);
    }
    
    return data.session;
  }
  
  // Convert Last.fm track to our Scrobble format
  convertToScrobble(track: LastFMTrack, userId: ObjectId): any {
  const artistName = typeof track.artist === 'string' ? track.artist : track.artist['#text'];
  const albumName = typeof track.album === 'string' ? track.album : track.album['#text'];
  return {
    userId,
    track: {
      name: track.name,
      artist: artistName,
      album: albumName,
      mbid: track.mbid,
      url: track.url
    },
    timestamp: track.date ? new Date(parseInt(track.date.uts) * 1000) : new Date(),
    source: {
      type: 'lastfm' as const,
      importedAt: new Date()
    }
  };
}
}

export const lastFMService = new LastFMService();