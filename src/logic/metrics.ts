import { TrackPlay, ArtistPlay, ListeningStats } from "../types/music"

export function calculateListeningStats(
  tracks: TrackPlay[],
  artists: ArtistPlay[]
): ListeningStats {
  const totalPlays = tracks.reduce((sum, t) => sum + t.playcount, 0)
  const uniqueTracks = tracks.length

  const repeatRatio =
    uniqueTracks === 0 ? 0 : totalPlays / uniqueTracks

  const topArtistsPlays = artists
    .slice(0, 5)
    .reduce((sum, a) => sum + a.playcount, 0)

  const totalArtistPlays = artists.reduce(
    (sum, a) => sum + a.playcount,
    0
  )

  const topArtistsShare =
    totalArtistPlays === 0 ? 0 : topArtistsPlays / totalArtistPlays

  const genreSet = new Set<string>()
  artists.forEach((a) => {
    a.tags?.forEach((tag) => genreSet.add(tag))
  })

  return {
    totalPlays,
    uniqueTracks,
    repeatRatio,
    topArtistsShare,
    uniqueGenres: genreSet.size
  }
}
