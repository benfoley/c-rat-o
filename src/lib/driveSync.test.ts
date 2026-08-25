import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./googleDrive', () => ({
  getCachedAuth: vi.fn(() => ({ accessToken: 'cached-token', expiresAt: Date.now() + 100_000 })),
  requestAccessToken: vi.fn(),
  signOut: vi.fn(),
  findBackupFile: vi.fn(),
  downloadFile: vi.fn(),
  createFile: vi.fn(),
  updateFile: vi.fn(),
}))

vi.mock('./exportImport', () => ({
  exportBundle: vi.fn(async () => ({ version: 1, exportedAt: 'now', sites: [] })),
  importBundle: vi.fn(async () => {}),
}))

vi.mock('./stores', () => ({
  loadAll: vi.fn(async () => {}),
}))

import * as drive from './googleDrive'
import * as exportImport from './exportImport'
import * as stores from './stores'
import { RemoteChangedError, checkRemoteStatus, pullFromDrive, pushToDrive } from './driveSync'

const CLIENT_ID = 'client-abc'

beforeEach(() => {
  window.localStorage.clear()
  vi.clearAllMocks()
  vi.mocked(drive.getCachedAuth).mockReturnValue({ accessToken: 'cached-token', expiresAt: Date.now() + 100_000 })
})

describe('pushToDrive', () => {
  it('creates a new file when none exists yet', async () => {
    vi.mocked(drive.findBackupFile).mockResolvedValue(null)
    vi.mocked(drive.createFile).mockResolvedValue({ id: 'new-id', modifiedTime: '2026-01-01T00:00:00.000Z' })

    await pushToDrive(CLIENT_ID)

    expect(drive.createFile).toHaveBeenCalledWith('cached-token', expect.stringContaining('"version":1'))
    expect(drive.updateFile).not.toHaveBeenCalled()
  })

  it('updates the existing file when unchanged since last sync', async () => {
    vi.mocked(drive.findBackupFile).mockResolvedValue({ id: 'file-1', modifiedTime: '2026-01-01T00:00:00.000Z' })
    vi.mocked(drive.updateFile).mockResolvedValue({ id: 'file-1', modifiedTime: '2026-01-02T00:00:00.000Z' })
    // simulate this device having last synced at exactly the current remote time
    window.localStorage.setItem('c-rat-o:google-last-synced-remote-time', '2026-01-01T00:00:00.000Z')

    await pushToDrive(CLIENT_ID)

    expect(drive.updateFile).toHaveBeenCalledWith('cached-token', 'file-1', expect.any(String))
  })

  it('refuses to overwrite a remote file that changed since this device last synced', async () => {
    vi.mocked(drive.findBackupFile).mockResolvedValue({ id: 'file-1', modifiedTime: '2026-01-05T00:00:00.000Z' })
    window.localStorage.setItem('c-rat-o:google-last-synced-remote-time', '2026-01-01T00:00:00.000Z')

    await expect(pushToDrive(CLIENT_ID)).rejects.toThrow(RemoteChangedError)
    expect(drive.updateFile).not.toHaveBeenCalled()
    expect(drive.createFile).not.toHaveBeenCalled()
  })

  it('proceeds anyway when force is passed', async () => {
    vi.mocked(drive.findBackupFile).mockResolvedValue({ id: 'file-1', modifiedTime: '2026-01-05T00:00:00.000Z' })
    vi.mocked(drive.updateFile).mockResolvedValue({ id: 'file-1', modifiedTime: '2026-01-06T00:00:00.000Z' })
    window.localStorage.setItem('c-rat-o:google-last-synced-remote-time', '2026-01-01T00:00:00.000Z')

    await pushToDrive(CLIENT_ID, { force: true })

    expect(drive.updateFile).toHaveBeenCalled()
  })
})

describe('pullFromDrive', () => {
  it('throws when there is no backup file yet', async () => {
    vi.mocked(drive.findBackupFile).mockResolvedValue(null)
    await expect(pullFromDrive(CLIENT_ID)).rejects.toThrow(/No backup file/)
  })

  it('downloads, imports, and reloads local state', async () => {
    vi.mocked(drive.findBackupFile).mockResolvedValue({ id: 'file-1', modifiedTime: '2026-01-01T00:00:00.000Z' })
    vi.mocked(drive.downloadFile).mockResolvedValue('{"version":1,"sites":[]}')

    await pullFromDrive(CLIENT_ID)

    expect(exportImport.importBundle).toHaveBeenCalledWith({ version: 1, sites: [] })
    expect(stores.loadAll).toHaveBeenCalled()
    expect(window.localStorage.getItem('c-rat-o:google-last-synced-remote-time')).toBe('2026-01-01T00:00:00.000Z')
  })
})

describe('checkRemoteStatus', () => {
  it('reports whether the remote changed since last sync', async () => {
    vi.mocked(drive.findBackupFile).mockResolvedValue({ id: 'file-1', modifiedTime: '2026-01-05T00:00:00.000Z' })
    window.localStorage.setItem('c-rat-o:google-last-synced-remote-time', '2026-01-01T00:00:00.000Z')

    const status = await checkRemoteStatus(CLIENT_ID)

    expect(status).toEqual({ exists: true, modifiedTime: '2026-01-05T00:00:00.000Z', changedSinceLastSync: true })
  })

  it('reports no file when none exists', async () => {
    vi.mocked(drive.findBackupFile).mockResolvedValue(null)
    const status = await checkRemoteStatus(CLIENT_ID)
    expect(status).toEqual({ exists: false, modifiedTime: null, changedSinceLastSync: false })
  })
})
