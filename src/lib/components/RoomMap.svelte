<script lang="ts">
  import type { Room, TrapLocation } from '../types'

  let {
    room,
    trapLocations,
    selectedId = null,
    statusFor = () => 'unknown',
    labelFor = (t: TrapLocation) => t.label,
    onSelect = () => {},
    onPlace = null,
  }: {
    room: Room
    trapLocations: TrapLocation[]
    selectedId?: string | null
    statusFor?: (id: string) => string
    labelFor?: (t: TrapLocation) => string
    onSelect?: (t: TrapLocation) => void
    onPlace?: ((x: number, y: number) => void) | null
  } = $props()

  function handleMapClick(e: MouseEvent) {
    if (!onPlace) return
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100))
    onPlace(Math.round(x * 10) / 10, Math.round(y * 10) / 10)
  }

  function markerNumber(trap: TrapLocation): string {
    const parts = trap.label.split('-T')
    return parts.length > 1 ? parts[1] : trap.label
  }
</script>

{#snippet markers()}
  {#each trapLocations as trap (trap.id)}
    <button
      type="button"
      class="trap-marker status-{statusFor(trap.id)}"
      class:selected={trap.id === selectedId}
      style={`left:${trap.x}%; top:${trap.y}%`}
      onclick={(e) => {
        e.stopPropagation()
        onSelect(trap)
      }}
      title={labelFor(trap)}
    >
      {markerNumber(trap)}
    </button>
  {/each}
{/snippet}

{#if onPlace}
  <div
    class="room-map placeable"
    style={`aspect-ratio: ${room.shapeAspectRatio.width} / ${room.shapeAspectRatio.height}`}
    onclick={handleMapClick}
    role="button"
    tabindex="0"
    aria-label={`Layout of ${room.name}. Click or tap to place a trap.`}
  >
    {@render markers()}
  </div>
{:else}
  <div
    class="room-map"
    style={`aspect-ratio: ${room.shapeAspectRatio.width} / ${room.shapeAspectRatio.height}`}
    role="img"
    aria-label={`Layout of ${room.name}`}
  >
    {@render markers()}
  </div>
{/if}

<style>
  .placeable {
    cursor: crosshair;
  }
</style>
