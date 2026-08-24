<script lang="ts">
  import { colorForIndex } from '../chartColors'

  let { items, emptyLabel = 'No data for this filter' }: {
    items: { label: string; total: number }[]
    emptyLabel?: string
  } = $props()

  const max = $derived(Math.max(1, ...items.map((i) => i.total)))
</script>

{#if items.length === 0}
  <p class="empty-state">{emptyLabel}</p>
{:else}
  <div class="bar-chart">
    {#each items as item, i (item.label)}
      <div class="bar-row">
        <span class="bar-label" title={item.label}>{item.label}</span>
        <div class="bar-track">
          <div class="bar-fill" style={`width:${(item.total / max) * 100}%; background:${colorForIndex(i)}`}></div>
        </div>
        <span class="bar-total">{item.total}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .bar-chart {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .bar-row {
    display: grid;
    grid-template-columns: minmax(90px, 160px) 1fr 2.5rem;
    align-items: center;
    gap: 0.6rem;
  }
  .bar-label {
    font-size: 0.85rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bar-track {
    background: var(--border);
    border-radius: 999px;
    height: 14px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 999px;
  }
  .bar-total {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-size: 0.85rem;
  }
</style>
