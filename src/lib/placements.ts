import type { TrapCheck, TrapPlacement } from './types'

/**
 * Derives placement spans for a trap location from its checks' dateSet /
 * dateReplaced markers, rather than storing placements separately. A new
 * span starts at each dateSet and ends at the next dateReplaced (or stays
 * open if none yet).
 */
export function derivePlacements(checks: TrapCheck[], trapLocationId: string): TrapPlacement[] {
  const relevant = checks
    .filter((c) => c.trapLocationId === trapLocationId && (c.dateSet || c.dateReplaced))
    .sort((a, b) => (a.dateSet ?? a.dateReplaced ?? '').localeCompare(b.dateSet ?? b.dateReplaced ?? ''))

  const placements: TrapPlacement[] = []
  let open: TrapPlacement | null = null

  for (const check of relevant) {
    // process dateReplaced first: on a same-visit swap, it closes the
    // outgoing placement before dateSet opens the incoming one
    if (check.dateReplaced) {
      if (open) {
        open.dateReplaced = check.dateReplaced
        placements.push(open)
        open = null
      } else {
        placements.push({ trapLocationId, dateSet: null, dateReplaced: check.dateReplaced })
      }
    }
    if (check.dateSet) {
      if (open) placements.push(open) // previous placement never got an explicit replace date
      open = { trapLocationId, dateSet: check.dateSet, dateReplaced: null }
    }
  }
  if (open) placements.push(open)

  return placements
}

/** The currently active placement (most recent dateSet with no later dateReplaced), if any. */
export function currentPlacement(checks: TrapCheck[], trapLocationId: string): TrapPlacement | null {
  const placements = derivePlacements(checks, trapLocationId)
  const open = placements.filter((p) => p.dateSet && !p.dateReplaced)
  if (open.length === 0) return null
  return open.reduce((latest, p) => (p.dateSet! > latest.dateSet! ? p : latest))
}
