import { describe, expect, it } from 'vitest'
import {
  catchOverTime,
  checksToCsv,
  filterChecks,
  lifecyclePrevalenceBySeason,
  totalsByLifecycleStage,
  totalsByRoom,
  totalsBySpecies,
  totalsByTrap,
  type FilterContext,
} from './reports'
import type { Season, Species, TrapCheck, TrapLocation } from './types'

const trapLocations: TrapLocation[] = [
  { id: 't1', roomId: 'room-1', label: 'R1-T1', x: 0, y: 0, status: 'active', relocatedFromId: null, createdAt: '' },
  { id: 't2', roomId: 'room-1', label: 'R1-T2', x: 0, y: 0, status: 'active', relocatedFromId: null, createdAt: '' },
  { id: 't3', roomId: 'room-2', label: 'R2-T1', x: 0, y: 0, status: 'active', relocatedFromId: null, createdAt: '' },
]

const species: Species[] = [
  { id: 'sp-silverfish', commonName: 'Silverfish', scientificName: '', category: '', notes: '', createdAt: '' },
  { id: 'sp-psocid', commonName: 'Psocid', scientificName: '', category: '', notes: '', createdAt: '' },
]
const speciesById = new Map(species.map((s) => [s.id, s]))

const seasons: Season[] = [
  { id: 'wet', name: 'Wet season', startDate: '2026-11-01', endDate: '2027-04-30', createdAt: '' },
  { id: 'dry', name: 'Dry season', startDate: '2026-05-01', endDate: '2026-10-31', createdAt: '' },
]

const ctx: FilterContext = {
  trapLocationsById: new Map(trapLocations.map((t) => [t.id, t])),
  seasons,
}

const checks: TrapCheck[] = [
  {
    id: 'c1',
    trapLocationId: 't1',
    dateChecked: '2026-06-01', // dry season
    dateSet: null,
    dateReplaced: null,
    observations: [
      { id: 'o1', speciesId: 'sp-silverfish', lifecycleStage: 'adult', quantity: 3 },
      { id: 'o2', speciesId: 'sp-psocid', lifecycleStage: 'larva_nymph', quantity: 2 },
    ],
    notes: 'routine check',
    photoIds: [],
    createdAt: '',
  },
  {
    id: 'c2',
    trapLocationId: 't2',
    dateChecked: '2026-12-01', // wet season
    dateSet: null,
    dateReplaced: null,
    observations: [{ id: 'o3', speciesId: 'sp-silverfish', lifecycleStage: 'larva_nymph', quantity: 5 }],
    notes: '',
    photoIds: [],
    createdAt: '',
  },
  {
    id: 'c3',
    trapLocationId: 't3',
    dateChecked: '2026-12-15', // wet season, room 2
    dateSet: null,
    dateReplaced: null,
    observations: [{ id: 'o4', speciesId: 'sp-psocid', lifecycleStage: 'adult', quantity: 1 }],
    notes: '',
    photoIds: [],
    createdAt: '',
  },
]

describe('filterChecks', () => {
  it('filters by room', () => {
    const result = filterChecks(checks, { roomId: 'room-2' }, ctx)
    expect(result.map((c) => c.id)).toEqual(['c3'])
  })

  it('filters by trap location', () => {
    const result = filterChecks(checks, { trapLocationId: 't1' }, ctx)
    expect(result.map((c) => c.id)).toEqual(['c1'])
  })

  it('filters by date range', () => {
    const result = filterChecks(checks, { dateFrom: '2026-11-01', dateTo: '2026-12-31' }, ctx)
    expect(result.map((c) => c.id).sort()).toEqual(['c2', 'c3'])
  })

  it('filters by season', () => {
    const result = filterChecks(checks, { seasonId: 'dry' }, ctx)
    expect(result.map((c) => c.id)).toEqual(['c1'])
  })

  it('filters by species presence in observations', () => {
    const result = filterChecks(checks, { speciesId: 'sp-psocid' }, ctx)
    expect(result.map((c) => c.id).sort()).toEqual(['c1', 'c3'])
  })
})

describe('totalsBySpecies', () => {
  it('sums quantity per species across matching checks', () => {
    const totals = totalsBySpecies(checks, {}, ctx, speciesById)
    expect(totals).toEqual([
      { speciesId: 'sp-silverfish', speciesName: 'Silverfish', total: 8 },
      { speciesId: 'sp-psocid', speciesName: 'Psocid', total: 3 },
    ])
  })

  it('respects filters', () => {
    const totals = totalsBySpecies(checks, { roomId: 'room-1' }, ctx, speciesById)
    expect(totals.find((t) => t.speciesId === 'sp-psocid')?.total).toBe(2)
    expect(totals.every((t) => t.speciesId !== 'sp-psocid' || t.total !== 1)).toBe(true)
  })
})

describe('totalsByLifecycleStage', () => {
  it('sums quantity per stage', () => {
    const totals = totalsByLifecycleStage(checks, {}, ctx)
    const byStage = Object.fromEntries(totals.map((t) => [t.lifecycleStage, t.total]))
    expect(byStage.adult).toBe(4)
    expect(byStage.larva_nymph).toBe(7)
  })
})

describe('totalsByTrap', () => {
  it('sums per trap and sorts descending', () => {
    const totals = totalsByTrap(checks, {}, ctx)
    expect(totals[0]).toEqual({ trapLocationId: 't1', trapLabel: 'R1-T1', total: 5 })
  })
})

describe('totalsByRoom', () => {
  it('aggregates traps into rooms', () => {
    const totals = totalsByRoom(checks, {}, ctx)
    const byRoom = Object.fromEntries(totals.map((t) => [t.roomId, t.total]))
    expect(byRoom['room-1']).toBe(10)
    expect(byRoom['room-2']).toBe(1)
  })
})

describe('lifecyclePrevalenceBySeason', () => {
  it('breaks down stage totals per season', () => {
    const result = lifecyclePrevalenceBySeason(checks, seasons, ctx)
    const dry = result.find((r) => r.seasonId === 'dry')!
    const wet = result.find((r) => r.seasonId === 'wet')!
    expect(dry.total).toBe(5) // c1 only
    expect(wet.total).toBe(6) // c2 + c3
  })
})

describe('catchOverTime', () => {
  it('produces one sorted point per date with stage breakdown', () => {
    const points = catchOverTime(checks, {}, ctx)
    expect(points.map((p) => p.date)).toEqual(['2026-06-01', '2026-12-01', '2026-12-15'])
    expect(points[0].total).toBe(5)
  })
})

describe('checksToCsv', () => {
  it('produces one row per observation', () => {
    const csv = checksToCsv(checks, { trapLocationId: 't1' }, ctx, speciesById)
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Trap,Date checked,Species,Lifecycle stage,Quantity,Notes')
    expect(lines).toHaveLength(3) // header + 2 observations
    expect(lines[1]).toContain('R1-T1')
  })
})
