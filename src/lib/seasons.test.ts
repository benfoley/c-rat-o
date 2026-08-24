import { describe, expect, it } from 'vitest'
import { dateInRange, dateInSeason, seasonsForDate } from './seasons'
import type { Season } from './types'

function season(name: string, startDate: string, endDate: string): Season {
  return { id: name, name, startDate, endDate, createdAt: '2026-01-01T00:00:00.000Z' }
}

describe('dateInSeason', () => {
  it('matches a simple within-year range', () => {
    const s = season('Dry', '2026-05-01', '2026-10-31')
    expect(dateInSeason('2026-07-15', s)).toBe(true)
    expect(dateInSeason('2026-04-30', s)).toBe(false)
    expect(dateInSeason('2026-11-01', s)).toBe(false)
  })

  it('matches recurring by month/day regardless of year', () => {
    const s = season('Dry', '2026-05-01', '2026-10-31')
    expect(dateInSeason('2030-05-01', s)).toBe(true)
    expect(dateInSeason('2019-10-31', s)).toBe(true)
  })

  it('handles a range that wraps the year boundary', () => {
    const s = season('Wet', '2026-11-01', '2027-04-30')
    expect(dateInSeason('2026-12-15', s)).toBe(true)
    expect(dateInSeason('2027-03-01', s)).toBe(true)
    expect(dateInSeason('2027-06-01', s)).toBe(false)
  })

  it('includes both boundary dates', () => {
    const s = season('Wet', '2026-11-01', '2027-04-30')
    expect(dateInSeason('2026-11-01', s)).toBe(true)
    expect(dateInSeason('2027-04-30', s)).toBe(true)
  })
})

describe('seasonsForDate', () => {
  it('returns all overlapping seasons', () => {
    const a = season('A', '2026-01-01', '2026-12-31')
    const b = season('B', '2026-06-01', '2026-08-31')
    expect(seasonsForDate('2026-07-01', [a, b])).toHaveLength(2)
    expect(seasonsForDate('2026-09-01', [a, b])).toEqual([a])
  })
})

describe('dateInRange', () => {
  it('is true with no bounds', () => {
    expect(dateInRange('2026-01-01', null, null)).toBe(true)
  })

  it('respects start and end bounds inclusively', () => {
    expect(dateInRange('2026-01-01', '2026-01-01', '2026-01-31')).toBe(true)
    expect(dateInRange('2025-12-31', '2026-01-01', '2026-01-31')).toBe(false)
    expect(dateInRange('2026-02-01', '2026-01-01', '2026-01-31')).toBe(false)
  })
})
