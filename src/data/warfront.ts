// ---------------------------------------------------------------------------
// THE WARFRONT KIT — content for the Warfront country: the Underworld's
// ACTIVE front. Where the wasteland is the WOUND the war leaves, this is the
// war still happening — Bhorog the Siegewright's ground: standing Bale
// Trebuchets raining shellfire zone-wide (engine/bombard.ts — THE
// BOMBARDMENT FABRIC), ground pocked with craters old and fresh, gun pits
// and munition dumps dressing the advance, grind-columns marching the ways,
// and the worst-hammered ground torn into small hell-rift scars.
//
// Everything here is registry rows on existing fabrics (the grove.ts /
// garden.ts doctrine): doodad rules + stamps, formations, set-piece clusters
// and compositions, one biome-flavored zone event. No engine edits. Painters
// live in render/vis/paintersWarfront.ts; visuals in data/doodadVisuals.ts;
// the faces in data/tilesets.ts; the siege-works kin in data/monsters.ts;
// the den door in data/sidezones.ts; the barrage itself is MonsterDef.bombard
// on the trebuchet — this file only plants the furniture around it.
// ---------------------------------------------------------------------------

import {
  registerCluster, registerComposition, registerDoodadRule, registerFormation,
  registerStamp, stampSingle,
} from '../engine/levelgen';
import { registerZoneEvent } from '../engine/events';
import { FACTIONS } from './monsters';
import { vec } from '../core/math';

// --- THE SIEGE FURNITURE -----------------------------------------------------
// The shell pock: a blast crater at walking scale — GROUND, not obstacle
// (you fight across the pocked field; the craters are texture and story,
// never a pathing maze). Strewn at generation for the old war; the SAME
// kind is planted live by hellshot_volley's impact dress for the new one.
registerDoodadRule('shell_crater', {
  overlap: 'ground', spacing: 34,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp', 'ice'],
});
registerStamp('shell_crater', stampSingle('shell_crater', [12, 22]));

// The gabion: a siege-basket rampart drum. Waist-high — blocks a body,
// never a shot (cover you trade across, not a wall). Wicker burns.
registerDoodadRule('gabion', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 20,
  mutable: true, fuel: 'kindling',
  forbidOn: ['water', 'lava', 'chasm'],
});
registerStamp('gabion', stampSingle('gabion', [10, 14]));

// The shot pile: hellstone ammunition pyramided beside the guns.
registerDoodadRule('siege_shot', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 26,
  forbidOn: ['water', 'lava', 'chasm'],
});
registerStamp('siege_shot', stampSingle('siege_shot', [11, 16]));

// The siege wreck: an engine that lost its argument — a real hulk (blocks
// shot: the field's hard cover), big enough to anchor a fight around.
registerDoodadRule('siege_wreck', {
  overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 120,
  sightShadow: true,
  forbidOn: ['water', 'lava', 'chasm'],
});
registerStamp('siege_wreck', stampSingle('siege_wreck', [26, 36]));

// The war standard: Bhorog's mark planted in taken ground — a thin pole
// (blocks a body, never a shot), rows of them pacing the ways.
registerDoodadRule('war_standard', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 60,
  mutable: true, fuel: 'kindling',
  forbidOn: ['water', 'lava', 'chasm'],
});
registerStamp('war_standard', stampSingle('war_standard', [9, 12]));

// The powder magazine: the armored way DOWN into the Ordnance Yard (the
// hollow_bole law: trigger, not terrain — data/sidezones.ts registers the
// door; the yard and its Master wait below).
registerDoodadRule('powder_magazine', { overlap: 'trigger', spacing: 300 });
registerStamp('powder_magazine', stampSingle('powder_magazine', [24, 30]));

// The powder keg carries its rule + visual from the powder_cache kit
// (data/formations.ts — the brittle 'hit' bomb) but was formation-placed
// ONLY; the Warfront strews loose ordnance in plain layout rows, so the
// kind finally gets its stamp (genqa's registry net demanded it by name).
registerStamp('powder_keg', stampSingle('powder_keg', [9, 12]));

// --- FORMATIONS --------------------------------------------------------------
// A trench line: gabions shoulder-to-shoulder along an arc, shot and stakes
// where the crews worked — the dug-in front, drawn in furniture.
registerFormation({
  id: 'trench_line', arrange: 'arc', span: [140, 220], step: 26,
  pieces: [
    { kind: 'gabion', radius: [10, 14], jitter: 8 },
    { kind: 'siege_shot', radius: [10, 13], every: 4, jitter: 14 },
    { kind: 'impaler_stake', radius: [9, 12], every: 3, jitter: 12 },
  ],
});
// A standard row: the marked way — banners pacing a line with old fire
// between them (columns muster along these; follow one to the fight).
registerFormation({
  id: 'standard_row', arrange: 'line', span: [160, 260], step: 62,
  pieces: [
    { kind: 'war_standard', radius: [9, 12], jitter: 8 },
    { kind: 'shell_crater', radius: [12, 18], every: 2, jitter: 26 },
  ],
});

