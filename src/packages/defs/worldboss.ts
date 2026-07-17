// ---------------------------------------------------------------------------
// WORLD BOSSES — the PRIMEVAL sovereigns (a net-new package).
//
// Rare, named, colossal forces of nature — near-faction equivalents that
// belong to no war. Three distinct scenarios ride one overlay, all data:
//
//   VHORUN, the Sunder-Wyrm (roamer) — the world-serpent. It wakes and
//   slithers a chain of charted zones; every road its body crosses SEALS
//   behind a short grace window (be in the zone as it passes and you can dash
//   through the closing coils — or watch the pass shut in your face and
//   re-route). Its body lies drawn across the world map. When it settles, its
//   arena is minted at the rest and its HEAD — a multi-part composite — waits
//   there. Slay it and every strangled road falls open at once.
//
//   CRAGMAW, the Orogeny (apparition) — a walking mountain heralded on the
//   map with a countdown; it manifests, it waits, and unbeaten it DEPARTS.
//
//   ASHVEIN, the Furnace Below (apparition, UNDERWORLD-ONLY) — hell's own
//   sovereign; the surface never sees it (the per-dimension overlay instance).
//
//   VELKETH, the Enthroned Husk (lair) — minted onto the graph inside its own
//   lair zone, habitat-bound to the throne it erupts from: the boss IS the
//   arena's far wall (the Kitava/Belial beat).
//
// A new sovereign is ONE WorldBossDef row (+ its monster defs) — archetypes,
// timers, escorts, walls, arenas and rewards are all data. The 'primeval'
// faction is grafted at boot (contexts keep it out of ordinary generation).
// ---------------------------------------------------------------------------

import { registerDoodadRule } from '../../engine/levelgen';
import { registerKillHandler } from '../../engine/killHandlers';
import type { World } from '../../engine/world';
import { registerBulletinSource } from '../../world/bulletins';
import { registerEdgeBlockSource } from '../../world/edgeBlocks';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { WorldBossField, type WorldBossSurge } from '../overlays/worldboss';
import type { ContentPackage, FactionSpec } from '../types';

