<script lang="ts">
  import { colorForIndex } from '../chartColors'

  let { items, emptyLabel = 'No data for this filter' }: {
    items: { label: string; total: number; colorIndex?: number }[]
    emptyLabel?: string
  } = $props()

  const total = $derived(items.reduce((sum, i) => sum + i.total, 0))

  interface Segment {
    label: string
    total: number
    color: string
    dashArray: string
    dashOffset: number
  }

  const circumference = 2 * Math.PI * 15.9155

  const segments = $derived.by((): Segment[] => {
    if (total === 0) return []
    let offset = 0
    return items.map((item, i) => {
      const fraction = item.total / total
      const length = fraction * circumference
      const seg: Segment = {
        label: item.label,
        total: item.total,
        color: colorForIndex(item.colorIndex ?? i),
        dashArray: `${length} ${circumference - length}`,
        dashOffset: -offset,
      }
      offset += length
      return seg
    })
  })
</script>

{#if items.length === 0 || total === 0}
  <p class="empty-state">{emptyLabel}</p>
{:else}
  <div class="donut-wrap">
    <svg viewBox="0 0 36 36" class="donut" role="img" aria-label="Lifecycle stage breakdown">
      <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--border)" stroke-width="4" />
      {#each segments as seg (seg.label)}
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke={seg.color}
          stroke-width="4"
          stroke-dasharray={seg.dashArray}
          stroke-dashoffset={seg.dashOffset}
          transform="rotate(-90 18 18)"
        />
      {/each}
    </svg>
    <ul class="donut-legend">
      {#each segments as seg (seg.label)}
        <li><span class="dot" style={`background:${seg.color}`}></span>{seg.label} — {seg.total}</li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .donut-wrap {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    flex-wrap: wrap;
  }
  .donut {
    width: 140px;
    height: 140px;
    flex-shrink: 0;
  }
  .donut-legend {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
</style>
