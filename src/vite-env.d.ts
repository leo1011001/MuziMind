/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_LASTFM_API_KEY: string
  readonly VITE_LASTFM_SHARED_SECRET: string
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_MONGODB_URI: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}