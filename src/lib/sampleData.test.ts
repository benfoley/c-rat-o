// @vitest-environment node
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDbForTests } from './db'
import * as repo from './repo'
import { populateSampleData } from './sampleData'

beforeEach(() => {
  indexedDB = new IDBFactory()
  resetDbForTests()
})

describe('populateSampleData', () => {
  it('creates 2 seasons, 3 rooms, 2 trap locations each, and 6 observations', async () => {
    await populateSampleData()

    const seasons = await repo.listSeasons()
    expect(seasons).toHaveLength(2)

    const site = await repo.getOrCreateDefaultSite()
    const rooms = await repo.listRooms(site.id)
    expect(rooms).toHaveLength(3)

    const traps = await repo.listTrapLocationsForSite(site.id)
    expect(traps).toHaveLength(6)
    for (const room of rooms) {
      expect(traps.filter((t) => t.roomId === room.id)).toHaveLength(2)
    }

    const checks = await repo.listChecks()
    expect(checks).toHaveLength(6)
    expect(checks.every((c) => c.observations.length === 1)).toBe(true)
  })

  it('adds the starter pest species list', async () => {
    await populateSampleData()
    const species = await repo.listSpecies()
    expect(species.map((s) => s.commonName)).toContain('Silverfish')
  })

  it('is safe to run twice without duplicating seasons, rooms, traps or checks', async () => {
    await populateSampleData()
    await populateSampleData()

    expect(await repo.listSeasons()).toHaveLength(2)
    const site = await repo.getOrCreateDefaultSite()
    expect(await repo.listRooms(site.id)).toHaveLength(3)
    expect(await repo.listTrapLocationsForSite(site.id)).toHaveLength(6)
    expect(await repo.listChecks()).toHaveLength(6)
  })
})
