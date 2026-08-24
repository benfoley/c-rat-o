import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Photo, Room, Season, Site, Species, TrapCheck, TrapLocation } from './types'

interface CratoDB extends DBSchema {
  sites: { key: string; value: Site }
  rooms: { key: string; value: Room; indexes: { siteId: string } }
  trapLocations: { key: string; value: TrapLocation; indexes: { roomId: string } }
  species: { key: string; value: Species }
  seasons: { key: string; value: Season }
  checks: { key: string; value: TrapCheck; indexes: { trapLocationId: string; dateChecked: string } }
  photos: { key: string; value: Photo }
  photoBlobs: { key: string; value: Blob }
}

const DB_NAME = 'c-rat-o'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<CratoDB>> | null = null

export function getDb(): Promise<IDBPDatabase<CratoDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CratoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('sites', { keyPath: 'id' })
        const rooms = db.createObjectStore('rooms', { keyPath: 'id' })
        rooms.createIndex('siteId', 'siteId')
        const traps = db.createObjectStore('trapLocations', { keyPath: 'id' })
        traps.createIndex('roomId', 'roomId')
        db.createObjectStore('species', { keyPath: 'id' })
        db.createObjectStore('seasons', { keyPath: 'id' })
        const checks = db.createObjectStore('checks', { keyPath: 'id' })
        checks.createIndex('trapLocationId', 'trapLocationId')
        checks.createIndex('dateChecked', 'dateChecked')
        db.createObjectStore('photos', { keyPath: 'id' })
        db.createObjectStore('photoBlobs')
      },
    })
  }
  return dbPromise
}

/** For tests: force a fresh in-memory database instance. */
export function resetDbForTests() {
  dbPromise = null
}

export type { Photo }
export type { CratoDB }
