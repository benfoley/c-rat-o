import { getDb } from './db'
import type { Photo, Room, Season, Site, Species, TrapCheck, TrapLocation } from './types'

export interface DataBundle {
  version: 1
  exportedAt: string
  sites: Site[]
  rooms: Room[]
  trapLocations: TrapLocation[]
  species: Species[]
  seasons: Season[]
  checks: TrapCheck[]
  photos: Photo[]
  photoBlobs: Record<string, string> // blobKey -> base64 data URL
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return `data:${blob.type};base64,${btoa(binary)}`
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const contentType = header.match(/data:(.*?);base64/)?.[1] ?? 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: contentType })
}

export async function exportBundle(): Promise<DataBundle> {
  const db = await getDb()
  const [sites, rooms, trapLocations, species, seasons, checks, photos] = await Promise.all([
    db.getAll('sites'),
    db.getAll('rooms'),
    db.getAll('trapLocations'),
    db.getAll('species'),
    db.getAll('seasons'),
    db.getAll('checks'),
    db.getAll('photos'),
  ])

  const photoBlobs: Record<string, string> = {}
  for (const photo of photos) {
    const blob = await db.get('photoBlobs', photo.blobKey)
    if (blob) photoBlobs[photo.blobKey] = await blobToDataUrl(blob)
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    sites,
    rooms,
    trapLocations,
    species,
    seasons,
    checks,
    photos,
    photoBlobs,
  }
}

const ALL_STORES = [
  'sites',
  'rooms',
  'trapLocations',
  'species',
  'seasons',
  'checks',
  'photos',
  'photoBlobs',
] as const

/** Permanently clears all local data (sites, rooms, traps, species, seasons, checks, photos). */
export async function resetAllData(): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(ALL_STORES, 'readwrite')
  await Promise.all(ALL_STORES.map((store) => tx.objectStore(store).clear()))
  await tx.done
}

/** Replaces all local data with the contents of the bundle. */
export async function importBundle(bundle: DataBundle): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(ALL_STORES, 'readwrite')
  await Promise.all(ALL_STORES.map((store) => tx.objectStore(store).clear()))
  await Promise.all([
    ...bundle.sites.map((v) => tx.objectStore('sites').put(v)),
    ...bundle.rooms.map((v) => tx.objectStore('rooms').put(v)),
    ...bundle.trapLocations.map((v) => tx.objectStore('trapLocations').put(v)),
    ...bundle.species.map((v) => tx.objectStore('species').put(v)),
    ...bundle.seasons.map((v) => tx.objectStore('seasons').put(v)),
    ...bundle.checks.map((v) => tx.objectStore('checks').put(v)),
    ...bundle.photos.map((v) => tx.objectStore('photos').put(v)),
  ])
  await tx.done

  const blobTx = db.transaction('photoBlobs', 'readwrite')
  await Promise.all(
    Object.entries(bundle.photoBlobs).map(([blobKey, dataUrl]) =>
      blobTx.store.put(dataUrlToBlob(dataUrl), blobKey),
    ),
  )
  await blobTx.done
}

export function bundleToJsonFile(bundle: DataBundle): Blob {
  return new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
}

/**
 * Site configuration only (rooms, layout, trap locations, species, seasons) —
 * for porting a fresh site's setup, e.g. to a new location, without any
 * trap-check history or photos.
 */
export async function exportConfigBundle(): Promise<DataBundle> {
  const full = await exportBundle()
  return { ...full, checks: [], photos: [], photoBlobs: {} }
}
