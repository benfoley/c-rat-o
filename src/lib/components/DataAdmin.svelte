<script lang="ts">
  import {
    bundleToJsonFile,
    exportBundle,
    exportConfigBundle,
    importBundle,
    resetAllData,
    type DataBundle,
  } from '../exportImport'
  import { populateSampleData } from '../sampleData'
  import { addStarterSpecies, loadAll } from '../stores'
  import GoogleDriveSync from './GoogleDriveSync.svelte'

  let importing = $state(false)
  let message: string | null = $state(null)
  let fileInput: HTMLInputElement | null = $state(null)
  let seeding = $state(false)
  let resetting = $state(false)
  let sampleDataMessage: string | null = $state(null)

  function downloadBundle(bundle: DataBundle, filename: string) {
    const blob = bundleToJsonFile(bundle)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportFull() {
    const bundle = await exportBundle()
    downloadBundle(bundle, `c-rat-o-backup-${new Date().toISOString().slice(0, 10)}.json`)
  }

  async function exportConfig() {
    const bundle = await exportConfigBundle()
    downloadBundle(bundle, `c-rat-o-config-${new Date().toISOString().slice(0, 10)}.json`)
  }

  async function handleImport(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    if (!confirm('Importing will replace all data currently on this device. Continue?')) {
      input.value = ''
      return
    }
    importing = true
    message = null
    try {
      const text = await file.text()
      const bundle = JSON.parse(text) as DataBundle
      await importBundle(bundle)
      await loadAll()
      message = 'Import complete.'
    } catch (err) {
      message = `Import failed: ${err instanceof Error ? err.message : String(err)}`
    } finally {
      importing = false
      input.value = ''
    }
  }

  async function handlePopulateSampleData() {
    seeding = true
    sampleDataMessage = null
    try {
      await populateSampleData()
      sampleDataMessage =
        'Sample data added: starter pest list, 2 seasons, 3 rooms, 6 trap locations, 6 observations.'
    } finally {
      seeding = false
    }
  }

  async function handleResetAllData() {
    if (
      !confirm(
        'This will permanently delete ALL data on this device — every room, trap, species, season, check and photo, not just sample data. This cannot be undone. Continue?',
      )
    ) {
      return
    }
    resetting = true
    sampleDataMessage = null
    try {
      await resetAllData()
      await loadAll()
      sampleDataMessage = 'All data on this device has been reset.'
    } finally {
      resetting = false
    }
  }
</script>

<div class="card">
  <h2>Backup &amp; transfer</h2>
  <p class="muted">
    Data is stored only on this device's browser. Export a full backup regularly, and use it to move
    data between the iPad and desktop, or to restore after clearing browser data.
  </p>
  <div class="row">
    <button type="button" class="btn" onclick={exportFull}>Export full backup (data + photos)</button>
    <button type="button" class="btn secondary" onclick={exportConfig}
      >Export site configuration only</button
    >
  </div>
</div>

<div class="card">
  <h2>Import</h2>
  <p class="muted">
    Importing a backup <strong>replaces</strong> everything currently stored on this device. Use "site
    configuration only" exports to set up a new deployment (e.g. a different building) from scratch.
  </p>
  <input
    bind:this={fileInput}
    type="file"
    accept="application/json"
    onchange={handleImport}
    disabled={importing}
  />
  {#if importing}<p class="muted">Importing…</p>{/if}
  {#if message}<p>{message}</p>{/if}
</div>

<div class="card">
  <h2>Sample data</h2>
  <p class="muted">
    Populate this device with example data to explore the app, or as a starting point for a new
    deployment.
  </p>
  <div class="row">
    <button type="button" class="btn secondary" onclick={handlePopulateSampleData} disabled={seeding}>
      {seeding ? 'Populating…' : 'Populate sample data'}
    </button>
  </div>
  <p class="muted">
    Adds the starter pest list below, 2 seasons, 3 rooms with 2 trap locations each, and 6 sample
    trap-check observations. Existing species, seasons, rooms, traps and checks are left untouched.
  </p>
  <div class="row">
    <button type="button" class="btn secondary" onclick={addStarterSpecies}>Add starter pest list</button>
  </div>
  <p class="muted">
    Adds a list of common archive pests (silverfish, cockroaches, carpet beetles, clothes moths and
    more) to the species list on its own, without adding any rooms, traps or observations.
  </p>
  <div class="row">
    <button type="button" class="btn danger" onclick={handleResetAllData} disabled={resetting}>
      {resetting ? 'Resetting…' : 'Reset all data'}
    </button>
  </div>
  <p class="muted">
    Permanently deletes <strong>everything</strong> on this device — not just sample data. Export a
    backup first if you want to keep anything.
  </p>
  {#if sampleDataMessage}<p>{sampleDataMessage}</p>{/if}
</div>

<GoogleDriveSync />
