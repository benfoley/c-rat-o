<script lang="ts">
  import { downscaleImage } from '../imageResize'
  import { currentPlacement } from '../placements'
  import * as repo from '../repo'
  import { checks, loadAll, species } from '../stores'
  import { LIFECYCLE_STAGES, LIFECYCLE_STAGE_LABELS, type LifecycleStage, type TrapLocation } from '../types'

  let { trap }: { trap: TrapLocation } = $props()

  function todayIso(): string {
    return new Date().toISOString().slice(0, 10)
  }

  interface DraftObservation {
    key: number
    speciesId: string
    lifecycleStage: LifecycleStage
    quantity: number
  }

  let keyCounter = 0
  let dateChecked = $state(todayIso())
  let markSet = $state(false)
  let dateSet = $state(todayIso())
  let markReplaced = $state(false)
  let dateReplaced = $state(todayIso())
  let notes = $state('')
  let observations: DraftObservation[] = $state([])
  let files: FileList | null = $state(null)
  let saving = $state(false)
  let newSpeciesNameFor: number | null = $state(null)
  let newSpeciesName = $state('')

  const trapChecks = $derived($checks.filter((c) => c.trapLocationId === trap.id))
  const placement = $derived(currentPlacement(trapChecks, trap.id))

  $effect(() => {
    // default "new trap set" on when there is no open placement yet
    markSet = !placement
  })

  function addObservation() {
    observations = [
      ...observations,
      { key: keyCounter++, speciesId: $species[0]?.id ?? '', lifecycleStage: 'adult', quantity: 1 },
    ]
  }

  function removeObservation(key: number) {
    observations = observations.filter((o) => o.key !== key)
  }

  async function confirmNewSpecies(key: number) {
    const name = newSpeciesName.trim()
    if (!name) return
    const created = await repo.createSpecies({ commonName: name })
    species.update((list) => [...list, created].sort((a, b) => a.commonName.localeCompare(b.commonName)))
    observations = observations.map((o) => (o.key === key ? { ...o, speciesId: created.id } : o))
    newSpeciesNameFor = null
    newSpeciesName = ''
  }

  function resetForm() {
    dateChecked = todayIso()
    markReplaced = false
    dateReplaced = todayIso()
    notes = ''
    observations = []
    files = null
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    saving = true
    try {
      const check = await repo.createCheck({
        trapLocationId: trap.id,
        dateChecked,
        dateSet: markSet ? dateSet : null,
        dateReplaced: markReplaced ? dateReplaced : null,
        observations: observations
          .filter((o) => o.speciesId)
          .map((o) => ({ id: crypto.randomUUID(), speciesId: o.speciesId, lifecycleStage: o.lifecycleStage, quantity: o.quantity })),
        notes,
      })

      const photoIds: string[] = []
      if (files) {
        for (const file of Array.from(files)) {
          const blob = await downscaleImage(file)
          const photo = await repo.savePhoto(check.id, blob)
          photoIds.push(photo.id)
        }
        if (photoIds.length > 0) {
          await repo.updateCheck({ ...check, photoIds })
        }
      }

      await loadAll()
      resetForm()
    } finally {
      saving = false
    }
  }
</script>

<form class="card" onsubmit={submit}>
  <h2>Log a check — {trap.label}</h2>

  {#if placement?.dateSet}
    <p class="muted">Current trap set on {placement.dateSet}.</p>
  {:else}
    <p class="muted">No trap currently recorded as set at this location.</p>
  {/if}

  <div class="row">
    <div class="field">
      <label for="dateChecked">Date checked</label>
      <input id="dateChecked" type="date" bind:value={dateChecked} required />
    </div>
  </div>

  <div class="row">
    <label class="field" style="flex-direction: row; align-items: center; gap: 0.5rem;">
      <input type="checkbox" bind:checked={markSet} />
      <span>New trap set today</span>
    </label>
    {#if markSet}
      <div class="field">
        <label for="dateSet">Date set</label>
        <input id="dateSet" type="date" bind:value={dateSet} required />
      </div>
    {/if}
  </div>

  <div class="row">
    <label class="field" style="flex-direction: row; align-items: center; gap: 0.5rem;">
      <input type="checkbox" bind:checked={markReplaced} />
      <span>Old trap removed/replaced today</span>
    </label>
    {#if markReplaced}
      <div class="field">
        <label for="dateReplaced">Date replaced</label>
        <input id="dateReplaced" type="date" bind:value={dateReplaced} required />
      </div>
    {/if}
  </div>

  <h3>Observations</h3>
  {#each observations as obs (obs.key)}
    <div class="observation-row">
      <div class="field">
        <label for={`species-${obs.key}`}>Species</label>
        {#if newSpeciesNameFor === obs.key}
          <div class="row">
            <input
              placeholder="New species common name"
              bind:value={newSpeciesName}
              aria-label="New species common name"
            />
            <button type="button" class="btn secondary" onclick={() => confirmNewSpecies(obs.key)}
              >Add</button
            >
          </div>
        {:else}
          <select id={`species-${obs.key}`} bind:value={obs.speciesId}>
            {#each $species as sp (sp.id)}
              <option value={sp.id}>{sp.commonName}</option>
            {/each}
          </select>
          <button
            type="button"
            class="btn secondary"
            onclick={() => {
              newSpeciesNameFor = obs.key
              newSpeciesName = ''
            }}>+ New species</button
          >
        {/if}
      </div>
      <div class="field">
        <label for={`stage-${obs.key}`}>Lifecycle stage</label>
        <select id={`stage-${obs.key}`} bind:value={obs.lifecycleStage}>
          {#each LIFECYCLE_STAGES as stage (stage)}
            <option value={stage}>{LIFECYCLE_STAGE_LABELS[stage]}</option>
          {/each}
        </select>
      </div>
      <div class="field" style="max-width: 100px;">
        <label for={`qty-${obs.key}`}>Quantity</label>
        <input id={`qty-${obs.key}`} type="number" min="1" bind:value={obs.quantity} />
      </div>
      <button type="button" class="btn danger" onclick={() => removeObservation(obs.key)}>Remove</button>
    </div>
  {/each}
  <button type="button" class="btn secondary" onclick={addObservation}>+ Add observation</button>

  <div class="field" style="margin-top: 0.75rem;">
    <label for="notes">Notes</label>
    <textarea id="notes" bind:value={notes} placeholder="Free text notes"></textarea>
  </div>

  <div class="field">
    <label for="photos">Photos</label>
    <input id="photos" type="file" accept="image/*" capture="environment" multiple bind:files />
  </div>

  <button type="submit" class="btn" disabled={saving}>{saving ? 'Saving…' : 'Save check'}</button>
</form>
