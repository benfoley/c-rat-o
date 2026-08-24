import type { ISODate, Season } from './types'

function monthDay(date: ISODate): string {
  return date.slice(5) // 'MM-DD'
}

/**
 * Whether a date falls within a season's window. Seasons are recurring by
 * month/day (e.g. Nov 1 - Apr 30 matches every year), including windows
 * that wrap across a calendar year boundary (start > end).
 */
export function dateInSeason(date: ISODate, season: Season): boolean {
  const d = monthDay(date)
  const start = monthDay(season.startDate)
  const end = monthDay(season.endDate)
  if (start <= end) {
    return d >= start && d <= end
  }
  // wraps year boundary, e.g. Nov 1 -> Apr 30
  return d >= start || d <= end
}

/** All seasons (possibly more than one, if they overlap) that a date falls into. */
export function seasonsForDate(date: ISODate, seasons: Season[]): Season[] {
  return seasons.filter((s) => dateInSeason(date, s))
}

export function dateInRange(date: ISODate, start: ISODate | null, end: ISODate | null): boolean {
  if (start && date < start) return false
  if (end && date > end) return false
  return true
}
