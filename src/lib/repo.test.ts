// @vitest-environment node
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDbForTests } from './db'
import * as repo from './repo'

beforeEach(() => {
  indexedDB = new IDBFactory()
  resetDbForTests()
})

describe('sites', () => {
  it('creates a default site once and reuses it on subsequent calls', async () => {
    const first = await repo.getOrCreateDefaultSite('CALL Archive')
    const second = await repo.getOrCreateDefaultSite('CALL Archive')
    expect(second.id).toBe(first.id)
  })
})

describe('rooms and trap locations', () => {
  it('assigns sequential labels within a room', async () => {
    const site = await repo.getOrCreateDefaultSite()
    const room = await repo.createRoom({ siteId: site.id, name: 'Room 1', code: 'R1' })
    const t1 = await repo.createTrapLocation({ room, x: 10, y: 10 })
    const t2 = await repo.createTrapLocation({ room, x: 20, y: 20 })
    expect(t1.label).toBe('R1-T1')
    expect(t2.label).toBe('R1-T2')
  })

  it('relocating a trap mints a new location and retires the old one', async () => {
    const site = await repo.getOrCreateDefaultSite()
    const room = await repo.createRoom({ siteId: site.id, name: 'Room 1', code: 'R1' })
    const original = await repo.createTrapLocation({ room, x: 10, y: 10 })

    const moved = await repo.relocateTrapLocation({ room, previous: original, x: 50, y: 50 })

    expect(moved.label).toBe('R1-T2')
    expect(moved.relocatedFromId).toBe(original.id)
    expect(moved.status).toBe('active')

    const all = await repo.listTrapLocations(room.id)
    const stillThere = all.find((l) => l.id === original.id)!
    expect(stillThere.status).toBe('retired')
  })

  it('can retire and reactivate a trap location', async () => {
    const site = await repo.getOrCreateDefaultSite()
    const room = await repo.createRoom({ siteId: site.id, name: 'Room 1', code: 'R1' })
    const trap = await repo.createTrapLocation({ room, x: 10, y: 10 })

    await repo.setTrapLocationStatus(trap, 'retired')
    let [reloaded] = await repo.listTrapLocations(room.id)
    expect(reloaded.status).toBe('retired')

    await repo.setTrapLocationStatus(reloaded, 'active')
    ;[reloaded] = await repo.listTrapLocations(room.id)
    expect(reloaded.status).toBe('active')
  })
})

describe('species', () => {
  it('creates and lists species sorted by common name', async () => {
    await repo.createSpecies({ commonName: 'Silverfish' })
    await repo.createSpecies({ commonName: 'Booklouse' })
    const all = await repo.listSpecies()
    expect(all.map((s) => s.commonName)).toEqual(['Booklouse', 'Silverfish'])
  })

  it('updates a species record in place', async () => {
    const sp = await repo.createSpecies({ commonName: 'Silverfish' })
    await repo.updateSpecies({ ...sp, notes: 'common near the door' })
    const [reloaded] = await repo.listSpecies()
    expect(reloaded.notes).toBe('common near the door')
  })
})

describe('seasons', () => {
  it('creates, updates and deletes seasons', async () => {
    const season = await repo.createSeason({ name: 'Wet', startDate: '2026-11-01', endDate: '2027-04-30' })
    await repo.updateSeason({ ...season, name: 'Wet season' })
    let all = await repo.listSeasons()
    expect(all[0].name).toBe('Wet season')

    await repo.deleteSeason(season.id)
    all = await repo.listSeasons()
    expect(all).toHaveLength(0)
  })
})

describe('checks', () => {
  it('creates a check and lists it for its trap location', async () => {
    const site = await repo.getOrCreateDefaultSite()
    const room = await repo.createRoom({ siteId: site.id, name: 'Room 1', code: 'R1' })
    const trap = await repo.createTrapLocation({ room, x: 10, y: 10 })
    const species = await repo.createSpecies({ commonName: 'Silverfish' })

    await repo.createCheck({
      trapLocationId: trap.id,
      dateChecked: '2026-06-01',
      observations: [{ id: 'o1', speciesId: species.id, lifecycleStage: 'adult', quantity: 2 }],
    })

    const forTrap = await repo.listChecksForTrap(trap.id)
    expect(forTrap).toHaveLength(1)
    expect(forTrap[0].observations[0].quantity).toBe(2)

    const all = await repo.listChecks()
    expect(all).toHaveLength(1)
  })
})

describe('photos', () => {
  it('saves and retrieves a photo blob', async () => {
    const blob = new Blob(['fake-image-bytes'], { type: 'image/jpeg' })
    const photo = await repo.savePhoto('check-1', blob)

    const stored = await repo.getPhoto(photo.id)
    expect(stored?.checkId).toBe('check-1')

    const retrievedBlob = await repo.getPhotoBlob(photo.blobKey)
    expect(retrievedBlob?.type).toBe('image/jpeg')
  })

  it('deletes a photo and its blob', async () => {
    const blob = new Blob(['x'], { type: 'image/png' })
    const photo = await repo.savePhoto('check-1', blob)
    await repo.deletePhoto(photo)
    expect(await repo.getPhoto(photo.id)).toBeUndefined()
    expect(await repo.getPhotoBlob(photo.blobKey)).toBeUndefined()
  })
})
