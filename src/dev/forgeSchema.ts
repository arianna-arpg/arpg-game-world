// ---------------------------------------------------------------------------
// FORGE FIELD SCHEMA — the Entity Forge's inspector as DATA. Each row names
// one MonsterDef field (dot-path), its editor kind, and where its options
// come from (thunks over the LIVE registries, read at render — the pickers
// grow as content grows, zero forge edits). A new def field = one row here;
// a field with no row is still reachable through the ADVANCED_KEYS JSON pane
// and the whole-def JSON view, so the forge can never fall behind the schema.
//
// The four RICH editors (look composer, base-stat map, kit & grants, brain)
// are bespoke panes in entityForge.ts — this file carries the scalar tail.
// ---------------------------------------------------------------------------

import type { ActorAdorn, ActorShape } from '../engine/actor';
import type { TemperId } from '../data/monsters';
import { FACTIONS } from '../data/monsters';
import { MATERIALS } from '../render/vis/materials';
import { LOOT_TABLES } from '../data/loottables';
import { PRESENCE_BANDS } from '../engine/presence';

export type ForgeFieldKind =
  | 'text'    // free string (datalist via options)
  | 'num'     // float
  | 'int'     // integer
  | 'color'   // '#rrggbb'
  | 'bool3'   // optional boolean: — / yes / no (an explicit 'no' is data)
  | 'select'  // one of options() or unset
  | 'idlist'  // comma-separated string array (datalist via options)
  | 'range2'  // [min, max] tuple
  | 'json';   // schema-free JSON textarea (validated on commit)

export interface ForgeField {
  /** Dot-path into the def ('radius', 'plies.count', 'aggro.fury'). Setting
   *  a nested leaf creates the parents; unsetting prunes emptied parents. */
  path: string;
  label: string;
  kind: ForgeFieldKind;
  section: string;
  /** Required fields can never be unset (id/name/color/shape/radius/base/
   *  skills/xp — the MonsterDef contract). */
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: () => string[];
  help?: string;
}

export const FORGE_SECTIONS: { id: string; label: string }[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'body', label: 'Body & Look' },
  { id: 'stats', label: 'Stats & Defenses' },
  { id: 'kit', label: 'Kit & Grants' },
  { id: 'brain', label: 'Brain & Behavior' },
  { id: 'spawn', label: 'Spawn & Meta' },
  { id: 'advanced', label: 'Advanced' },
];

// `satisfies` pins every entry to the real union — the list can lag a new
// shape (harmless) but can never carry an invalid one.
export const SHAPE_OPTIONS = [
  'circle', 'diamond', 'triangle', 'square', 'pentagon', 'hexagon', 'octagon',
  'star', 'cross', 'trapezoid', 'rhombus', 'oval', 'kite', 'rectangle', 'ribcage',
] as const satisfies readonly ActorShape[];

export const ADORN_OPTIONS = [
  'ears', 'horns', 'spikes', 'wings', 'tentacles',
] as const satisfies readonly ActorAdorn[];

export const TEMPER_OPTIONS = [
  'skittish', 'wary', 'territorial',
] as const satisfies readonly TemperId[];

