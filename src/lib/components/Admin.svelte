<script lang="ts">
  import DataAdmin from './DataAdmin.svelte'
  import RoomsAdmin from './RoomsAdmin.svelte'
  import SeasonsAdmin from './SeasonsAdmin.svelte'
  import SpeciesAdmin from './SpeciesAdmin.svelte'

  type Tab = 'rooms' | 'species' | 'seasons' | 'data'
  let tab: Tab = $state('rooms')
</script>

<div class="tabs" role="tablist" aria-label="Admin section">
  <button type="button" class:active={tab === 'rooms'} onclick={() => (tab = 'rooms')}
    >Rooms &amp; layout</button
  >
  <button type="button" class:active={tab === 'species'} onclick={() => (tab = 'species')}>Species</button>
  <button type="button" class:active={tab === 'seasons'} onclick={() => (tab = 'seasons')}>Seasons</button>
  <button type="button" class:active={tab === 'data'} onclick={() => (tab = 'data')}>Backup &amp; data</button>
</div>

{#if tab === 'rooms'}
  <RoomsAdmin />
{:else if tab === 'species'}
  <SpeciesAdmin />
{:else if tab === 'seasons'}
  <SeasonsAdmin />
{:else}
  <DataAdmin />
{/if}
