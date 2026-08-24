<script lang="ts">
  import { trapActivityStatus, type TrapActivityStatus } from '../trapStatus'
  import { checks, rooms, trapLocations } from '../stores'
  import type { TrapLocation } from '../types'
  import LogCheckForm from './LogCheckForm.svelte'
  import RoomMap from './RoomMap.svelte'
  import TrapHistory from './TrapHistory.svelte'

  let selectedRoomId: string | null = $state(null)
  let selectedTrapId: string | null = $state(null)

  $effect(() => {
    if (!selectedRoomId && $rooms.length > 0) selectedRoomId = $rooms[0].id
  })

  const selectedRoom = $derived($rooms.find((r) => r.id === selectedRoomId) ?? null)
  const roomTraps = $derived(
    $trapLocations.filter((t) => t.roomId === selectedRoomId && t.status === 'active'),
  )
  const selectedTrap = $derived(roomTraps.find((t) => t.id === selectedTrapId) ?? null)

  function statusFor(trapId: string): TrapActivityStatus {
    return trapActivityStatus($checks.filter((c) => c.trapLocationId === trapId))
  }

  function selectRoom(id: string) {
    selectedRoomId = id
    selectedTrapId = null
  }
</script>

{#if $rooms.length === 0}
  <div class="empty-state">
    No rooms configured yet. Go to Admin → Rooms &amp; Layout to set up this site.
  </div>
{:else}
  <div class="tabs" role="tablist" aria-label="Room">
    {#each $rooms as room (room.id)}
      <button type="button" class:active={room.id === selectedRoomId} onclick={() => selectRoom(room.id)}>
        {room.name}
      </button>
    {/each}
  </div>

  {#if selectedRoom}
    <div class="card">
      <h2>{selectedRoom.name} — trap map</h2>
      {#if selectedRoom.notes}<p class="muted">{selectedRoom.notes}</p>{/if}
      {#if roomTraps.length === 0}
        <p class="empty-state">No active traps in this room yet. Add some in Admin.</p>
      {:else}
        <RoomMap
          room={selectedRoom}
          trapLocations={roomTraps}
          selectedId={selectedTrapId}
          statusFor={(id) => statusFor(id)}
          onSelect={(t: TrapLocation) => (selectedTrapId = t.id)}
        />
        <div class="legend">
          <span><span class="dot" style="background:var(--green)"></span>Changed within a month</span>
          <span><span class="dot" style="background:var(--amber)"></span>1–2 months</span>
          <span><span class="dot" style="background:var(--red)"></span>Over 2 months</span>
          <span><span class="dot" style="background:var(--grey)"></span>Never recorded</span>
        </div>
      {/if}
    </div>
  {/if}

  {#if selectedTrap}
    <LogCheckForm trap={selectedTrap} />
    <TrapHistory trap={selectedTrap} />
  {:else if roomTraps.length > 0}
    <p class="muted">Tap a trap on the map to log a check or view its history.</p>
  {/if}
{/if}