/** The whole World Boss mechanic as data — every number a knob. */
export const WORLDBOSS_SURGE: WorldBossSurge = {
  roamer: {
    igniteChance: 0.0005,          // per 0.5s step — a RARE cataclysm (~expected 15+ min)
    maxConcurrent: 1,              // one serpent abroad at a time (the crank can lift it)
    minCharted: 8,                 // it needs a web worth strangling
    pathLen: [4, 6],               // 3-5 roads sealed end to end
    slitherSecondsPerEdge: 50,     // a slow, visible crossing — chase it on the map
    sealSeconds: 32,               // the slip-past window before each pass shuts
    cooldown: [700, 1300],         // the world breathes after a slaying
    wall: { count: 7, dist: 74, radius: 24 }, // the coil plug around each sealed portal
  },
  apparition: {
    igniteChance: 0.0012,          // roughly every 7 minutes of play, gate willing
    maxConcurrent: 1,
    heraldSeconds: [75, 130],      // the countdown the map shows before it breaches
    staySeconds: [300, 420],       // 5-7 minutes of pressure, then it is GONE
    unchartedChance: 0.3,          // sometimes the pin glows in the dark — go find it
    cooldown: [260, 520],
  },
  lair: {
    igniteChance: 0.0008,
    maxConcurrent: 1,
    unchartedChance: 0.5,          // lairs favour ground you haven't trodden
    cooldown: [900, 1500],
  },
  firstDelay: { roamer: 420, apparition: 180, lair: 240 }, // the world never erupts at minute zero
  announce: {
    wake: 'The ground splits near {zone} — {name} carves across the land!',
    settle: '{name} coils to rest — its head looms at {zone}.',
    roamerSlain: '{name} is slain! Every road it strangled falls open.',
    herald: 'An ill omen over {zone} — {name} will breach in {mins}m.',
    manifest: '{name} has risen at {zone}!',
    depart: '{name} sinks away unbeaten. The world exhales.',
    departWounded: '{name} slips away, wounded and unbowed.',
    apparitionSlain: '{name} is felled at {zone}!',
    lairSlain: 'The throne stands empty — {name} is unmade.',
  },
  defs: [
    {
      id: 'vhorun', name: 'Vhorun, the Sunder-Wyrm', archetype: 'roamer',
      monster: 'primeval_wyrm_head', minLevel: 10, levelBonus: 3,
      glyph: '🐍', color: '#7fb069',
      escort: { table: [{ id: 'primeval_spawn', weight: 1 }], count: [3, 5] },
      roam: { passingMonster: 'primeval_wyrm_passing', wallKind: 'wyrm_coil', arenaName: 'The Sunder-Coil' },
      reward: { xp: 900, gems: 5 },
    },
    {
      id: 'cragmaw', name: 'Cragmaw, the Orogeny', archetype: 'apparition',
      monster: 'primeval_cragmaw', minLevel: 6, levelBonus: 2,
      glyph: '⛰', color: '#b0916a',
      escort: { table: [{ id: 'primeval_spawn', weight: 1 }], count: [2, 4] },
      reward: { xp: 700, gems: 4 },
    },
    {
      id: 'ashvein', name: 'Ashvein, the Furnace Below', archetype: 'apparition',
      dimension: 'underworld',
      monster: 'primeval_ashvein', minLevel: 1, levelBonus: 2,
      glyph: '☄', color: '#e06a2a',
      escort: { table: [{ id: 'primeval_cinder', weight: 1 }], count: [3, 5] },
      reward: { xp: 760, gems: 4 },
    },
    {
      // THE IRON BELL — the walking mausoleum of the karst country. Almost
      // passive: glacial pace, no chase — its MOVEMENT is the enemy (every
      // stride a telegraphed footfall cast at its own next foot placement),
      // and the bell it carries RINGS its banked afflictions off on the
      // beat. Defense texture: mountainous armor + hitCap (bursts flatten,
      // read 'capped') while DoTs do full work — ailment builds headline
      // ON PURPOSE; crack the carried bell and the toll falls silent.
      id: 'iron_bell', name: 'Dolmourn, the Iron Bell', archetype: 'apparition',
      biomes: ['karst'],
      monster: 'primeval_ironbell', minLevel: 7, levelBonus: 2,
      glyph: '🔔', color: '#8d8672',
      escort: { table: [{ id: 'bell_keeper', weight: 2 }, { id: 'toll_wretch', weight: 3 }], count: [3, 5] },
      reward: { xp: 850, gems: 5 },
      pitch: 'the steps ARE the battle — no single blow cracks it; rot, burn and bleed do',
    },
    {
      id: 'velketh', name: 'Velketh, the Enthroned Husk', archetype: 'lair',
      monster: 'primeval_velketh', minLevel: 8, levelBonus: 3,
      glyph: '👁', color: '#9a6ad2',
      escort: { table: [{ id: 'primeval_spawn', weight: 1 }], count: [2, 3] },
      lair: { structureKind: 'husk_throne', zoneName: 'The Husk Throne' },
      reward: { xp: 800, gems: 5 },
    },
  ],
};

/** THE PRIMEVAL — forces of nature wearing one banner. contexts:['worldboss']
 *  keeps every body out of ordinary generation; they exist ONLY as sovereigns
 *  and their broods. No warlord, no relations — nature wars with no one. */
const PRIMEVAL_FACTION: FactionSpec = {
  id: 'primeval',
  name: 'the Primeval',
  color: '#c8a03c',
  traits: { roaming: 0.2, aggression: 0.9, warlordHome: 'capital', contexts: ['worldboss'] },
  roster: [
    { id: 'primeval_spawn', weight: 5 },
    { id: 'primeval_cinder', weight: 3 },
    { id: 'bell_keeper', weight: 2 },
    { id: 'toll_wretch', weight: 3 },
    { id: 'primeval_wyrm_head', weight: 1 },
    { id: 'primeval_cragmaw', weight: 1 },
    { id: 'primeval_ashvein', weight: 1 },
    { id: 'primeval_velketh', weight: 1 },
    { id: 'primeval_ironbell', weight: 1 },
  ],
};

