<script lang="ts">
  import { onMount } from 'svelte'
  import DataInput from './lib/components/DataInput.svelte'
  import Reporting from './lib/components/Reporting.svelte'
  import Admin from './lib/components/Admin.svelte'
  import { loaded, loadAll } from './lib/stores'
  import { driveAccountEmail, driveConnected } from './lib/driveSync'

  type Mode = 'input' | 'reporting' | 'admin'
  let mode: Mode = $state('input')

  onMount(() => {
    loadAll()
  })
</script>

<div class="app-shell">
  <header class="app-header">
    <div class="header-title">
      <h1>c-rat-o</h1>
      {#if $driveConnected}
        <span class="pill status-active drive-status">Drive: {$driveAccountEmail ?? 'Connected'}</span>
      {/if}
    </div>
    <nav class="mode-tabs" aria-label="Mode">
      <button type="button" class:active={mode === 'input'} onclick={() => (mode = 'input')}>
        Data Input
      </button>
      <button type="button" class:active={mode === 'reporting'} onclick={() => (mode = 'reporting')}>
        Reporting
      </button>
      <button type="button" class:active={mode === 'admin'} onclick={() => (mode = 'admin')}>
        Admin
      </button>
    </nav>
  </header>

  <main class="app-main">
    {#if !$loaded}
      <p class="loading">Loading…</p>
    {:else if mode === 'input'}
      <DataInput />
    {:else if mode === 'reporting'}
      <Reporting />
    {:else}
      <Admin />
    {/if}
  </main>
</div>
