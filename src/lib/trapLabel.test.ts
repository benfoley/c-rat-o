import { describe, expect, it } from 'vitest'
import { buildTrapLabel, nextTrapNumber } from './trapLabel'
import type { TrapLocation } from './types'

function loc(label: string): TrapLocation {
  return {
    id: label,
    roomId: 'room-1',
    label,
    x: 0,
    y: 0,
    status: 'active',
    relocatedFromId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('buildTrapLabel', () => {
  it('joins room code and trap number', () => {
    expect(buildTrapLabel('R1', 3)).toBe('R1-T3')
  })
})

describe('nextTrapNumber', () => {
  it('starts at 1 when there are no existing locations', () => {
    expect(nextTrapNumber('R1', [])).toBe(1)
  })

  it('increments past the highest existing number for that room', () => {
    const existing = [loc('R1-T1'), loc('R1-T2'), loc('R1-T4')]
    expect(nextTrapNumber('R1', existing)).toBe(5)
  })

  it('ignores locations from other rooms, including prefix collisions', () => {
    const existing = [loc('R1-T9'), loc('R10-T1')]
    expect(nextTrapNumber('R1', existing)).toBe(10)
  })

  it('never reuses a number, even if that trap was retired', () => {
    const retired: TrapLocation = { ...loc('R1-T3'), status: 'retired' }
    expect(nextTrapNumber('R1', [retired])).toBe(4)
  })
})
