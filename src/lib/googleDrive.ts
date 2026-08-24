/**
 * Minimal client-side wrapper around Google Identity Services (OAuth) and
 * the Drive v3 REST API. No SDK, no backend — just the token flow plus
 * fetch calls, kept this way so the whole app stays a static site.
 *
 * Uses the `drive.file` scope: the app can only see/modify files it
 * created itself, never the user's wider Drive.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client'
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files'
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files'
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const UPLOAD_BOUNDARY = 'c-rat-o-multipart-boundary'

export const BACKUP_FILENAME = 'c-rat-o-backup.json'

interface GoogleTokenResponse {
  access_token?: string
  expires_in?: string | number
  error?: string
}

interface GoogleTokenClient {
  requestAccessToken(opts?: { prompt?: string }): void
}

interface GoogleAccountsOAuth2 {
  initTokenClient(config: {
    client_id: string
    scope: string
    callback: (resp: GoogleTokenResponse) => void
    error_callback?: (err: { message?: string; type?: string }) => void
  }): GoogleTokenClient
  revoke(token: string, done: () => void): void
}

declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleAccountsOAuth2 } }
  }
}

let gisLoadPromise: Promise<void> | null = null

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (!gisLoadPromise) {
    gisLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = GIS_SRC
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
      document.head.appendChild(script)
    })
  }
  return gisLoadPromise
}

export interface DriveAuth {
  accessToken: string
  expiresAt: number
}

let currentAuth: DriveAuth | null = null

/** An unexpired cached token, if we have one — avoids re-prompting for every call. */
export function getCachedAuth(): DriveAuth | null {
  if (currentAuth && currentAuth.expiresAt > Date.now() + 30_000) return currentAuth
  return null
}

export function clearCachedAuth(): void {
  currentAuth = null
}

/**
 * Requests an access token. With `silent: true` this tries not to show any
 * UI (works once the user has already granted consent this session);
 * otherwise it shows the normal Google consent prompt.
 */
export async function requestAccessToken(
  clientId: string,
  opts: { silent?: boolean } = {},
): Promise<DriveAuth> {
  await loadGis()
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error ?? 'Google sign-in did not return a token'))
          return
        }
        const auth: DriveAuth = {
          accessToken: resp.access_token,
          expiresAt: Date.now() + Number(resp.expires_in ?? 3600) * 1000,
        }
        currentAuth = auth
        resolve(auth)
      },
      error_callback: (err) => reject(new Error(err.message ?? 'Google sign-in failed')),
    })
    client.requestAccessToken({ prompt: opts.silent ? '' : 'consent' })
  })
}

export function signOut(): void {
  if (currentAuth && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(currentAuth.accessToken, () => {})
  }
  currentAuth = null
}

async function driveFetch(accessToken: string, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Drive API error ${res.status}: ${text}`)
  }
  return res
}

export interface DriveFileRef {
  id: string
  modifiedTime: string
}

export function buildFindBackupFileUrl(filename = BACKUP_FILENAME): string {
  const q = encodeURIComponent(`name = '${filename}' and trashed = false`)
  return `${DRIVE_FILES_URL}?q=${q}&fields=files(id,modifiedTime)&spaces=drive`
}

export async function findBackupFile(accessToken: string): Promise<DriveFileRef | null> {
  const res = await driveFetch(accessToken, buildFindBackupFileUrl())
  const data = (await res.json()) as { files?: DriveFileRef[] }
  return data.files?.[0] ?? null
}

export async function downloadFile(accessToken: string, fileId: string): Promise<string> {
  const res = await driveFetch(accessToken, `${DRIVE_FILES_URL}/${fileId}?alt=media`)
  return res.text()
}

export function buildMultipartCreateBody(content: string, filename = BACKUP_FILENAME): string {
  const metadata = { name: filename, mimeType: 'application/json' }
  return (
    `--${UPLOAD_BOUNDARY}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${UPLOAD_BOUNDARY}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${content}\r\n` +
    `--${UPLOAD_BOUNDARY}--`
  )
}

export async function createFile(accessToken: string, content: string): Promise<DriveFileRef> {
  const res = await driveFetch(accessToken, `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,modifiedTime`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${UPLOAD_BOUNDARY}` },
    body: buildMultipartCreateBody(content),
  })
  return res.json()
}

export async function updateFile(accessToken: string, fileId: string, content: string): Promise<DriveFileRef> {
  const res = await driveFetch(
    accessToken,
    `${DRIVE_UPLOAD_URL}/${fileId}?uploadType=media&fields=id,modifiedTime`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: content,
    },
  )
  return res.json()
}
