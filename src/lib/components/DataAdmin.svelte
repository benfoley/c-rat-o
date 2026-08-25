<script lang="ts">
  import { bundleToJsonFile, exportBundle, exportConfigBundle, importBundle, type DataBundle } from '../exportImport'
  import { loadAll } from '../stores'
  import GoogleDriveSync from './GoogleDriveSync.svelte'

  let importing = $state(false)
  let message: string | null = $state(null)
  let fileInput: HTMLInputElement | null = $state(null)

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

<GoogleDriveSync />