export const WORLDBOSS: ContentPackage = {
  id: 'worldboss',
  label: 'World Bosses',
  blurb: 'The Primeval — rare, named forces of nature that belong to no faction and no war. A world-serpent slithers across the map and strangles the roads it crosses until its head is struck off; heralded colossi breach on a countdown and depart unbeaten; an enthroned horror waits in a lair minted onto the world, fused to the throne it erupts from. Watch the map: the world will warn you, once.',
  color: '#c8a03c',
  cost: 150,
  // DISCOVERED in play (runs at defaults); the Vault unlock gates TUNING,
  // surfacing once any sovereign has shown itself to the player.
  unlock: {
    id: 'worldboss_unlock',
    label: 'Witness a Primeval sovereign (they stir on their own from level ~5)',
    test: (ctx) => (ctx.ledger.worldboss_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'worldboss_slayer', label: 'Sovereign-Slayer', requirement: 'Slay a world boss', cost: 180,
      test: (ctx) => (ctx.ledger.worldboss_slain ?? 0) >= 1,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'worldboss_scourge', label: 'Scourge of the Primeval', requirement: 'Slay 3 world bosses', cost: 260,
      test: (ctx) => (ctx.ledger.worldboss_slain ?? 0) >= 3,
      grants: { weight: { min: 0, max: 100 }, startLevel: { min: 0, max: 101 } } },
  ],
  modifiers: [
    { id: 'worldboss_start', kind: 'startLevel', label: 'Sovereigns stir at level', min: 5, max: 5, step: 1, defaultValue: 5 },
    { id: 'worldboss_weight', kind: 'weight', label: 'World boss frequency', min: 15, max: 55, step: 5, defaultValue: 30 },
  ],
  defaultWeight: 30,
  defaultStartLevel: 5,
  defaultEnabled: true,
  world: {
    overlay: (ctx) => new WorldBossField(ctx, WORLDBOSS_SURGE),
    // One instance per world-state: the surface sovereigns above + Ashvein,
    // hell's own, who exists nowhere else (per-def `dimension` splits the
    // roster between the instances).
    dimensions: ['surface', 'underworld'],
  },
  factions: [PRIMEVAL_FACTION],
  validate: (look) => {
    const out: string[] = [];
    for (const d of WORLDBOSS_SURGE.defs) {
      if (!look.monster(d.monster)) out.push(`world boss '${d.id}' monster '${d.monster}' unknown`);
      if (d.roam && !look.monster(d.roam.passingMonster)) {
        out.push(`world boss '${d.id}' passing body '${d.roam.passingMonster}' unknown`);
      }
      for (const e of d.escort?.table ?? []) {
        if (!look.monster(e.id)) out.push(`world boss '${d.id}' escort '${e.id}' unknown`);
      }
      for (const b of d.biomes ?? []) {
        if (!look.biome(b)) out.push(`world boss '${d.id}' biome '${b}' unknown`);
      }
    }
    return out;
  },
};

// --- the package's doodad kinds (runtime rules — zero levelgen edits) ---------
//
// The wyrm's coil: a wall of living scale. Solid to feet, shots AND sight —
// the pass is truly shut (the LOS raycast reads these rules). 'inert' keeps it
// out of gen-time placement checks (it exists only where the engine lays it).
registerDoodadRule('wyrm_coil', { overlap: 'inert', blocksMove: true, blocksShot: true, blocksSight: true });
// Velketh's throne: a great walkable dais the boss is habitat-bound to (the
// lake-horror pattern — ground, never a blocker; the boss stands ON it).
registerDoodadRule('husk_throne', { overlap: 'ground' });

// --- the road gate (the edge-block fabric) ------------------------------------
//
// One O(paths) lookup against every live instance: a sealed road answers with
// the serpent's name — the travel gate refuses, the exit hint explains.
registerEdgeBlockSource((world: World, fromZoneId: string, toZoneId: string) => {
  for (const f of world.sim.worldBossFieldsAll()) {
    const hit = f.edgeBlocked(fromZoneId, toZoneId);
    if (hit) return { reason: `${hit.def.name} coils across this pass`, color: hit.def.color, source: 'worldboss' };
  }
  return null;
});

