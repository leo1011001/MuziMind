const API_KEY = import.meta.env.VITE_LASTFM_API_KEY
const BASE_URL = "https://ws.audioscrobbler.com/2.0/"

type LastFmParams = Record<string, string>

async function lastFmRequest(params: LastFmParams) {
  const url = new URL(BASE_URL)

  Object.entries({
    ...params,
    api_key: API_KEY,
    format: "json"
  }).forEach(([key, value]) =>
    url.searchParams.append(key, value)
  )

  const res = await fetch(url.toString())

  if (!res.ok) {
    throw new Error("Last.fm request failed")
  }

  return res.json()
}

/* ============================= */
/* ===== PUBLIC FUNCTIONS ====== */
/* ============================= */

export async function getTopTracks(
  username: string,
  period: "7day" | "1month" | "3month" | "6month" | "12month" | "overall" = "overall"
) {
  return lastFmRequest({
    method: "user.gettoptracks",
    user: username,
    period,
    limit: "100"
  })
}

export async function getTopArtists(
  username: string,
  period: "7day" | "1month" | "3month" | "6month" | "12month" | "overall" = "overall"
) {
  return lastFmRequest({
    method: "user.gettopartists",
    user: username,
    period,
    limit: "50"
  })
}
