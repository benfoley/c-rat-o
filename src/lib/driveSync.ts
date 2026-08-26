import { writable } from 'svelte/store'
import * as drive from './googleDrive'
import { remoteChangedSinceLastSync } from './driveSyncPolicy'
import { exportBundle, importBundle, type DataBundle } from './exportImport'
import { loadAll } from './stores'

const CLIENT_ID_KEY = 'c-rat-o:google-client-id'
const LAST_SYNCED_REMOTE_TIME_KEY = 'c-rat-o:google-last-synced-remote-time'
const LAST_SYNCED_AT_KEY = 'c-rat-o:google-last-synced-at'

/**
 * A client ID baked into the build (via `VITE_GOOGLE_CLIENT_ID`) lets every
 * user just sign in, with no per-user Google Cloud Console setup. Falls back
 * to a manually-entered client ID (stored locally) when the app is built or
 * forked without one, e.g. for local development.
 */
export const bakedInClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
export const hasBakedInClientId = bakedInClientId.length > 0

export const driveClientId = writable<string>(
  hasBakedInClientId
    ? bakedInClientId
    : typeof window !== 'undefined'
      ? (window.localStorage.getItem(CLIENT_ID_KEY) ?? '')
      : '',
)
export const driveConnected = writable(false)
export const driveLastSyncedAt = writable<string | null>(
  typeof window !== 'undefined' ? window.localStorage.getItem(LAST_SYNCED_AT_KEY) : null,
)

export function setClientId(id: string): void {
  window.localStorage.setItem(CLIENT_ID_KEY, id)
  driveClientId.set(id)
}

function getLastSyncedRemoteTime(): string | null {
  return window.localStorage.getItem(LAST_SYNCED_REMOTE_TIME_KEY)
}

function recordSync(remoteModifiedTime: string): void {
  const now = new Date().toISOString()
  window.localStorage.setItem(LAST_SYNCED_REMOTE_TIME_KEY, remoteModifiedTime)
  window.localStorage.setItem(LAST_SYNCED_AT_KEY, now)
  driveLastSyncedAt.set(now)
}

async function getAuth(clientId: string, silent: boolean) {
  const cached = drive.getCachedAuth()
  if (cached) return cached
  return drive.requestAccessToken(clientId, { silent })
}

/**
 * Finds the backup file inside the app's Drive folder. If it's not there but
 * exists at the Drive root (from before folder support), it's moved into the
 * folder rather than left behind or duplicated.
 */
async function findOrMigrateBackupFile(accessToken: string, folderId: string): Promise<drive.DriveFileRef | null> {
  const existing = await drive.findBackupFile(accessToken, folderId)
  if (existing) return existing
  const legacy = await drive.findBackupFile(accessToken)
  if (!legacy) return null
  await drive.moveFileToFolder(accessToken, legacy.id, folderId)
  return legacy
}

export async function connect(clientId: string): Promise<void> {
  setClientId(clientId)
  await drive.requestAccessToken(clientId, { silent: false })
  driveConnected.set(true)
}

export function disconnect(): void {
  drive.signOut()
  driveConnected.set(false)
}

/** Thrown when a push/pull would clobber a newer remote change; callers should confirm and retry with `force: true`. */
export class RemoteChangedError extends Error {
  constructor() {
    super('The Drive backup has changed since this device last synced.')
    this.name = 'RemoteChangedError'
  }
}

export async function pushToDrive(clientId: string, opts: { force?: boolean } = {}): Promise<void> {
  const auth = await getAuth(clientId, true)
  const folderId = await drive.findOrCreateFolder(auth.accessToken)
  const existing = await findOrMigrateBackupFile(auth.accessToken, folderId)

  if (existing && !opts.force && remoteChangedSinceLastSync(getLastSyncedRemoteTime(), existing.modifiedTime)) {
    throw new RemoteChangedError()
  }

  const bundle = await exportBundle()
  const content = JSON.stringify(bundle)
  const result = existing
    ? await drive.updateFile(auth.accessToken, existing.id, content)
    : await drive.createFile(auth.accessToken, content, folderId)
  recordSync(result.modifiedTime)
}

export async function pullFromDrive(clientId: string): Promise<void> {
  const auth = await getAuth(clientId, true)
  const folderId = await drive.findOrCreateFolder(auth.accessToken)
  const existing = await findOrMigrateBackupFile(auth.accessToken, folderId)
  if (!existing) {
    throw new Error('No backup file found in Drive yet — push from another device first.')
  }
  const content = await drive.downloadFile(auth.accessToken, existing.id)
  const bundle = JSON.parse(content) as DataBundle
  await importBundle(bundle)
  await loadAll()
  recordSync(existing.modifiedTime)
}

export interface RemoteStatus {
  exists: boolean
  modifiedTime: string | null
  changedSinceLastSync: boolean
}

export async function checkRemoteStatus(clientId: string): Promise<RemoteStatus> {
  const auth = await getAuth(clientId, true)
  const folderId = await drive.findOrCreateFolder(auth.accessToken)
  const existing = await findOrMigrateBackupFile(auth.accessToken, folderId)
  return {
    exists: !!existing,
    modifiedTime: existing?.modifiedTime ?? null,
    changedSinceLastSync: remoteChangedSinceLastSync(getLastSyncedRemoteTime(), existing?.modifiedTime ?? null),
  }
}