/** The scalar tail — everything here renders straight off the row. */
export const FORGE_FIELDS: ForgeField[] = [
  // --- identity ---
  { path: 'name', label: 'Name', kind: 'text', section: 'identity', required: true },
  { path: 'color', label: 'Color', kind: 'color', section: 'identity', required: true, help: 'One def color — the whole palette derives from it (+ material)' },
  { path: 'shape', label: 'Shape', kind: 'select', section: 'identity', required: true, options: () => SHAPE_OPTIONS.slice(), help: 'Legacy silhouette; a look overrides the drawn body but the shape still seeds fallbacks' },
  { path: 'radius', label: 'Radius', kind: 'num', section: 'identity', required: true, min: 4, max: 160, step: 1, help: 'Body radius (px) — drives hit size and the weight default' },
  { path: 'material', label: 'Material', kind: 'select', section: 'identity', options: () => Object.keys(MATERIALS), help: 'Surface material: shading ramp + gameplay nature (remains / breathes / density)' },
  { path: 'xp', label: 'XP', kind: 'int', section: 'identity', required: true, min: 0, max: 100000, help: 'Base xp reward, level-scaled at spawn' },
  { path: 'faction', label: 'Faction', kind: 'select', section: 'identity', options: () => Object.keys(FACTIONS), help: 'Allegiance for stances/wars; unset = factionless' },
  { path: 'tags', label: 'Taxonomy tags', kind: 'idlist', section: 'identity', options: () => ['beast', 'undead', 'demon', 'construct', 'elemental', 'insect', 'plant', 'aquatic', 'humanoid', 'spirit', 'companion'], help: 'Read by Tame, sympathies, event filters' },
  { path: 'loot', label: 'Loot table', kind: 'select', section: 'identity', options: () => Object.keys(LOOT_TABLES), help: 'LOOT_TABLES override; unset = the rarity-band default' },

  // --- body & look (beside the composer) ---
  { path: 'adorn', label: 'Adorn (legacy)', kind: 'select', section: 'body', options: () => ADORN_OPTIONS.slice(), help: 'Pre-look accent; suppressed entirely while a look is worn' },
  { path: 'heft', label: 'Heft', kind: 'num', section: 'body', min: 0.1, max: 40, step: 0.1, help: 'Mass multiplier over radius × material density (the mass fabric)' },
  { path: 'turnSpeed', label: 'Turn speed', kind: 'num', section: 'body', min: 0.5, max: 40, step: 0.5, help: 'Facing swing rad/s — low reads lumbering' },
  { path: 'scaleVariance', label: 'Scale variance', kind: 'range2', section: 'body', min: 0.3, max: 3, step: 0.05, help: 'Per-spawn body-scale roll [min,max] (herd variety)' },
  { path: 'scaleStats', label: 'Scale stats with size', kind: 'bool3', section: 'body', help: 'Couple life/damage to the rolled scale' },
  { path: 'portrait', label: 'Portrait tune', kind: 'json', section: 'body', help: '{ zoom?, dx?, dy?, facing?, t?, trail? } — bestiary/site framing dials' },

  // --- stats & defenses ---
  { path: 'detection', label: 'Detection mul', kind: 'num', section: 'stats', min: 0.1, max: 3, step: 0.05, help: '0.55 shambler … 1.6 keen — scales sight/alert ranges' },
  { path: 'grabbable', label: 'Grabbable', kind: 'json', section: 'stats', help: 'false = ungrabbable, or a number = struggle-speed tier (the grab fabric policy word)' },
  { path: 'plies.count', label: 'Plies', kind: 'int', section: 'stats', min: 1, max: 40, help: 'Hit-counted durability: eats N landed hits magnitude-blind (unset = no plies)' },
  { path: 'plies.perLevel', label: 'Plies /level', kind: 'num', section: 'stats', min: 0, max: 4, step: 0.1 },
  { path: 'plies.floor', label: 'Ply thud floor', kind: 'num', section: 'stats', min: 0, max: 1000, help: 'Hits below this THUD — tear nothing, wound nothing' },
  { path: 'plies.spentStatus', label: 'Ply spent status', kind: 'text', section: 'stats', help: 'Status stamped when the last ply tears (the worn-open bracket)' },
  { path: 'wellDrain', label: 'Lightwell drain', kind: 'num', section: 'stats', min: 0, max: 30, step: 0.1, help: 'Power/sec drunk from pooled light (gloaming kinds)' },
  { path: 'wardPriority', label: 'Ward priority', kind: 'num', section: 'stats', min: 0, max: 10, step: 0.5, help: 'How worth guarding (protector brains)' },
  { path: 'mods', label: 'Innate mods', kind: 'json', section: 'stats', help: "Modifier[] — rows like { stat: 'fireRes', kind: 'flat', value: 0.3 }" },
  { path: 'sympathy', label: 'Sympathy links', kind: 'idlist', section: 'stats', help: 'Born-with sympathy link ids (gains echo to kin)' },

  // --- kit (beside the skills/grants editors) ---
  { path: 'gemBias', label: 'Gem drop bias', kind: 'idlist', section: 'kit', options: () => ['attack', 'spell', 'melee', 'projectile', 'aoe', 'duration', 'movement', 'minion', 'aura', 'channel'], help: 'Skill-tag bias for gem drops' },
  { path: 'drops', label: 'Guaranteed gem drops', kind: 'int', section: 'kit', min: 0, max: 12 },
  { path: 'orbDrops', label: 'Orb drop chance', kind: 'num', section: 'kit', min: 0, max: 1, step: 0.05 },

  // --- brain (beside the brain editor) ---
  { path: 'temper', label: 'Temper', kind: 'select', section: 'brain', options: () => TEMPER_OPTIONS.slice(), help: 'Dispersal temper: skittish / wary / territorial' },
  { path: 'aggro.fixation', label: 'Aggro fixation', kind: 'num', section: 'brain', min: 0, max: 3, step: 0.1 },
  { path: 'aggro.fury', label: 'Aggro fury', kind: 'num', section: 'brain', min: 0, max: 3, step: 0.1 },
  { path: 'aggro.waver', label: 'Aggro waver', kind: 'num', section: 'brain', min: 0, max: 3, step: 0.1 },

  // --- spawn & meta ---
  { path: 'boss', label: 'Boss', kind: 'bool3', section: 'spawn', help: 'Wave/marquee boss: default poise pool, boss bar, boss loot' },
  { path: 'bossBar', label: 'Boss bar', kind: 'bool3', section: 'spawn', help: 'Force/deny the top-center bar independent of the boss flag' },
  { path: 'packSize', label: 'Pack size', kind: 'range2', section: 'spawn', min: 1, max: 30, step: 1, help: 'Natural group size [min,max] — overrides the zone band' },
  { path: 'presence', label: 'Presence band', kind: 'select', section: 'spawn', options: () => Object.keys(PRESENCE_BANDS), help: 'Leveled-list envelope (which levels this kind surfaces at); custom envelopes via Advanced' },
  { path: 'spawner', label: 'Spawner object', kind: 'bool3', section: 'spawn' },
  { path: 'passive', label: 'Passive scenery', kind: 'bool3', section: 'spawn', help: 'Health bar, never counts, never acts' },
  { path: 'immortal', label: 'Immortal dummy', kind: 'bool3', section: 'spawn', help: 'Hits show, life snaps back, no death/loot' },
  { path: 'invulnerable', label: 'Invulnerable', kind: 'bool3', section: 'spawn' },
  { path: 'untargetable', label: 'Untargetable', kind: 'bool3', section: 'spawn' },
  { path: 'flier', label: 'True flight', kind: 'bool3', section: 'spawn', help: 'Noclips walls/water/chasm' },
  { path: 'levitates', label: 'Levitates', kind: 'bool3', section: 'spawn', help: 'Floats over void/chasm only' },
  { path: 'aims', label: 'Aims (facing = intent)', kind: 'bool3', section: 'spawn', help: "'no' = facing is noise (barrels, blooms)" },
  { path: 'remains', label: 'Leaves remains', kind: 'bool3', section: 'spawn', help: 'Override the material nature (raisable corpse?)' },
  { path: 'breathes', label: 'Breathes (tires)', kind: 'bool3', section: 'spawn', help: 'Override the material nature (kite budget?)' },
  { path: 'noObjective', label: 'Never counts (objectives)', kind: 'bool3', section: 'spawn' },
  { path: 'noBestiary', label: 'Hide from bestiary', kind: 'bool3', section: 'spawn' },
  { path: 'noNemesis', label: 'No nemesis memory', kind: 'bool3', section: 'spawn' },
  { path: 'noRecall', label: 'No minion leash-recall', kind: 'bool3', section: 'spawn' },
  { path: 'bestiaryKills', label: 'Bestiary mastery kills', kind: 'int', section: 'spawn', min: 1, max: 500 },
  { path: 'npcRole', label: 'NPC role', kind: 'text', section: 'spawn', help: 'vendor / innkeep / questgiver …' },
];

