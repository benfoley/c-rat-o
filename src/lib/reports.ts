import { toCsv } from './csv'
import { dateInRange, seasonsForDate } from './seasons'
import { LIFECYCLE_STAGE_LABELS } from './types'
import type {
  ISODate,
  LifecycleStage,
  Season,
  Species,
  TrapCheck,
  TrapLocation,
} from './types'

export interface ReportFilters {
  roomId?: string
  trapLocationId?: string
  speciesId?: string
  lifecycleStage?: LifecycleStage
  seasonId?: string
  dateFrom?: ISODate
  dateTo?: ISODate
}

export interface FilterContext {
  trapLocationsById: Map<string, TrapLocation>
  seasons: Season[]
}

export function checkMatchesFilters(
  check: TrapCheck,
  filters: ReportFilters,
  ctx: FilterContext,
): boolean {
  if (filters.trapLocationId && check.trapLocationId !== filters.trapLocationId) return false

  if (filters.roomId) {
    const loc = ctx.trapLocationsById.get(check.trapLocationId)
    if (!loc || loc.roomId !== filters.roomId) return false
  }

  if (!dateInRange(check.dateChecked, filters.dateFrom ?? null, filters.dateTo ?? null)) {
    return false
  }

  if (filters.seasonId) {
    const season = ctx.seasons.find((s) => s.id === filters.seasonId)
    if (!season) return false
    if (seasonsForDate(check.dateChecked, [season]).length === 0) return false
  }

  if (filters.speciesId || filters.lifecycleStage) {
    const hasMatch = check.observations.some((o) => {
      if (filters.speciesId && o.speciesId !== filters.speciesId) return false
      if (filters.lifecycleStage && o.lifecycleStage !== filters.lifecycleStage) return false
      return true
    })
    if (!hasMatch) return false
  }

  return true
}

export function filterChecks(
  checks: TrapCheck[],
  filters: ReportFilters,
  ctx: FilterContext,
): TrapCheck[] {
  return checks.filter((c) => checkMatchesFilters(c, filters, ctx))
}

/** Observations from the given checks, narrowed to the species/stage filters too. */
function matchingObservations(checks: TrapCheck[], filters: ReportFilters) {
  return checks.flatMap((check) =>
    check.observations
      .filter((o) => {
        if (filters.speciesId && o.speciesId !== filters.speciesId) return false
        if (filters.lifecycleStage && o.lifecycleStage !== filters.lifecycleStage) return false
        return true
      })
      .map((o) => ({ check, observation: o })),
  )
}

export interface SpeciesCount {
  speciesId: string
  speciesName: string
  total: number
}

export function totalsBySpecies(
  checks: TrapCheck[],
  filters: ReportFilters,
  ctx: FilterContext,
  speciesById: Map<string, Species>,
): SpeciesCount[] {
  const totals = new Map<string, number>()
  for (const { observation } of matchingObservations(filterChecks(checks, filters, ctx), filters)) {
    totals.set(observation.speciesId, (totals.get(observation.speciesId) ?? 0) + observation.quantity)
  }
  return [...totals.entries()]
    .map(([speciesId, total]) => ({
      speciesId,
      speciesName: speciesById.get(speciesId)?.commonName ?? 'Unknown species',
      total,
    }))
    .sort((a, b) => b.total - a.total)
}

export interface StageCount {
  lifecycleStage: LifecycleStage
  total: number
}

export function totalsByLifecycleStage(
  checks: TrapCheck[],
  filters: ReportFilters,
  ctx: FilterContext,
): StageCount[] {
  const totals = new Map<LifecycleStage, number>()
  for (const { observation } of matchingObservations(filterChecks(checks, filters, ctx), filters)) {
    totals.set(
      observation.lifecycleStage,
      (totals.get(observation.lifecycleStage) ?? 0) + observation.quantity,
    )
  }
  return [...totals.entries()].map(([lifecycleStage, total]) => ({ lifecycleStage, total }))
}

export interface TrapTotal {
  trapLocationId: string
  trapLabel: string
  total: number
}

