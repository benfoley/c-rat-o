<script lang="ts">
  import * as repo from '../repo'
  import { loadAll, seasons } from '../stores'
  import type { Season } from '../types'

  let name = $state('')
  let startDate = $state('')
  let endDate = $state('')

  let editingId: string | null = $state(null)
  let editDraft: Season | null = $state(null)

  async function addSeason(e: SubmitEvent) {
    e.preventDefault()
    if (!name.trim() || !startDate || !endDate) return
    await repo.createSeason({ name: name.trim(), startDate, endDate })
    name = ''
    startDate = ''
    endDate = ''
    await loadAll()
  }

  function startEdit(season: Season) {
    editingId = season.id
    editDraft = { ...season }
  }

  async function saveEdit() {
    if (!editDraft) return
    await repo.updateSeason(editDraft)
    editingId = null
    editDraft = null
    await loadAll()
  }

  async function remove(id: string) {
    await repo.deleteSeason(id)
    await loadAll()
  }
</script>

<div class="card">
  <h2>Add a season</h2>
  <p class="muted">Dates are matched by month/day every year, so a season repeats annually. Use a range that wraps into the next year (e.g. Nov 1 → Apr 30) for a wet season spanning the new year.</p>
  <form onsubmit={addSeason}>
    <div class="row">
      <div class="field">
        <label for="season-name">Name</label>
        <input id="season-name" bind:value={name} placeholder="Wet season" required />
      </div>
      <div class="field">
        <label for="season-start">Start date</label>
        <input id="season-start" type="date" bind:value={startDate} required />
      </div>
      <div class="field">
        <label for="season-end">End date</label>
        <input id="season-end" type="date" bind:value={endDate} required />
      </div>
    </div>
    <button type="submit" class="btn">Add season</button>
  </form>
</div>

<div class="card">
  <h2>Seasons ({$seasons.length})</h2>
  {#if $seasons.length === 0}
    <p class="empty-state">No seasons defined yet.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Start</th>
          <th>End</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each $seasons as season (season.id)}
          <tr>
            {#if editingId === season.id && editDraft}
              <td><input bind:value={editDraft.name} /></td>
              <td><input type="date" bind:value={editDraft.startDate} /></td>
              <td><input type="date" bind:value={editDraft.endDate} /></td>
              <td class="row">
                <button type="button" class="btn secondary" onclick={saveEdit}>Save</button>
                <button type="button" class="btn secondary" onclick={() => (editingId = null)}>Cancel</button>
              </td>
            {:else}
              <td>{season.name}</td>
              <td>{season.startDate}</td>
              <td>{season.endDate}</td>
              <td class="row">
                <button type="button" class="btn secondary" onclick={() => startEdit(season)}>Edit</button>
                <button type="button" class="btn danger" onclick={() => remove(season.id)}>Delete</button>
              </td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