/** The long tail — every remaining authored seam, one JSON pane each. The
 *  help line is the whole doc surface; the real schema lives on the types. */
export const ADVANCED_KEYS: { key: string; help: string }[] = [
  { key: 'worm', help: 'Segmented body: { length, spacing?, taper?, hittable?, looks?, wounds?, drive? }' },
  { key: 'parts', help: 'COMPOSITE hitboxes: [{ monster, dx, dy, rot?, lifeFrac?, breakDamage?, breakMods?, breakDisables? }] — offsets in root radii, +x ahead' },
  { key: 'cling', help: 'Latch rider: { shakeSec?, pad?, rideStatus?, victimMinRatio? }' },
  { key: 'tune', help: 'Attunement: { tones?, base?, roll?, locked? } — re-tunes to the landed blow' },
  { key: 'deathBurst', help: "{ mode: 'implode'|'orb', damageFrac, radius?, damageType?, orb knobs…, color? }" },
  { key: 'explodeOnDeath', help: 'Legacy bomber: death blast = frac × maxLife' },
  { key: 'tether', help: 'Pack tether band: { dps, damageType?, width?, radius?, period?, duty?, color? }' },
  { key: 'shellGuard', help: "Directional absorb: { side: 'rear'|'front'|'all', max, arcDeg?, regenDelay?, regenRate?, breathe? }" },
  { key: 'habitat', help: 'Terrain-bound: { kind, minRadius?, grace? } — pair with noObjective (soft-lock law)' },
  { key: 'refuge', help: 'Bolt-hole: { kind, seek?, text? } — flees to a doodad and vanishes' },
  { key: 'mountSlot', help: 'Rideable: { kinds, seats?: [{dx,dy,lift}], onRiderDeath?, crew? }' },
  { key: 'mount', help: 'Arrives mounted: { on: steedDefId | [ids], chance? }' },
  { key: 'looter', help: 'Snatches ground drops: { kinds?, reach? }' },
  { key: 'essenceSpill', help: 'Loot-goblin packets: { per?, mul?, cooldown?, deathBurst? }' },
  { key: 'carry', help: 'Drops the exact worn item: { chance?, rarity?, category? }' },
  { key: 'ambush', help: 'Hidden as scenery until an enemy strays: { radius, announce? }' },
  { key: 'bond', help: 'Pack bond: { mods, kin?, radius? } — mods only while a kin-holder is near' },
  { key: 'nocturne', help: '{ phases: [dawn|day|dusk|night], mods } — day/night-worn mods' },
  { key: 'carrion', help: 'Eats corpses to heal: { radius?, rate?, time? }' },
  { key: 'wake', help: 'Sheds a ground skill as it travels: { skillId, everyDist, dmgMult? }' },
  { key: 'volatile', help: 'Free-cast when struck: { skillId, chance, icd?, dmgMult? }' },
  { key: 'onHitByType', help: "Element responses: { fire: { status?, chance?, skillId?, dmgMult? }, … }" },
  { key: 'onHitTypeIcd', help: 'Seconds between element-response firings' },
  { key: 'immuneGround', help: "Region kinds whose standDamage/heat it ignores (['lava'])" },
  { key: 'pathCosts', help: 'Per-body travel-cost overrides (the wayfaring lever)' },
  { key: 'creepSource', help: 'Anchors a creep membrane: { kind, reach?, bornFrac? }' },
  { key: 'scaling', help: 'Opt-in per-stat level scaling: { life: { flatPerLevel?, incPerLevel?, pow?, rate? } }' },
  { key: 'boons', help: 'Spawn-rolled options from player choice pools: [{ group, pick?, chance? }]' },
  { key: 'brainVariants', help: 'Weighted per-spawn personality roll: [{ weight, brain }]' },
  { key: 'juvenileBelow', help: 'Rolled scale ≤ this → juvenile' },
  { key: 'juvenileBrain', help: 'Brain for juveniles (e.g. flee)' },
  { key: 'vision', help: 'Legacy sight cone: { arcDeg?, rearMul? } (brain.perception wins)' },
  { key: 'presence', help: 'CUSTOM envelope: { from?, to?, fadeIn?, fadeOut?, mul? } (overrides the named band)' },
  { key: 'infrequentTheme', help: 'Monster-infrequent base pool (mi_<theme>)' },
];

// --- dot-path plumbing ------------------------------------------------------

export function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const k of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

/** Set a dot-path leaf; undefined DELETES it and prunes parents it emptied
 *  (so unsetting 'plies.count' with nothing else set drops 'plies' whole —
 *  a def never carries husk objects the engine would misread as opted-in). */
export function setPath(obj: Record<string, unknown>, path: string, v: unknown): void {
  const keys = path.split('.');
  const chain: Record<string, unknown>[] = [obj];
  for (let i = 0; i < keys.length - 1; i++) {
    const parent = chain[i];
    let next = parent[keys[i]];
    if (next === null || typeof next !== 'object' || Array.isArray(next)) {
      if (v === undefined) return; // unsetting under a missing parent: nothing to do
      next = {};
      parent[keys[i]] = next;
    }
    chain.push(next as Record<string, unknown>);
  }
  const leafParent = chain[chain.length - 1];
  const leafKey = keys[keys.length - 1];
  if (v === undefined) delete leafParent[leafKey];
  else leafParent[leafKey] = v;
  // Prune emptied parents from the leaf back up.
  for (let i = chain.length - 1; i > 0; i--) {
    if (Object.keys(chain[i]).length === 0) delete chain[i - 1][keys[i - 1]];
    else break;
  }
}
