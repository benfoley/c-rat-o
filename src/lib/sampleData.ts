import { v4 as uuid } from 'uuid'
import * as repo from './repo'
import { addStarterSpecies, loadAll } from './stores'
import sampleData from './sampleData.json'
import type { LifecycleStage, Observation } from './types'

function isoDateDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

/**
 * Populates 2 sample seasons, 3 sample rooms (2 trap locations each) and 6
 * sample trap-check observations, so a fresh install can be explored without
 * manual setup. Safe to run more than once — matches on season name / room
 * code / trap position instead of duplicating.
 */
export async function populateSampleData(): Promise<void> {
  await addStarterSpecies()

  const site = await repo.getOrCreateDefaultSite()
  const allSpecies = await repo.listSpecies()

  const existingSeasons = await repo.listSeasons()
  for (const seasonDef of sampleData.seasons) {
    if (existingSeasons.some((s) => s.name === seasonDef.name)) continue
    await repo.createSeason(seasonDef)
  }

  const trapIdsByRoom: string[][] = []
  for (const roomDef of sampleData.rooms) {
    const existingRooms = await repo.listRooms(site.id)
    let room = existingRooms.find((r) => r.code === roomDef.code)
    if (!room) {
      room = await repo.createRoom({
        siteId: site.id,
        name: roomDef.name,
        code: roomDef.code,
        notes: roomDef.notes,
        shapeAspectRatio: roomDef.shapeAspectRatio,
      })
    }

    const existingTraps = await repo.listTrapLocations(room.id)
    const trapIds: string[] = []
    for (const trapDef of roomDef.traps) {
      let trap = existingTraps.find(
        (t) => Math.abs(t.x - trapDef.x) < 0.01 && Math.abs(t.y - trapDef.y) < 0.01,
      )
      if (!trap) {
        trap = await repo.createTrapLocation({ room, x: trapDef.x, y: trapDef.y })
      }
      trapIds.push(trap.id)
    }
    trapIdsByRoom.push(trapIds)
  }

  const existingChecks = await repo.listChecks()
  for (const obs of sampleData.observations) {
    const trapLocationId = trapIdsByRoom[obs.room][obs.trap]
    if (existingChecks.some((c) => c.trapLocationId === trapLocationId)) continue

    const species = allSpecies.find((s) => s.commonName === obs.species)
    if (!species) continue

    const observation: Observation = {
      id: uuid(),
      speciesId: species.id,
      lifecycleStage: obs.lifecycleStage as LifecycleStage,
      quantity: obs.quantity,
    }
    await repo.createCheck({
      trapLocationId,
      dateChecked: isoDateDaysAgo(obs.daysChecked),
      dateSet: isoDateDaysAgo(obs.daysSet),
      observations: [observation],
      notes: obs.notes,
    })
  }

  await loadAll()
}
