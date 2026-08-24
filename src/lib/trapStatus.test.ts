import { describe, expect, it } from 'vitest'
import { lastChangedDate, trapActivityStatus } from './trapStatus'
import type { TrapCheck } from './types'

function check(overrides: Partial<TrapCheck> = {}): TrapCheck {
  return {
    id: 'c1',
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

describe('lastChangedDate', () => {
  it('returns null when no check has a dateSet or dateReplaced', () => {
    expect(lastChangedDate([check(), check({ dateChecked: '2026-02-01' })])).toBeNull()
  })

  it('picks the latest of dateSet/dateReplaced across all checks', () => {
    const checks = [
      check({ dateSet: '2026-01-01' }),
      check({ dateReplaced: '2026-03-01' }),
      check({ dateSet: '2026-02-01' }),
    ]
    expect(lastChangedDate(checks)).toBe('2026-03-01')
  })
})

describe('trapActivityStatus', () => {
  const asOf = new Date('2026-06-15T00:00:00.000Z')

  it('is unknown when the trap has never been changed', () => {
    expect(trapActivityStatus([check()], asOf)).toBe('unknown')
  })

  it('is green within the last month', () => {
    const checks = [check({ dateSet: '2026-06-01' })]
    expect(trapActivityStatus(checks, asOf)).toBe('green')
  })

  it('is amber between one and two months', () => {
    const checks = [check({ dateSet: '2026-05-01' })]
    expect(trapActivityStatus(checks, asOf)).toBe('amber')
  })

  it('is red beyond two months', () => {
    const checks = [check({ dateSet: '2026-01-01' })]
    expect(trapActivityStatus(checks, asOf)).toBe('red')
  })

  it('treats a future-dated change as green', () => {
    const checks = [check({ dateSet: '2026-07-01' })]
    expect(trapActivityStatus(checks, asOf)).toBe('green')
  })
})
