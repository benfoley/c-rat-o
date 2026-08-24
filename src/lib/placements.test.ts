import { describe, expect, it } from 'vitest'
import { currentPlacement, derivePlacements } from './placements'
import type { TrapCheck } from './types'

function check(overrides: Partial<TrapCheck>): TrapCheck {
  return {
    id: overrides.id ?? Math.random().toString(),
    trapLocationId: 'loc-1',
    dateChecked: '2026-01-01',
    dateSet: null,
    dateReplaced: null,
    observations: [],
    notes: '',
    photoIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('derivePlacements', () => {
  it('returns nothing for a trap with only plain inspections', () => {
    const checks = [check({ dateChecked: '2026-01-01' })]
    expect(derivePlacements(checks, 'loc-1')).toEqual([])
  })

  it('pairs a dateSet with a later dateReplaced into one closed placement', () => {
    const checks = [
      check({ dateChecked: '2026-01-01', dateSet: '2026-01-01' }),
      check({ dateChecked: '2026-03-01', dateReplaced: '2026-03-01' }),
    ]
    expect(derivePlacements(checks, 'loc-1')).toEqual([
      { trapLocationId: 'loc-1', dateSet: '2026-01-01', dateReplaced: '2026-03-01' },
    ])
  })

  it('leaves the most recent placement open when there is no replace date yet', () => {
    const checks = [check({ dateChecked: '2026-01-01', dateSet: '2026-01-01' })]
    expect(derivePlacements(checks, 'loc-1')).toEqual([
      { trapLocationId: 'loc-1', dateSet: '2026-01-01', dateReplaced: null },
    ])
  })

  it('handles a same-visit swap where dateReplaced and dateSet are on one check', () => {
    const checks = [
      check({ dateChecked: '2026-01-01', dateSet: '2026-01-01' }),
      check({ dateChecked: '2026-03-01', dateReplaced: '2026-03-01', dateSet: '2026-03-01' }),
    ]
    const placements = derivePlacements(checks, 'loc-1')
    expect(placements).toEqual([
      { trapLocationId: 'loc-1', dateSet: '2026-01-01', dateReplaced: '2026-03-01' },
      { trapLocationId: 'loc-1', dateSet: '2026-03-01', dateReplaced: null },
    ])
  })

  it('ignores checks for other trap locations', () => {
    const checks = [
      check({ trapLocationId: 'loc-1', dateSet: '2026-01-01' }),
      check({ trapLocationId: 'loc-2', dateSet: '2026-05-01' }),
    ]
    expect(derivePlacements(checks, 'loc-1')).toHaveLength(1)
  })
})

describe('currentPlacement', () => {
  it('is null when there is no open placement', () => {
    const checks = [
      check({ dateChecked: '2026-01-01', dateSet: '2026-01-01' }),
      check({ dateChecked: '2026-03-01', dateReplaced: '2026-03-01' }),
    ]
    expect(currentPlacement(checks, 'loc-1')).toBeNull()
  })

  it('returns the latest open placement', () => {
    const checks = [
      check({ dateChecked: '2026-01-01', dateSet: '2026-01-01' }),
      check({ dateChecked: '2026-03-01', dateReplaced: '2026-03-01', dateSet: '2026-03-01' }),
    ]
    expect(currentPlacement(checks, 'loc-1')).toEqual({
      trapLocationId: 'loc-1',
      dateSet: '2026-03-01',
      dateReplaced: null,
    })
  })
})
