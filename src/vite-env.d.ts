/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Baked-in Google OAuth client ID for Drive sync, set at build time. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
