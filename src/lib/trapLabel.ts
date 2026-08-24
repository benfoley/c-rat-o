import type { TrapLocation } from './types'

/**
 * Next sequential trap number for a room, based on existing labels for that
 * room (active or retired — numbers are never reused).
 */
export function nextTrapNumber(roomCode: string, existingLocations: TrapLocation[]): number {
  const prefix = `${roomCode}-T`
  let max = 0
  for (const loc of existingLocations) {
    if (!loc.label.startsWith(prefix)) continue
    const n = Number(loc.label.slice(prefix.length))
    if (Number.isFinite(n) && n > max) max = n
  }
  return max + 1
}

export function buildTrapLabel(roomCode: string, trapNumber: number): string {
  return `${roomCode}-T${trapNumber}`
}
