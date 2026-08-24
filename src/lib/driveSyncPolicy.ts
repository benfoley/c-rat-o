/**
 * Pure decision logic for the Drive push/pull guard, kept separate from the
 * fetch/OAuth orchestration in driveSync.ts so it's trivial to unit test.
 */

/**
 * True when the remote file has changed since we last synced (pushed or
 * pulled) — i.e. pushing now would silently overwrite someone else's newer
 * edit (typically: the other device synced more recently than this one).
 */
export function remoteChangedSinceLastSync(
  lastSyncedRemoteTime: string | null,
  currentRemoteModifiedTime: string | null,
): boolean {
  if (!currentRemoteModifiedTime) return false // nothing there yet, nothing to clobber
  if (!lastSyncedRemoteTime) return true // we've never synced, remote already has something
  return new Date(currentRemoteModifiedTime).getTime() > new Date(lastSyncedRemoteTime).getTime()
}
