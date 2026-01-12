import { ListeningStats } from "../types/music"

export type ListenerStyle =
  | "Comfort Listener"
  | "Balanced Listener"
  | "Explorer"

export type LoyaltyLevel = "High" | "Medium" | "Low"

export type MuziMindProfile = {
  listenerStyle: ListenerStyle
  loyaltyLevel: LoyaltyLevel
  genreSpread: "Narrow" | "Balanced" | "Wide"
}

export function classifyProfile(
  stats: ListeningStats
): MuziMindProfile {
  let listenerStyle: ListenerStyle = "Balanced Listener"

  if (stats.repeatRatio > 3.5) listenerStyle = "Comfort Listener"
  else if (stats.repeatRatio < 2) listenerStyle = "Explorer"

  let loyaltyLevel: LoyaltyLevel = "Medium"
  if (stats.topArtistsShare > 0.6) loyaltyLevel = "High"
  else if (stats.topArtistsShare < 0.35) loyaltyLevel = "Low"

  let genreSpread: "Narrow" | "Balanced" | "Wide" = "Balanced"
  if (stats.uniqueGenres < 6) genreSpread = "Narrow"
  else if (stats.uniqueGenres > 15) genreSpread = "Wide"

  return {
    listenerStyle,
    loyaltyLevel,
    genreSpread
  }
}
