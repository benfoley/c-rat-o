<script lang="ts">
  import * as repo from '../repo'
  import { loadAll, rooms, site, trapLocations } from '../stores'
  import type { Room, TrapLocation } from '../types'
  import RoomMap from './RoomMap.svelte'

  let newRoomName = $state('')
  let newRoomCode = $state('')
  let newRoomNotes = $state('')
  let newRoomWidth = $state(4)
  let newRoomHeight = $state(3)

  let selectedRoomId: string | null = $state(null)
  let relocatingTrapId: string | null = $state(null)

  $effect(() => {
    if (!selectedRoomId && $rooms.length > 0) selectedRoomId = $rooms[0].id
  })

  const selectedRoom = $derived($rooms.find((r) => r.id === selectedRoomId) ?? null)
  const roomTraps = $derived($trapLocations.filter((t) => t.roomId === selectedRoomId))

  async function addRoom(e: SubmitEvent) {
    e.preventDefault()
    if (!$site || !newRoomName.trim() || !newRoomCode.trim()) return
    const room = await repo.createRoom({
      siteId: $site.id,
      name: newRoomName.trim(),
      code: newRoomCode.trim().toUpperCase(),
      notes: newRoomNotes.trim(),
      shapeAspectRatio: { width: newRoomWidth, height: newRoomHeight },
    })
    newRoomName = ''
    newRoomCode = ''
    newRoomNotes = ''
    await loadAll()
    selectedRoomId = room.id
  }

  async function handlePlace(x: number, y: number) {
    if (!selectedRoom) return
    if (relocatingTrapId) {
      const previous = roomTraps.find((t) => t.id === relocatingTrapId)
      if (previous) {
        await repo.relocateTrapLocation({ room: selectedRoom, previous, x, y })
      }
      relocatingTrapId = null
    } else {
      await repo.createTrapLocation({ room: selectedRoom, x, y })
    }
    await loadAll()
  }

  async function toggleStatus(trap: TrapLocation) {
    await repo.setTrapLocationStatus(trap, trap.status === 'active' ? 'retired' : 'active')
    await loadAll()
  }

  function startRelocate(trap: TrapLocation) {
    relocatingTrapId = trap.id
  }
</script>

<div class="card">
  <h2>Rooms</h2>
  <form onsubmit={addRoom}>
    <div class="row">
      <div class="field">
        <label for="room-name">Room name</label>
        <input id="room-name" bind:value={newRoomName} placeholder="Room 1" required />
      </div>
      <div class="field" style="max-width: 140px;">
        <label for="room-code">Code (for trap IDs)</label>
        <input id="room-code" bind:value={newRoomCode} placeholder="R1" required />
      </div>
      <div class="field" style="max-width: 100px;">
        <label for="room-w">Shape width</label>
        <input id="room-w" type="number" min="1" bind:value={newRoomWidth} />
      </div>
      <div class="field" style="max-width: 100px;">
        <label for="room-h">Shape height</label>
        <input id="room-h" type="number" min="1" bind:value={newRoomHeight} />
      </div>
    </div>
    <div class="field">
      <label for="room-notes">Notes</label>
      <input id="room-notes" bind:value={newRoomNotes} placeholder="e.g. has unsealed external door" />
    </div>
    <button type="submit" class="btn">Add room</button>
  </form>
</div>

{#if $rooms.length > 0}
  <div class="tabs" role="tablist" aria-label="Room to configure">
    {#each $rooms as room (room.id)}
      <button
        type="button"
        class:active={room.id === selectedRoomId}
        onclick={() => {
          selectedRoomId = room.id
          relocatingTrapId = null
        }}
      >
        {room.name}
      </button>
    {/each}
  </div>
{/if}

{#if selectedRoom}
  <div class="card">
    <h2>{selectedRoom.name} — layout</h2>
    <p class="muted">
      {#if relocatingTrapId}
        Tap the new position for the selected trap.
      {:else}
        Tap anywhere on the layout to add a new trap location.
      {/if}
    </p>
    <RoomMap
      room={selectedRoom}
      trapLocations={roomTraps.filter((t) => t.status === 'active')}
      statusFor={() => 'unknown'}
      onPlace={handlePlace}
    />
    {#if relocatingTrapId}
      <button type="button" class="btn secondary" onclick={() => (relocatingTrapId = null)}>Cancel relocate</button>
    {/if}
  </div>

  <div class="card">
    <h2>Trap locations in {selectedRoom.name}</h2>
    {#if roomTraps.length === 0}
      <p class="empty-state">No trap locations yet — tap the layout above to add one.</p>
    {:else}
      <table>
        <thead>
          <tr>
            <th>Label</th>
            <th>Status</th>
            <th>Position</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each roomTraps as trap (trap.id)}
            <tr>
              <td>{trap.label}</td>
              <td><span class="pill status-{trap.status}">{trap.status}</span></td>
              <td>{trap.x.toFixed(1)}%, {trap.y.toFixed(1)}%</td>
              <td class="row">
                {#if trap.status === 'active'}
                  <button type="button" class="btn secondary" onclick={() => startRelocate(trap)}
                    >Relocate</button
                  >
                {/if}
                <button type="button" class="btn secondary" onclick={() => toggleStatus(trap)}>
                  {trap.status === 'active' ? 'Retire' : 'Reactivate'}
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
{/if}
