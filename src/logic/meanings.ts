import { MuziMindProfile } from "./traits"

export function getMeanings(profile: MuziMindProfile) {
  const meanings: string[] = []

  if (profile.listenerStyle === "Comfort Listener") {
    meanings.push(
      "You value emotional familiarity in music",
      "Songs act as a steady presence in your life"
    )
  }

  if (profile.listenerStyle === "Explorer") {
    meanings.push(
      "You seek variety and discovery through sound",
      "Listening is a form of exploration for you"
    )
  }

  if (profile.loyaltyLevel === "High") {
    meanings.push(
      "You form strong bonds with artists you love"
    )
  }

  if (profile.genreSpread === "Wide") {
    meanings.push(
      "You enjoy moving between different musical worlds"
    )
  }

  return meanings
}
