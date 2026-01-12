import { TrackPlay, ArtistPlay } from "../types/music"

export function normalizeTopTracks(
  data: any
): TrackPlay[] {
  return data.toptracks.track.map((t: any) => ({
    track: t.name,
    artist: t.artist.name,
    playcount: Number(t.playcount)
  }))
}

export function normalizeTopArtists(
  data: any
): ArtistPlay[] {
  return data.topartists.artist.map((a: any) => ({
    artist: a.name,
    playcount: Number(a.playcount),
    tags: a.tags?.tag?.map((t: any) => t.name) ?? []
  }))
}