// --- map markers (registered on import — zero panels.ts edits) -----------------
registerMarkerSource((world: World): MapMarker[] => {
  const out: MapMarker[] = [];
  for (const f of world.sim.worldBossFieldsAll()) {
    const dim = f.dimension ?? 'surface';
    for (const s of f.peekSerpents()) {
      if (s.head) {
        out.push({
          id: `wb-serpent-${s.id}`, coord: { x: s.head.x, y: s.head.y },
          glyph: s.def.glyph, fill: '#1a140c', stroke: s.def.color, text: '#f0e2c0', r: 10,
          title: s.phase === 'settled'
            ? `${s.def.name} — settled; its head waits at the coil`
            : `${s.def.name} — slithering; the roads behind it are sealed`,
          fog: 'always', z: 22, dimension: dim,
        });
      }
      if (s.arenaZoneId) {
        out.push({
          id: `wb-arena-${s.id}`, zoneId: s.arenaZoneId,
          glyph: '☠', fill: '#1a140c', stroke: s.def.color, text: '#f0e2c0', r: 9,
          title: `${s.def.name} — the head. Strike it off and the roads open.`,
          fog: 'always', z: 21,
        });
      }
    }
    for (const a of f.peekApparitions()) {
      const secs = Math.max(0, Math.ceil(a.timeLeft));
      const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
      out.push({
        id: `wb-app-${a.id}`, zoneId: a.zoneId,
        glyph: a.def.glyph, fill: '#1a140c', stroke: a.def.color, text: '#f0e2c0', r: 10,
        title: a.state === 'herald'
          ? `${a.def.name} breaches in ${clock}`
          : `${a.def.name} — HERE, and gone in ${clock}`,
        fog: 'always', z: 22,
      });
    }
    for (const l of f.peekLairs()) {
      if (!l.lairZoneId) continue;
      out.push({
        id: `wb-lair-${l.id}`, zoneId: l.lairZoneId,
        glyph: l.def.glyph, fill: '#1a140c', stroke: l.def.color, text: '#f0e2c0', r: 9,
        title: `${l.def.name} — enthroned within`,
        fog: 'charted', z: 20,
      });
    }
  }
  return out;
});

// --- zone-info rows (the side box) ---------------------------------------------
registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const out: ZoneInfoEntry[] = [];
  for (const f of world.sim.worldBossFieldsAll()) {
    const fight = f.fightAt(zoneId);
    if (fight) {
      out.push({
        kind: 'event', icon: fight.def.glyph, color: fight.def.color,
        label: fight.def.name,
        // A def's authored pitch is THE honest ask (it must never disagree
        // with the minted fight) — generic archetype copy is the fallback.
        detail: fight.def.pitch ?? (fight.archetype === 'apparition'
          ? 'a sovereign stands here — and will not wait forever'
          : fight.archetype === 'lair' ? 'something colossal is fused to this place'
            : 'the head of the world-serpent rests here'),
        z: 24,
      });
      continue;
    }
    const pass = f.passingIn(zoneId);
    if (pass) {
      out.push({
        kind: 'event', icon: pass.def.glyph, color: pass.def.color,
        label: `${pass.def.name} passes through`,
        detail: 'slip past before the coils seal the far road',
        z: 24,
      });
      continue;
    }
    const walls = f.wallsFor(zoneId);
    if (walls.length) {
      const w = walls[0];
      out.push({
        kind: 'condition', icon: '🐍', color: w.color,
        label: walls.length > 1 ? `${walls.length} roads coiled shut` : 'a road coiled shut',
        detail: 'slay the serpent’s head to open the passes',
        z: 18,
      });
    }
  }
  return out;
});

// --- world notices (drained through the bulletins pump) -------------------------
registerBulletinSource((world: World) => {
  const out = [];
  for (const f of world.sim.worldBossFieldsAll()) out.push(...f.drainBulletins());
  return out;
});

// --- the kill bounty --------------------------------------------------------------
//
// One row for every sovereign: the actor carries its INSTANCE id on eventKey
// (the vendetta pattern), so the fall resolves back to whichever archetype and
// dimension it belongs to — roads open, timers clear, the ledger learns.
registerKillHandler({
  id: 'worldboss_slain',
  tag: 'worldboss_boss',
  run: (ctx) => {
    const key = ctx.actor.eventKey;
    if (!key) return;
    for (const f of ctx.sim.worldBossFieldsAll()) {
      const def = f.onBossSlain(key);
      if (!def) continue;
      ctx.bumpLedger('worldboss_slain');
      // The world remembers WHICH sovereign fell, not just that one did —
      // per-def keys cost nothing and future content gates on them freely.
      ctx.bumpLedger(`worldboss_slain_${def.id}`);
      if (ctx.credit) {
        ctx.grantXp(def.reward.xp);
        for (let i = 0; i < def.reward.gems; i++) ctx.dropGemAt(ctx.actor.pos);
      }
      ctx.flash(ctx.actor.pos, 220, def.color, 1.0);
      ctx.text({ x: ctx.actor.pos.x, y: ctx.actor.pos.y - 64 }, `${def.name} falls!`, '#ffd700', 20);
      return;
    }
  },
});
