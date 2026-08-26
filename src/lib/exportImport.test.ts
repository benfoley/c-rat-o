// @vitest-environment node
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDbForTests } from './db'
import { exportBundle, importBundle, resetAllData } from './exportImport'
import * as repo from './repo'

beforeEach(() => {
  indexedDB = new IDBFactory()
  resetDbForTests()
})

describe('export/import round trip', () => {
  it('round trips all entities including a photo blob', async () => {
    const site = await repo.getOrCreateDefaultSite('CALL Archive')
    const room = await repo.createRoom({ siteId: site.id, name: 'Room 1', code: 'R1' })
    const trap = await repo.createTrapLocation({ room, x: 10, y: 20 })
    const species = await repo.createSpecies({ commonName: 'Silverfish' })
    const season = await repo.createSeason({ name: 'Wet', startDate: '2026-11-01', endDate: '2027-04-30' })
    const check = await repo.createCheck({
      trapLocationId: trap.id,
      dateChecked: '2026-06-01',
      observations: [{ id: 'o1', speciesId: species.id, lifecycleStage: 'adult', quantity: 3 }],
    })
    const photoBlob = new Blob(['hello-bytes'], { type: 'image/png' })
    const photo = await repo.savePhoto(check.id, photoBlob)

    const bundle = await exportBundle()
    expect(bundle.sites).toHaveLength(1)
    expect(bundle.photoBlobs[photo.blobKey]).toMatch(/^data:image\/png;base64,/)

    // wipe and reimport into a fresh database
    indexedDB = new IDBFactory()
    resetDbForTests()
    await importBundle(bundle)

    expect(await repo.listRooms(site.id)).toHaveLength(1)
    expect(await repo.listTrapLocations(room.id)).toHaveLength(1)
    expect(await repo.listSpecies()).toHaveLength(1)
    expect(await repo.listSeasons()).toHaveLength(1)
    expect(await repo.listChecks()).toHaveLength(1)

    const restoredBlob = await repo.getPhotoBlob(photo.blobKey)
    expect(restoredBlob?.type).toBe('image/png')
    const text = await restoredBlob!.text()
    expect(text).toBe('hello-bytes')
    void season
  })

  it('import replaces existing data rather than merging', async () => {
    await repo.createSpecies({ commonName: 'Old species' })
    const bundle = await exportBundle()

    indexedDB = new IDBFactory()
    resetDbForTests()
    await repo.createSpecies({ commonName: 'Should be wiped' })
    await importBundle(bundle)

    const all = await repo.listSpecies()
    expect(all.map((s) => s.commonName)).toEqual(['Old species'])
  })
})

describe('resetAllData', () => {
  it('clears every store', async () => {
    const site = await repo.getOrCreateDefaultSite('CALL Archive')
    const room = await repo.createRoom({ siteId: site.id, name: 'Room 1', code: 'R1' })
    const trap = await repo.createTrapLocation({ room, x: 10, y: 20 })
    const species = await repo.createSpecies({ commonName: 'Silverfish' })
    await repo.createSeason({ name: 'Wet', startDate: '2026-11-01', endDate: '2027-04-30' })
    const check = await repo.createCheck({
      trapLocationId: trap.id,
      dateChecked: '2026-06-01',
      observations: [{ id: 'o1', speciesId: species.id, lifecycleStage: 'adult', quantity: 3 }],
    })
    await repo.savePhoto(check.id, new Blob(['x'], { type: 'image/png' }))

    await resetAllData()

    expect(await repo.listRooms(site.id)).toHaveLength(0)
    expect(await repo.listTrapLocations(room.id)).toHaveLength(0)
    expect(await repo.listSpecies()).toHaveLength(0)
    expect(await repo.listSeasons()).toHaveLength(0)
    expect(await repo.listChecks()).toHaveLength(0)

    const freshSite = await repo.getOrCreateDefaultSite('CALL Archive')
    expect(freshSite.id).not.toBe(site.id)
  })
})
