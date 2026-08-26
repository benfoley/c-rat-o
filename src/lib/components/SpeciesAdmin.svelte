<script lang="ts">
  import * as repo from '../repo'
  import { loadAll, species } from '../stores'
  import type { Species } from '../types'

  let commonName = $state('')
  let scientificName = $state('')
  let category = $state('')
  let notes = $state('')

  let editingId: string | null = $state(null)
  let editDraft: Species | null = $state(null)

  async function addSpecies(e: SubmitEvent) {
    e.preventDefault()
    if (!commonName.trim()) return
    await repo.createSpecies({
      commonName: commonName.trim(),
      scientificName: scientificName.trim(),
      category: category.trim(),
      notes: notes.trim(),
    })
    commonName = ''
    scientificName = ''
    category = ''
    notes = ''
    await loadAll()
  }

  function startEdit(sp: Species) {
    editingId = sp.id
    editDraft = { ...sp }
  }

  async function saveEdit() {
    if (!editDraft) return
    await repo.updateSpecies(editDraft)
    editingId = null
    editDraft = null
    await loadAll()
  }
</script>

<div class="card">
  <h2>Add a species</h2>
  <form onsubmit={addSpecies}>
    <div class="row">
      <div class="field">
        <label for="sp-common">Common name</label>
        <input id="sp-common" bind:value={commonName} required />
      </div>
      <div class="field">
        <label for="sp-sci">Scientific name</label>
        <input id="sp-sci" bind:value={scientificName} />
      </div>
      <div class="field">
        <label for="sp-cat">Category</label>
        <input id="sp-cat" bind:value={category} placeholder="e.g. beetle" />
      </div>
    </div>
    <div class="field">
      <label for="sp-notes">Notes</label>
      <input id="sp-notes" bind:value={notes} />
    </div>
    <div class="row">
      <button type="submit" class="btn">Add species</button>
    </div>
  </form>
</div>

<div class="card">
  <h2>Species ({$species.length})</h2>
  {#if $species.length === 0}
    <p class="empty-state">No species yet.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Common name</th>
          <th>Scientific name</th>
          <th>Category</th>
          <th>Notes</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each $species as sp (sp.id)}
          <tr>
            {#if editingId === sp.id && editDraft}
              <td><input bind:value={editDraft.commonName} /></td>
              <td><input bind:value={editDraft.scientificName} /></td>
              <td><input bind:value={editDraft.category} /></td>
              <td><input bind:value={editDraft.notes} /></td>
              <td class="row">
                <button type="button" class="btn secondary" onclick={saveEdit}>Save</button>
                <button type="button" class="btn secondary" onclick={() => (editingId = null)}>Cancel</button>
              </td>
            {:else}
              <td>{sp.commonName}</td>
              <td>{sp.scientificName}</td>
              <td>{sp.category}</td>
              <td>{sp.notes}</td>
              <td><button type="button" class="btn secondary" onclick={() => startEdit(sp)}>Edit</button></td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
