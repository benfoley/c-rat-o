<script lang="ts">
  import {
    catchOverTime,
    checksToCsv,
    lifecyclePrevalenceBySeason,
    totalsByLifecycleStage,
    totalsByRoom,
    totalsBySpecies,
    totalsByTrap,
    type FilterContext,
    type ReportFilters,
  } from '../reports'
  import { checks, rooms, seasons, species, trapLocations } from '../stores'
  import { LIFECYCLE_STAGES, LIFECYCLE_STAGE_LABELS, type LifecycleStage } from '../types'
  import BarChart from './BarChart.svelte'
  import DonutChart from './DonutChart.svelte'
  import StackedBarChart from './StackedBarChart.svelte'

  let roomId = $state('')
  let trapLocationId = $state('')
  let speciesId = $state('')
  let lifecycleStage: LifecycleStage | '' = $state('')
  let seasonId = $state('')
  let dateFrom = $state('')
  let dateTo = $state('')

  const filters = $derived<ReportFilters>({
    roomId: roomId || undefined,
    trapLocationId: trapLocationId || undefined,
    speciesId: speciesId || undefined,
    lifecycleStage: lifecycleStage || undefined,
    seasonId: seasonId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })

  const ctx = $derived<FilterContext>({
    trapLocationsById: new Map($trapLocations.map((t) => [t.id, t])),
    seasons: $seasons,
  })

  const speciesById = $derived(new Map($species.map((s) => [s.id, s])))
  const roomById = $derived(new Map($rooms.map((r) => [r.id, r])))

  const trapsForFilter = $derived(
    roomId ? $trapLocations.filter((t) => t.roomId === roomId) : $trapLocations,
  )

  const speciesTotals = $derived(totalsBySpecies($checks, filters, ctx, speciesById))
  const stageTotals = $derived(totalsByLifecycleStage($checks, filters, ctx))
  const trapTotals = $derived(totalsByTrap($checks, filters, ctx))
  const roomTotals = $derived(totalsByRoom($checks, filters, ctx))
  const timeSeries = $derived(catchOverTime($checks, filters, ctx))
  const seasonBreakdown = $derived(lifecyclePrevalenceBySeason($checks, $seasons, ctx, filters))

  const stageChartItems = $derived(
    stageTotals.map((s) => ({
      label: LIFECYCLE_STAGE_LABELS[s.lifecycleStage],
      total: s.total,
      colorIndex: LIFECYCLE_STAGES.indexOf(s.lifecycleStage),
    })),
  )
  const roomChartItems = $derived(
    roomTotals.map((r) => ({ label: roomById.get(r.roomId)?.name ?? r.roomId, total: r.total })),
  )
  const trapChartItems = $derived(trapTotals.map((t) => ({ label: t.trapLabel, total: t.total })))
  const speciesChartItems = $derived(speciesTotals.map((s) => ({ label: s.speciesName, total: s.total })))

  function resetFilters() {
    roomId = ''
    trapLocationId = ''
    speciesId = ''
    lifecycleStage = ''
    seasonId = ''
    dateFrom = ''
    dateTo = ''
  }

  function exportCsv() {
    const csv = checksToCsv($checks, filters, ctx, speciesById)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `c-rat-o-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
</script>

<div class="card no-print">
  <h2>Filters</h2>
  <div class="row">
    <div class="field">
      <label for="f-room">Room</label>
      <select id="f-room" bind:value={roomId}>
        <option value="">All rooms</option>
        {#each $rooms as room (room.id)}
          <option value={room.id}>{room.name}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="f-trap">Trap</label>
      <select id="f-trap" bind:value={trapLocationId}>
        <option value="">All traps</option>
        {#each trapsForFilter as trap (trap.id)}
          <option value={trap.id}>{trap.label}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="f-species">Species</label>
      <select id="f-species" bind:value={speciesId}>
        <option value="">All species</option>
        {#each $species as sp (sp.id)}
          <option value={sp.id}>{sp.commonName}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="f-stage">Lifecycle stage</label>
      <select id="f-stage" bind:value={lifecycleStage}>
        <option value="">All stages</option>
        {#each LIFECYCLE_STAGES as stage (stage)}
          <option value={stage}>{LIFECYCLE_STAGE_LABELS[stage]}</option>
        {/each}
      </select>
    </div>
  </div>
  <div class="row">
    <div class="field">
      <label for="f-season">Season</label>
      <select id="f-season" bind:value={seasonId}>
        <option value="">All seasons</option>
        {#each $seasons as season (season.id)}
          <option value={season.id}>{season.name}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="f-from">Date from</label>
      <input id="f-from" type="date" bind:value={dateFrom} />
    </div>
    <div class="field">
      <label for="f-to">Date to</label>
      <input id="f-to" type="date" bind:value={dateTo} />
    </div>
  </div>
  <div class="row">
    <button type="button" class="btn secondary" onclick={resetFilters}>Reset filters</button>
    <button type="button" class="btn" onclick={exportCsv}>Export CSV</button>
    <button type="button" class="btn secondary" onclick={() => window.print()}>Print report</button>
  </div>
</div>

<div class="card">
  <h2>Catch by species</h2>
  <BarChart items={speciesChartItems} />
</div>

<div class="card">
  <h2>Catch by trap</h2>
  <BarChart items={trapChartItems} />
</div>

<div class="card">
  <h2>Catch by room</h2>
  <BarChart items={roomChartItems} />
</div>

<div class="card">
  <h2>Lifecycle stage mix</h2>
  <DonutChart items={stageChartItems} />
</div>

<div class="card">
  <h2>Catch over time</h2>
  <StackedBarChart points={timeSeries} />
</div>

<div class="card">
  <h2>Lifecycle prevalence by season</h2>
  {#if $seasons.length === 0}
    <p class="empty-state">No seasons configured yet — add some in Admin.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Season</th>
          {#each LIFECYCLE_STAGES as stage (stage)}
            <th>{LIFECYCLE_STAGE_LABELS[stage]}</th>
          {/each}
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {#each seasonBreakdown as row (row.seasonId)}
          <tr>
            <td>{row.seasonName}</td>
            {#each LIFECYCLE_STAGES as stage (stage)}
              <td>{row.stages.find((s) => s.lifecycleStage === stage)?.total ?? 0}</td>
            {/each}
            <td>{row.total}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