// --- SET-PIECE CLUSTERS ------------------------------------------------------
// The gun pit: a battery emplacement — gabion ring, ready shot, powder, the
// ground inside churned to pock. POI: the 'spawners' objective seats its
// Bale Trebuchets at points of interest, so the guns often stand IN their
// own authored pits (loose coupling, never a hard bind).
registerCluster({
  id: 'gun_pit',
  anchor: { radius: 34 },
  pieces: [
    { kind: 'shell_crater', count: [1, 2], radius: [12, 18], ring: [0, 30] },
    { kind: 'gabion', count: [5, 7], radius: [10, 14], ring: [58, 84] },
    { kind: 'siege_shot', count: [1, 2], radius: [11, 15], ring: [50, 78] },
    { kind: 'powder_keg', count: [0, 2], radius: [9, 12], ring: [56, 82] },
  ],
  poi: true,
});
// The munition dump: the army's larder — kegs and shot behind a gabion
// arc. Brittle kegs make it terrain-as-wager (the powder_cache law: cover
// that shoots back if you graze it).
registerCluster({
  id: 'munition_dump',
  anchor: { radius: 30 },
  pieces: [
    { kind: 'powder_keg', count: [3, 5], radius: [9, 12], ring: [0, 34] },
    { kind: 'siege_shot', count: [2, 3], radius: [11, 16], ring: [26, 52] },
    { kind: 'gabion', count: [3, 5], radius: [10, 14], ring: [60, 86] },
  ],
  poi: true,
});
// The riftscar: where the bombardment hit something the ground could not
// hold — a standing rent ringed in glass and ember seams. The pocket's
// HEART is the breach_scar spawner (the tileset's packs seat it here via
// POI), so the worst ground fights back until sealed.
registerCluster({
  id: 'riftscar',
  anchor: { radius: 30 },
  pieces: [
    { kind: 'hate_rent', count: [1, 1], radius: [22, 30], ring: [0, 8], centerpiece: true },
    { kind: 'hate_glass', count: [3, 5], radius: [9, 14], ring: [56, 96] },
    { kind: 'ember_fissure', count: [2, 4], radius: [12, 18], ring: [48, 110] },
    { kind: 'shell_crater', count: [1, 3], radius: [12, 18], ring: [70, 120] },
  ],
  poi: true,
});

// --- COMPOSITIONS ------------------------------------------------------------
// THE SIEGE WORKS: the battery line as one authored place — a gun pit (or
// two), its trench, the marked way in. Where the 'spawners' objective rolls,
// the engines stand here and the zone IS the assault on this ground.
registerComposition({
  id: 'siege_works',
  sites: [{ id: 'line', radius: [150, 200], hard: true }],
  pre: [{ kind: 'clearing', at: 'line', count: [1, 1], radius: [70, 95] }],
  post: [
    { kind: 'cluster', cluster: 'gun_pit', at: 'line', count: [1, 2] },
    { kind: 'formation', formation: 'trench_line', at: 'line', count: [1, 1] },
    { kind: 'formation', formation: 'standard_row', count: [0, 1] },
  ],
});
// THE RIFTSCAR POCKET: the encroaching hell-rift locale — a small torn
// pocket in its own scorched clearing, pocks radiating out.
registerComposition({
  id: 'riftscar_pocket',
  sites: [{ id: 'scar', radius: [110, 150], hard: true }],
  pre: [{ kind: 'clearing', at: 'scar', count: [1, 1], radius: [48, 66] }],
  post: [
    { kind: 'cluster', cluster: 'riftscar', at: 'scar', count: [1, 1] },
    { kind: 'shell_crater', count: [2, 4], where: { field: 'noise', max: 0.45, params: { scale: 360, seed: 47 } } },
  ],
});

// --- THE WAR COLUMN (biome-flavored zone event) ------------------------------
// A grind-column on the march: a bannerman and his troop walking the ways
// (the PATROL grammar — Actor.patrolRoute — under Bhorog's standard). Fires
// on the Warfront's own biome, never gated on a faction OWNER: the surface
// territorial overlay does not reach hell, but the front is always marching.
const COLUMN_CFG = {
  chanceNight: 0.55, chanceDay: 0.45,
  followers: 5, maxWaypoints: 6, leadJitter: 26, followJitter: 55,
} as const;

registerZoneEvent({
  id: 'war_column',
  reward: { rep: 8, xpMul: 0.8, gems: 0 },
  choose: (ctx, roll) => {
    if (ctx.biome === 'warfront' && ctx.hasRoute
      && roll < (ctx.isNight ? COLUMN_CFG.chanceNight : COLUMN_CFG.chanceDay)) {
      return { kind: 'war_column', primary: 'demon', secondary: null };
    }
    return null;
  },
  spawn: (w, run, spots) => {
    const roster = FACTIONS[run.primary];
    const route = [...spots.pois, ...spots.camps].slice(0, COLUMN_CFG.maxWaypoints);
    if (!roster || route.length < 2) { run.done = true; return; }
    const level = Math.max(1, w.zone.level);
    // The bannerman leads; the column heels to him (the patrol grammar).
    const lead = w.spawnEventActor([{ id: 'grind_bannerman', weight: 1 }], level, 'enemy', run.primary, 'war_column');
    lead.pos = w.clampNear(route[0], COLUMN_CFG.leadJitter);
    lead.patrolRoute = route;
    lead.patrolIdx = 0;
    for (let i = 0; i < COLUMN_CFG.followers; i++) {
      const f = w.spawnEventActor(roster.table, level, 'enemy', run.primary, 'war_column');
      f.pos = w.clampNear(route[0], COLUMN_CFG.followJitter);
      f.patrolFollow = lead.id;
    }
    w.text(vec(w.player.pos.x, w.player.pos.y - 70), 'a grind-column on the march', '#e8823a', 14);
  },
  tick: (w, run) => {
    // Column troops are ordinary bounties; breaking it ends the march quietly.
    if (!w.anyAliveWithTag('war_column', run.primary)) run.done = true;
  },
});
