import { v4 as uuid } from 'uuid'
import { getDb } from './db'
import { buildTrapLabel, nextTrapNumber } from './trapLabel'
import type {
  Photo,
  Room,
  Season,
  Site,
  Species,
  TrapCheck,
  TrapLocation,
} from './types'

function now(): string {
  return new Date().toISOString()
}

// ---- Site -----------------------------------------------------------------

export async function getOrCreateDefaultSite(name = 'CALL Archive'): Promise<Site> {
  const db = await getDb()
  const existing = await db.getAll('sites')
  if (existing.length > 0) return existing[0]
  const site: Site = { id: uuid(), name, createdAt: now() }
  await db.put('sites', site)
  return site
}

// ---- Rooms ------------------------------------------------------------------

export async function listRooms(siteId: string): Promise<Room[]> {
  const db = await getDb()
  return db.getAllFromIndex('rooms', 'siteId', siteId)
}

export async function createRoom(input: {
  siteId: string
  name: string
  code: string
  notes?: string
  shapeAspectRatio?: { width: number; height: number }
}): Promise<Room> {
  const db = await getDb()
  const room: Room = {
    id: uuid(),
    siteId: input.siteId,
    name: input.name,
    code: input.code,
    notes: input.notes ?? '',
    shapeAspectRatio: input.shapeAspectRatio ?? { width: 4, height: 3 },
    createdAt: now(),
  }
  await db.put('rooms', room)
  return room
}

export async function updateRoom(room: Room): Promise<void> {
  const db = await getDb()
  await db.put('rooms', room)
}

// ---- Trap locations ---------------------------------------------------------

export async function listTrapLocations(roomId?: string): Promise<TrapLocation[]> {
  const db = await getDb()
  if (roomId) return db.getAllFromIndex('trapLocations', 'roomId', roomId)
  return db.getAll('trapLocations')
}

export async function listTrapLocationsForSite(siteId: string): Promise<TrapLocation[]> {
  const rooms = await listRooms(siteId)
  const db = await getDb()
  const perRoom = await Promise.all(
    rooms.map((r) => db.getAllFromIndex('trapLocations', 'roomId', r.id)),
  )
  return perRoom.flat()
}

export async function createTrapLocation(input: {
  room: Room
  x: number
  y: number
}): Promise<TrapLocation> {
  const db = await getDb()
  const roomLocations = await db.getAllFromIndex('trapLocations', 'roomId', input.room.id)
  const n = nextTrapNumber(input.room.code, roomLocations)
  const trap: TrapLocation = {
    id: uuid(),
    roomId: input.room.id,
    label: buildTrapLabel(input.room.code, n),
    x: input.x,
    y: input.y,
    status: 'active',
    relocatedFromId: null,
    createdAt: now(),
  }
  await db.put('trapLocations', trap)
  return trap
}

/** Moving a trap mints a new Trap Location (new id/label) and retires the old one. */
export async function relocateTrapLocation(input: {
  room: Room
  previous: TrapLocation
  x: number
  y: number
}): Promise<TrapLocation> {
  const db = await getDb()
  const roomLocations = await db.getAllFromIndex('trapLocations', 'roomId', input.room.id)
  const n = nextTrapNumber(input.room.code, roomLocations)
  const next: TrapLocation = {
    id: uuid(),
    roomId: input.room.id,
    label: buildTrapLabel(input.room.code, n),
    x: input.x,
    y: input.y,
    status: 'active',
    relocatedFromId: input.previous.id,
    createdAt: now(),
  }
  await db.put('trapLocations', next)
  await db.put('trapLocations', { ...input.previous, status: 'retired' })
  return next
}

export async function setTrapLocationStatus(
  trap: TrapLocation,
  status: TrapLocation['status'],
): Promise<void> {
  const db = await getDb()
  await db.put('trapLocations', { ...trap, status })
}

// ---- Species ------------------------------------------------------------------

export async function listSpecies(): Promise<Species[]> {
  const db = await getDb()
  const all = await db.getAll('species')
  return all.sort((a, b) => a.commonName.localeCompare(b.commonName))
}

export async function createSpecies(input: {
  commonName: string
  scientificName?: string
  category?: string
  notes?: string
}): Promise<Species> {
  const db = await getDb()
  const species: Species = {
    id: uuid(),
    commonName: input.commonName,
    scientificName: input.scientificName ?? '',
    category: input.category ?? '',
    notes: input.notes ?? '',
    createdAt: now(),
  }
  await db.put('species', species)
  return species
}

export async function updateSpecies(species: Species): Promise<void> {
  const db = await getDb()
  await db.put('species', species)
}

// ---- Seasons ------------------------------------------------------------------

export async function listSeasons(): Promise<Season[]> {
  const db = await getDb()
  return db.getAll('seasons')
}

export async function createSeason(input: {
  name: string
  startDate: string
  endDate: string
}): Promise<Season> {
  const db = await getDb()
  const season: Season = { id: uuid(), ...input, createdAt: now() }
  await db.put('seasons', season)
  return season
}

export async function updateSeason(season: Season): Promise<void> {
  const db = await getDb()
  await db.put('seasons', season)
}

export async function deleteSeason(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('seasons', id)
}

// ---- Trap checks ------------------------------------------------------------------

export async function listChecks(): Promise<TrapCheck[]> {
  const db = await getDb()
  return db.getAll('checks')
}

export async function listChecksForTrap(trapLocationId: string): Promise<TrapCheck[]> {
  const db = await getDb()
  return db.getAllFromIndex('checks', 'trapLocationId', trapLocationId)
}

export async function createCheck(input: {
  trapLocationId: string
  dateChecked: string
  dateSet?: string | null
  dateReplaced?: string | null
  observations: TrapCheck['observations']
  notes?: string
  photoIds?: string[]
}): Promise<TrapCheck> {
  const db = await getDb()
  const check: TrapCheck = {
    id: uuid(),
    trapLocationId: input.trapLocationId,
    dateChecked: input.dateChecked,
    dateSet: input.dateSet ?? null,
    dateReplaced: input.dateReplaced ?? null,
    observations: input.observations,
    notes: input.notes ?? '',
    photoIds: input.photoIds ?? [],
    createdAt: now(),
  }
  await db.put('checks', check)
  return check
}

export async function updateCheck(check: TrapCheck): Promise<void> {
  const db = await getDb()
  await db.put('checks', check)
}

export async function deleteCheck(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('checks', id)
}

// ---- Photos ------------------------------------------------------------------

export async function savePhoto(checkId: string, blob: Blob): Promise<Photo> {
  const db = await getDb()
  const photo: Photo = {
    id: uuid(),
    checkId,
    blobKey: uuid(),
    contentType: blob.type,
    createdAt: now(),
  }
  await db.put('photoBlobs', blob, photo.blobKey)
  await db.put('photos', photo)
  return photo
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
  const db = await getDb()
  return db.get('photos', id)
}

export async function getPhotoBlob(blobKey: string): Promise<Blob | undefined> {
  const db = await getDb()
  return db.get('photoBlobs', blobKey)
}

export async function deletePhoto(photo: Photo): Promise<void> {
  const db = await getDb()
  await db.delete('photoBlobs', photo.blobKey)
  await db.delete('photos', photo.id)
}
