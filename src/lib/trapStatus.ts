import type { ISODate, TrapCheck } from './types'

export type TrapActivityStatus = 'green' | 'amber' | 'red' | 'unknown'

const ONE_MONTH_DAYS = 30
const TWO_MONTH_DAYS = 60

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.floor((b.getTime() - a.getTime()) / msPerDay)
}

/**
 * The most recent date the physical trap at a location was touched — either
 * set (new placement started) or replaced (old placement ended). A check
 * with neither is just an inspection and doesn't count as "changed".
 */
export function lastChangedDate(checks: TrapCheck[]): ISODate | null {
  let latest: ISODate | null = null
  for (const check of checks) {
    for (const candidate of [check.dateSet, check.dateReplaced]) {
      if (candidate && (!latest || candidate > latest)) latest = candidate
    }
  }
  return latest
}

/**
 * Recency status for the trap map: green if changed within the last month,
 * amber within two months, red beyond that. Unknown if never changed.
 */
export function trapActivityStatus(
  checks: TrapCheck[],
  asOf: Date = new Date(),
): TrapActivityStatus {
  const last = lastChangedDate(checks)
  if (!last) return 'unknown'
  const age = daysBetween(new Date(last), asOf)
  if (age < 0) return 'green' // future-dated, treat as just changed
  if (age <= ONE_MONTH_DAYS) return 'green'
  if (age <= TWO_MONTH_DAYS) return 'amber'
  return 'red'
}
