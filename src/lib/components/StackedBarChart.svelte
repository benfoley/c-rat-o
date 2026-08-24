<script lang="ts">
  import { colorForIndex } from '../chartColors'
  import { LIFECYCLE_STAGES, LIFECYCLE_STAGE_LABELS, type LifecycleStage } from '../types'

  let { points, emptyLabel = 'No data for this filter' }: {
    points: { date: string; stages: Partial<Record<LifecycleStage, number>>; total: number }[]
    emptyLabel?: string
  } = $props()

  const max = $derived(Math.max(1, ...points.map((p) => p.total)))
</script>

{#if points.length === 0}
  <p class="empty-state">{emptyLabel}</p>
{:else}
  <div class="stacked-chart">
    <div class="columns">
      {#each points as point (point.date)}
        <div class="column" title={`${point.date}: ${point.total}`}>
          <div class="stack" style={`height:${(point.total / max) * 100}%`}>
            {#each LIFECYCLE_STAGES as stage, i (stage)}
              {#if point.stages[stage]}
                <div
                  class="segment"
                  style={`flex:${point.stages[stage]}; background:${colorForIndex(i)}`}
                ></div>
              {/if}
            {/each}
          </div>
          <span class="column-label">{point.date.slice(5)}</span>
        </div>
      {/each}
    </div>
    <ul class="donut-legend">
      {#each LIFECYCLE_STAGES as stage, i (stage)}
        <li><span class="dot" style={`background:${colorForIndex(i)}`}></span>{LIFECYCLE_STAGE_LABELS[stage]}</li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .stacked-chart {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .columns {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    height: 160px;
    overflow-x: auto;
    padding-bottom: 0.25rem;
  }
  .column {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    height: 100%;
    min-width: 28px;
  }
  .stack {
    width: 20px;
    display: flex;
    flex-direction: column-reverse;
    border-radius: 3px 3px 0 0;
    overflow: hidden;
  }
  .segment {
    width: 100%;
  }
  .column-label {
    margin-top: 0.3rem;
    font-size: 0.68rem;
    color: var(--text-muted);
    writing-mode: vertical-rl;
  }
  .donut-legend {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.82rem;
  }
</style>
