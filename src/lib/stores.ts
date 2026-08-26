import { writable } from 'svelte/store'
import * as repo from './repo'
import sampleData from './sampleData.json'
import type { Room, Season, Site, Species, TrapCheck, TrapLocation } from './types'

export const site = writable<Site | null>(null)
export const rooms = writable<Room[]>([])
export const trapLocations = writable<TrapLocation[]>([])
export const species = writable<Species[]>([])
export const seasons = writable<Season[]>([])
export const checks = writable<TrapCheck[]>([])
export const loaded = writable(false)

export async function loadAll(): Promise<void> {
  const s = await repo.getOrCreateDefaultSite()
  site.set(s)
  const [r, tl, sp, se, ch] = await Promise.all([
    repo.listRooms(s.id),
    repo.listTrapLocationsForSite(s.id),
    repo.listSpecies(),
    repo.listSeasons(),
    repo.listChecks(),
  ])
  rooms.set(r)
  trapLocations.set(tl)
  species.set(sp)
  seasons.set(se)
  checks.set(ch)
  loaded.set(true)
}

export async function addStarterSpecies(): Promise<void> {
  const existingNames = new Set((await repo.listSpecies()).map((s) => s.commonName))
  for (const starter of sampleData.starterSpecies) {
    if (!existingNames.has(starter.commonName)) {
      await repo.createSpecies(starter)
    }
  }
  await loadAll()
}
