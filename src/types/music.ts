export type TrackPlay = {
  track: string
  artist: string
  playcount: number
  timestamp?: number
}

export type ArtistPlay = {
  artist: string
  playcount: number
  tags?: string[]
}

export type ListeningStats = {
  totalPlays: number
  uniqueTracks: number
  repeatRatio: number
  topArtistsShare: number
  uniqueGenres: number
}
