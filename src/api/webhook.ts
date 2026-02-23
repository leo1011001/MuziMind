import { WebSocketServer } from 'ws';

// Option B: Manual/Spotify Integration
export class MusicListener {
  private wsServer!: WebSocketServer;

  setupWebSocket() {
    this.wsServer = new WebSocketServer({ port: 8081 });

    this.wsServer.on('connection', (ws) => {
      ws.on('message', async (message) => {
        const data = JSON.parse(message.toString());

        if (data.type === 'now_playing') {
          // User is currently listening
          await this.logNowPlaying(data.userId, data.track);
        } else if (data.type === 'scrobble') {
          // Track finished playing
          await this.createScrobble(data.userId, data.track);
        }
      });
    });
  }

  // Browser extension/desktop app would send these
  async logNowPlaying(userId: string, track: any) {
    // Update "Now Playing" in UI
    // Note: Socket.IO integration would be needed for this
    console.log(`User ${userId} is now playing:`, track);
  }

  async createScrobble(userId: string, track: any) {
    // Log finished track to database or external service
    console.log(`User ${userId} scrobbled:`, track);
  }
}

// Chrome extension would capture Spotify/YouTube music
// and send to our WebSocket server