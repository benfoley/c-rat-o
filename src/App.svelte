<script lang="ts">
  import { onMount } from 'svelte'
  import DataInput from './lib/components/DataInput.svelte'
  import Reporting from './lib/components/Reporting.svelte'
  import Admin from './lib/components/Admin.svelte'
  import { loaded, loadAll, site } from './lib/stores'

  type Mode = 'input' | 'reporting' | 'admin'
  let mode: Mode = $state('input')

  onMount(() => {
    loadAll()
  })
</script>

<div class="app-shell">
  <header class="app-header">
    <h1>c-rat-o<span class="subtitle">{$site ? ` — ${$site.name}` : ''}</span></h1>
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
