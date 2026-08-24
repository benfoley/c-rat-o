export type ISODate = string // 'YYYY-MM-DD'
export type ISODateTime = string // full ISO timestamp, used for record ids/audit only

export type TrapLocationStatus = 'active' | 'retired'

export interface Room {
  id: string
  siteId: string
  name: string
  /** short code used to build trap labels, e.g. "R1" -> "R1-T3" */
  code: string
  notes: string
  /** width:height, e.g. 4:3, used to draw the room rectangle in the map view */
  shapeAspectRatio: { width: number; height: number }
  createdAt: ISODateTime
}

export interface TrapLocation {
  id: string
  roomId: string
  /** fixed, human-readable id such as "R1-T3", assigned on creation and never reused */
  label: string
  /** position within the room rectangle, 0-100 (percentage) */
  x: number
  y: number
  status: TrapLocationStatus
  /** set when this location was created by relocating another one */
  relocatedFromId: string | null
  createdAt: ISODateTime
}

export interface Species {
  id: string
  commonName: string
  scientificName: string
  category: string
  notes: string
  createdAt: ISODateTime
}

export const LIFECYCLE_STAGES = ['egg', 'larva_nymph', 'pupa', 'adult'] as const
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number]

export const LIFECYCLE_STAGE_LABELS: Record<LifecycleStage, string> = {
  egg: 'Egg',
  larva_nymph: 'Larva / Nymph',
  pupa: 'Pupa',
  adult: 'Adult',
}

export interface Season {
  id: string
  name: string
  /** MM-DD, defines the recurring or one-off window */
  startDate: ISODate
  endDate: ISODate
  createdAt: ISODateTime
}

export interface Observation {
  id: string
  speciesId: string
  lifecycleStage: LifecycleStage
  quantity: number
}

export interface Photo {
  id: string
  checkId: string
  /** stored as a Blob in the photos object store; this is the object-store key */
  blobKey: string
  contentType: string
  createdAt: ISODateTime
}

export interface TrapCheck {
  id: string
  trapLocationId: string
  dateChecked: ISODate
  /** present when this check also marks the start of a new physical trap placement */
  dateSet: ISODate | null
  /** present when this check also marks the old physical trap being removed/replaced */
  dateReplaced: ISODate | null
  observations: Observation[]
  notes: string
  photoIds: string[]
  createdAt: ISODateTime
}

export interface Site {
  id: string
  name: string
  createdAt: ISODateTime
}

/** A derived (not stored) span of one physical trap's life at a location. */
export interface TrapPlacement {
  trapLocationId: string
  dateSet: ISODate | null
  dateReplaced: ISODate | null
}