export function totalsByTrap(
  checks: TrapCheck[],
  filters: ReportFilters,
  ctx: FilterContext,
): TrapTotal[] {
  const totals = new Map<string, number>()
  const matched = filterChecks(checks, filters, ctx)
  for (const { check, observation } of matchingObservations(matched, filters)) {
    totals.set(check.trapLocationId, (totals.get(check.trapLocationId) ?? 0) + observation.quantity)
  }
  return [...totals.entries()]
    .map(([trapLocationId, total]) => ({
      trapLocationId,
      trapLabel: ctx.trapLocationsById.get(trapLocationId)?.label ?? trapLocationId,
      total,
    }))
    .sort((a, b) => b.total - a.total)
}

export interface RoomTotal {
  roomId: string
  total: number
}

export function totalsByRoom(
  checks: TrapCheck[],
  filters: ReportFilters,
  ctx: FilterContext,
): RoomTotal[] {
  const totals = new Map<string, number>()
  const matched = filterChecks(checks, filters, ctx)
  for (const { check, observation } of matchingObservations(matched, filters)) {
    const roomId = ctx.trapLocationsById.get(check.trapLocationId)?.roomId
    if (!roomId) continue
    totals.set(roomId, (totals.get(roomId) ?? 0) + observation.quantity)
  }
  return [...totals.entries()].map(([roomId, total]) => ({ roomId, total }))
}

export interface SeasonStageBreakdown {
  seasonId: string
  seasonName: string
  stages: StageCount[]
  total: number
}

/** Lifecycle stage prevalence per season, for comparing seasons side by side. */
export function lifecyclePrevalenceBySeason(
  checks: TrapCheck[],
  seasons: Season[],
  ctx: FilterContext,
  baseFilters: ReportFilters = {},
): SeasonStageBreakdown[] {
  return seasons.map((season) => {
    const stages = totalsByLifecycleStage(checks, { ...baseFilters, seasonId: season.id }, ctx)
    return {
      seasonId: season.id,
      seasonName: season.name,
      stages,
      total: stages.reduce((sum, s) => sum + s.total, 0),
    }
  })
}

export interface TimeSeriesPoint {
  date: ISODate
  stages: Partial<Record<LifecycleStage, number>>
  total: number
}

/** Catch volume over time (by check date), stacked by lifecycle stage. */
export function catchOverTime(
  checks: TrapCheck[],
  filters: ReportFilters,
  ctx: FilterContext,
): TimeSeriesPoint[] {
  const byDate = new Map<ISODate, Partial<Record<LifecycleStage, number>>>()
  const matched = filterChecks(checks, filters, ctx)
  for (const { check, observation } of matchingObservations(matched, filters)) {
    const stageMap = byDate.get(check.dateChecked) ?? {}
    stageMap[observation.lifecycleStage] = (stageMap[observation.lifecycleStage] ?? 0) + observation.quantity
    byDate.set(check.dateChecked, stageMap)
  }
  return [...byDate.entries()]
    .map(([date, stages]) => ({
      date,
      stages,
      total: Object.values(stages).reduce((a, b) => a + (b ?? 0), 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Raw observation-level rows (one row per observation), for CSV export. */
export function checksToCsv(
  checks: TrapCheck[],
  filters: ReportFilters,
  ctx: FilterContext,
  speciesById: Map<string, Species>,
): string {
  const matched = filterChecks(checks, filters, ctx)
  const rows = matchingObservations(matched, filters).map(({ check, observation }) => {
    const loc = ctx.trapLocationsById.get(check.trapLocationId)
    return [
      loc?.label ?? check.trapLocationId,
      check.dateChecked,
      speciesById.get(observation.speciesId)?.commonName ?? 'Unknown species',
      LIFECYCLE_STAGE_LABELS[observation.lifecycleStage],
      observation.quantity,
      check.notes,
    ]
  })
  return toCsv(['Trap', 'Date checked', 'Species', 'Lifecycle stage', 'Quantity', 'Notes'], rows)
}
