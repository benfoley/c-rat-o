<script lang="ts">
  import * as repo from '../repo'
  import { checks, species } from '../stores'
  import { LIFECYCLE_STAGE_LABELS, type TrapLocation } from '../types'

  let { trap }: { trap: TrapLocation } = $props()

  const trapChecks = $derived(
    $checks.filter((c) => c.trapLocationId === trap.id).sort((a, b) => b.dateChecked.localeCompare(a.dateChecked)),
  )

  const speciesById = $derived(new Map($species.map((s) => [s.id, s])))

  let photoUrls = $state(new Map<string, string>())

  $effect(() => {
    const ids = trapChecks.flatMap((c) => c.photoIds)
    let cancelled = false
    ;(async () => {
      const next = new Map<string, string>()
      for (const id of ids) {
        const photo = await repo.getPhoto(id)
        if (!photo) continue
        const blob = await repo.getPhotoBlob(photo.blobKey)
        if (!blob) continue
        next.set(id, URL.createObjectURL(blob))
      }
      if (!cancelled) photoUrls = next
    })()
    return () => {
      cancelled = true
      for (const url of photoUrls.values()) URL.revokeObjectURL(url)
    }
  })
</script>

<div class="card">
  <h2>History — {trap.label}</h2>
  {#if trapChecks.length === 0}
    <p class="empty-state">No checks logged yet for this trap.</p>
  {:else}
    {#each trapChecks as check (check.id)}
      <div class="history-entry">
        <div class="row" style="justify-content: space-between;">
          <strong>{check.dateChecked}</strong>
          {#if check.dateSet}<span class="pill">Set {check.dateSet}</span>{/if}
          {#if check.dateReplaced}<span class="pill">Replaced {check.dateReplaced}</span>{/if}
        </div>
        {#if check.observations.length === 0}
          <p class="muted">Nothing caught.</p>
        {:else}
          <ul>
            {#each check.observations as obs (obs.id)}
              <li>
                {speciesById.get(obs.speciesId)?.commonName ?? 'Unknown species'} —
                {LIFECYCLE_STAGE_LABELS[obs.lifecycleStage]} × {obs.quantity}
              </li>
            {/each}
          </ul>
        {/if}
        {#if check.notes}<p>{check.notes}</p>{/if}
        {#if check.photoIds.length > 0}
          <div class="photo-strip">
            {#each check.photoIds as id (id)}
              {#if photoUrls.get(id)}
                <img class="photo-thumb" src={photoUrls.get(id)} alt="" />
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>

<style>
  .history-entry {
    border-top: 1px solid var(--border);
    padding: 0.75rem 0;
  }
  .history-entry:first-of-type {
    border-top: none;
    padding-top: 0;
  }
</style>
