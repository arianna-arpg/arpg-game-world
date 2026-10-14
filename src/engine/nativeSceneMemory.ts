/** Exact native memory capture. This is cold-resume policy, not a combat checkpoint. */
import {readNativeCrusadeFixtureMemory} from './nativeCrusadeFixtureMemory';
import type {World} from './world';
import type {MagicPackState} from './magicPacks';
import {savedMovementTether} from './movementTether';
import {ZONE_MEMORY_CFG,captureZoneContents,type NativeZoneContentsHost} from './zonecontents';
export type NativeZoneMemory=World['zoneMemory'] extends Map<string,infer M>?M:never;
type ZoneMemory=NativeZoneMemory;
type ZoneEnemyMemo=NativeZoneMemory['enemies'][number];
export interface NativeSceneMemorySnapshotHost extends NativeZoneContentsHost {
 zone:World['zone'];
 inCave:World['inCave'];
 visited:World['visited'];
 actors:World['actors'];
 doodads:World['doodads'];
 objectiveDone:World['objectiveDone'];
 procession:World['procession'];
 actorById:World['actorById'];
 objectiveLost:World['objectiveLost'];
 currentZoneSeed:World['currentZoneSeed'];
 time:World['time'];
 openedHollows:World['openedHollows'];
 annexOpen:World['annexOpen'];
 wave:World['wave'];
 waveActive:World['waveActive'];
 spires:World['spires'];
 rifts:World['rifts'];
 pyres:World['pyres'];
 digs:World['digs'];
 occs:World['occs'];
 harvestNodes:World['harvestNodes'];
 offering:World['offering'];
 cull:World['cull'];
 puzzles:World['puzzles'];
 charBorn:World['charBorn'];
}
export interface NativeSceneMemoryCaptureHost {
 zone:World['zone'];zoneMemory:World['zoneMemory'];
 zoneMemorySnapshot():NativeZoneMemory|null;
}
export function sceneZoneMemorySnapshot(host:NativeSceneMemorySnapshotHost):NativeZoneMemory|null {
    const z = host.zone;
    // Remember towns by policy; skip the streamed abyss and unvisited SURFACE
    // ground (caves never chart, so they bypass the visited gate). WAVES zones
    // are remembered like everything else now: the counter + mid-wave survivors
    // ride the memo (wave/waveActive below; spawnWave flags its bodies
    // fromZoneGen), so the old double-fight hazard — remembered camp enemies
    // stacked on a reset counter — cannot arise: nothing about the fight resets
    // while the memory lives.
    if (!z || z.boundless || (z.objective.kind === 'safe' && !ZONE_MEMORY_CFG.rememberSafeZones)
      || (!host.inCave && !host.visited.has(z.id))) return null;
    const enemies: ZoneEnemyMemo[] = [];
    for (const a of host.actors) {
      if (a.dead || a.team !== 'enemy' || !a.fromZoneGen || !a.defId || a.doorId) continue;
      enemies.push({
        defId: a.defId, level: a.level, x: a.pos.x, y: a.pos.y,
        ...(readNativeCrusadeFixtureMemory(a)?{crusadeFixture:{...readNativeCrusadeFixtureMemory(a)!}}:{}),
        life: a.life, faction: a.faction, rarity: a.rarity, tag: a.tag,
        ...(a.magicPack ? { magicPack: JSON.parse(JSON.stringify(a.magicPack)) as MagicPackState } : {}),
        movementTether: savedMovementTether(a),
        ...(a.encounterGroup ? { encounterGroup: { ...a.encounterGroup } } : {}),
        name: a.name, ...(a.tier ? { tier: a.tier } : {}),
        ...(a.aiAwakened ? { aiAwakened: 1 as const } : {}),
      });
    }
    // Structure-door states (id → open/broken): the doodads carry the live state;
    // restore re-applies through the shared setDoorState path.
    let doorState: Record<string, 'open' | 'broken'> | undefined;
    for (const d of host.doodads) {
      if (!d.door || (!d.door.open && !d.door.broken)) continue;
      (doorState ??= {})[d.door.id] = d.door.broken ? 'broken' : 'open';
    }
    // PROCESSION rider: a lost escort stays lost for the memory's life; a live
    // one re-waits where it stands (dormant on return — no off-screen march).
    let procession: ZoneMemory['procession'];
    if (z.objective.kind === 'procession' && !host.objectiveDone) {
      const pr = host.procession;
      const cart = pr?.cartId != null ? host.actorById(pr.cartId) : null;
      if (host.objectiveLost || (pr && (!cart || cart.dead))) {
        // A lost escort stays lost for the memory's life — even across a
        // re-entry that never re-staged a cart (pr null, objectiveLost set).
        procession = { lost: true, ...(pr?.destIdx != null ? { destIdx: pr.destIdx } : {}) };
      } else if (pr && cart) {
        procession = {
          started: pr.started, x: cart.pos.x, y: cart.pos.y, life: cart.life,
          sx: pr.startPos.x, sy: pr.startPos.y,
          ...(pr.destIdx != null ? { destIdx: pr.destIdx } : {}),
        };
      }
    }
    return {
      seed: host.currentZoneSeed, enemies, savedAt: host.time, doorState,
      contents: captureZoneContents(host),
      ...(host.openedHollows.size ? { hollows: [...host.openedHollows] } : {}),
      ...(host.annexOpen.size ? { annexOpen: [...host.annexOpen] } : {}),
      // Objective-progress riders, per kind: the wave gauntlet's position, the
      // stones' banked charges, the escort's stand. Done-ness itself lives in
      // completedObjectives; a LOSS rides the procession rider.
      ...(z.objective.kind === 'waves' ? { wave: host.wave, waveActive: host.waveActive } : {}),
      ...(z.objective.kind === 'beacon' && host.spires.length
        ? { spireCharges: host.spires.map(s => s.charge) } : {}),
      ...(z.objective.kind === 'rifts' && host.rifts.length
        ? { riftCharges: host.rifts.map(s => s.charge) } : {}),
      ...(z.objective.kind === 'pyres' && host.pyres.length
        ? { pyreCharges: host.pyres.map(s => s.charge) } : {}),
      ...(z.objective.kind === 'unearth' && host.digs.length
        ? { digCharges: host.digs.map(s => s.charge) } : {}),
      // Occurrence sprung flags in mint order (objective-independent — the
      // fabric seats on tenant tables, not on the zone's ask).
      ...(host.occs.length
        ? { occSprung: host.occs.map(s => s.state === 'sprung' ? 1 : 0) } : {}),
      // Harvest spent flags in placement order (objective-independent, the
      // occSprung idiom — a shattered node stays shattered).
      ...(host.harvestNodes.length
        ? { harvestSpent: host.harvestNodes.map(n => n.spent ? 1 : 0) } : {}),
      ...(procession ? { procession } : {}),
      ...(z.objective.kind === 'offering' && host.offering
        ? { altarOffered: host.offering.offered } : {}),
      ...(z.objective.kind === 'clear' && host.cull
        ? { cullKills: host.cull.kills, cullNeed: host.cull.need } : {}),
      // Solved riddles stay solved for the memory's life (bootPuzzles
      // re-enters them through kind.solved — proof, not homework).
      ...(host.puzzles.some(r => r.done)
        ? { puzzlesDone: host.puzzles.filter(r => r.done).map(r => r.id) } : {}),
      // The regrowth cycle's authored clock (objective-independent; one
      // number — the ground's age survives the leaving).
      ...(host.charBorn !== undefined ? { charBorn: host.charBorn } : {}),
    };
  }
export function sceneCaptureLiveMemory(host:NativeSceneMemoryCaptureHost):void {
    const m = host.zoneMemorySnapshot();
    if (m) host.zoneMemory.set(host.zone.id, m);
  }
