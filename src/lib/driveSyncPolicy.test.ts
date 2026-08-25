import { describe, expect, it } from 'vitest'
import { remoteChangedSinceLastSync } from './driveSyncPolicy'

describe('remoteChangedSinceLastSync', () => {
  it('is false when there is no remote file yet', () => {
    expect(remoteChangedSinceLastSync('2026-01-01T00:00:00.000Z', null)).toBe(false)
  })

  it('is true when we have never synced but a remote file exists', () => {
    expect(remoteChangedSinceLastSync(null, '2026-01-01T00:00:00.000Z')).toBe(true)
  })

  it('is false when remote is unchanged since last sync', () => {
    const t = '2026-01-01T00:00:00.000Z'
    expect(remoteChangedSinceLastSync(t, t)).toBe(false)
  })

  it('is true when remote is newer than our last sync', () => {
    expect(
      remoteChangedSinceLastSync('2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'),
    ).toBe(true)
  })

  it('is false when remote is older than our last sync (clock skew / stale read)', () => {
    expect(
      remoteChangedSinceLastSync('2026-01-02T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
    ).toBe(false)
  })
})
