// ---------------------------------------------------------------------------
// THE WAR BELOW — the Underworld's eternal struggle, as a content package.
//
// This def seats the LORD POOL (packages/lords.ts) and hands the war field
// (overlays/hellWar.ts) its one underworld instance. Eight lords are authored
// here — a run ROLLS four, and those four are EVERLASTING for that world (no
// elimination, no replacement: cast one down and it regathers) — each a full
// banner: a creed, a war temper, a grafted HOST faction whose roster is
// mostly the EXISTING demon library redistributed by affinity (the Legion
// rabble fights under every banner; the lords differ in their elites, their
// marshals, and their manifestations), preferred incursion flavors, and a
// named seat of power (a field anchor, never a zone).
//
// PRESSURELESS: the war is a CONDITION of the dimension, not a surface event —
// it never joins the weight budget or dilutes storm/warband shares. It ticks
// from level 0 (incursion attribution needs the war standing before hell is
// ever entered); the Vault config unlocks once the surface has SEEN the war's
// reach (the first incursion witnessed).
//
// Adding a NINTH lord: one LORDS row below (+ its marshal/lord defs in
// monsters.ts and a look each) — the roll, succession, territory, map,
// bulletins, strikes, and spawning all field it with zero engine edits.
// ---------------------------------------------------------------------------

import { registerKillHandler } from '../../engine/killHandlers';
import { vec } from '../../core/math';
import { MONSTER_NAMES } from '../../data/monsterNames';
import { NEMESIS_NAMES } from '../../data/nemesis';
import { registerLord, type UnderworldLordDef } from '../lords';
import { HellWarField } from '../overlays/hellWar';
import type { ContentPackage, FactionSpec } from '../types';
import type { PackTableEntry } from '../../data/zones';

// --- the pool -----------------------------------------------------------------

interface LordRow extends UnderworldLordDef {
  /** Host roster (the FactionSpec's table) — existing demon library first. */
  roster: PackTableEntry[];
  /** Traits texture for the grafted host faction. */
  hostTraits: { roaming: number; aggression: number };
}

const LORDS: LordRow[] = [
  {
    id: 'surtash', short: 'Surtash', epithet: 'the Pyre Sovereign',
    name: 'Surtash, the Pyre Sovereign', creed: 'Everything burns.',
    color: '#ff8c2e', sigil: '✹', faction: 'host_surtash',
    temper: { push: 0.95, hold: 0.3, opportunism: 0.5, wrath: 0.8, tideAmp: 0.7 },
    lord: 'lord_surtash', marshal: 'marshal_surtash',
    strikes: [{ type: 'flame_tide', weight: 3 }, { type: 'hell_host', weight: 1 }],
    throne: { name: 'The Pyre Eternal' },
    deeds: { take: "%z burns under Surtash's banner!", fall: 'The fires gutter — %z slips from Surtash.' },
    roster: [
      { id: 'imp', weight: 4, presence: { to: 22, fadeOut: 8 } },
      { id: 'ash_whelp', weight: 3, presence: { to: 12, fadeOut: 5 } },
      { id: 'hellhound', weight: 2 },
      { id: 'cinder_fiend', weight: 3, presence: { from: 5 } },
      { id: 'searing_spawn', weight: 2, presence: { from: 8 } },
      { id: 'pyre_titan', weight: 1, presence: { from: 16, fadeIn: 4 } },
      { id: 'marshal_surtash', weight: 1, presence: { from: 14 } },
    ],
    hostTraits: { roaming: 0.7, aggression: 1.4 },
  },
  {
    id: 'vormaul', short: 'Vormaul', epithet: 'the Chainfather',
    name: 'Vormaul, the Chainfather', creed: 'Everything serves.',
    color: '#8a94b8', sigil: '‡', faction: 'host_vormaul',
    temper: { push: 0.3, hold: 0.95, opportunism: 0.25, wrath: 0.45 },
    lord: 'lord_vormaul', marshal: 'marshal_vormaul',
    strikes: [{ type: 'hell_host', weight: 3 }, { type: 'balor_rite', weight: 1 }],
    throne: { name: 'The Chainworks' },
    deeds: { take: "%z is dragged into Vormaul's chains!", fall: "The chains break — %z is out of Vormaul's grip." },
    roster: [
      { id: 'imp', weight: 3, presence: { to: 20, fadeOut: 8 } },
      { id: 'chained_tormentor', weight: 3, presence: { from: 5 } },
      { id: 'stygian_doll', weight: 2, presence: { from: 8 } },
      { id: 'chain_warden', weight: 2, presence: { from: 10 } },
      { id: 'siege_hulk', weight: 1, presence: { from: 15 } },
      { id: 'marshal_vormaul', weight: 1, presence: { from: 14 } },
    ],
    hostTraits: { roaming: 0.2, aggression: 0.8 },
  },
  {
    id: 'morgrath', short: 'Morgrath', epithet: 'the Carrion Duke',
    name: 'Morgrath, the Carrion Duke', creed: 'Everything feeds.',
    color: '#b8405e', sigil: '⚸', faction: 'host_morgrath',
    temper: { push: 0.65, hold: 0.4, opportunism: 1.0, wrath: 0.6 },
    lord: 'lord_morgrath', marshal: 'marshal_morgrath',
    strikes: [{ type: 'imp_incursion', weight: 2 }, { type: 'hell_host', weight: 2 }],
    throne: { name: 'The Middenthrone' },
    deeds: { take: "Morgrath's carrion host gorges on %z!", fall: 'Picked clean, %z is abandoned by the Carrion Duke.' },
    roster: [
      { id: 'imp', weight: 3, presence: { to: 20, fadeOut: 8 } },
      { id: 'hellhound', weight: 3 },
      { id: 'bloodgorger', weight: 3, presence: { from: 6 } },
      { id: 'abyssal_flayer', weight: 2, presence: { from: 10 } },
      { id: 'marshal_morgrath', weight: 1, presence: { from: 14 } },
    ],
    hostTraits: { roaming: 0.85, aggression: 1.2 },
  },
  {
    id: 'vethriss', short: 'Vethriss', epithet: 'the Regent of Doors',
    name: 'Vethriss, the Regent of Doors', creed: 'Everything opens.',
    color: '#9a5ae8', sigil: '✧', faction: 'host_vethriss',
    temper: { push: 0.55, hold: 0.35, opportunism: 0.6, wrath: 0.7, deepStrike: 1 },
    lord: 'lord_vethriss', marshal: 'marshal_vethriss',
    strikes: [{ type: 'balor_rite', weight: 3 }, { type: 'imp_incursion', weight: 1 }],
    throne: { name: 'The Thousandth Door' },
    deeds: { take: 'A thousand doors open — %z falls to Vethriss!', fall: 'The doors close on %z; Vethriss looks elsewhere.' },
    roster: [
      { id: 'imp', weight: 3, presence: { to: 20, fadeOut: 8 } },
      { id: 'demonkin_darter', weight: 3, presence: { from: 5 } },
      { id: 'finger_mage', weight: 2, presence: { from: 8 } },
      { id: 'hellgate_caller', weight: 2, presence: { from: 12 } },
      { id: 'marshal_vethriss', weight: 1, presence: { from: 14 } },
    ],
    hostTraits: { roaming: 0.9, aggression: 1.0 },
  },
  {
    id: 'ozrimoth', short: 'Ozrimoth', epithet: 'the Last Word',
    name: 'Ozrimoth, the Last Word', creed: 'Everything ends.',
    color: '#d8b83a', sigil: 'Ω', faction: 'host_ozrimoth',
    temper: { push: 0.5, hold: 0.6, opportunism: 0.35, wrath: 0.5, tideAmp: 1 },
    lord: 'lord_ozrimoth', marshal: 'marshal_ozrimoth',
    strikes: [{ type: 'balor_rite', weight: 2 }, { type: 'hell_host', weight: 1 }],
    throne: { name: 'The Last Sermon' },
    deeds: { take: 'Ozrimoth pronounces the end of %z.', fall: 'The sentence lifts — %z outlives the Last Word, for now.' },
    roster: [
      { id: 'imp', weight: 3, presence: { to: 20, fadeOut: 8 } },
      { id: 'brimstone_cantor', weight: 3, presence: { from: 6 } },
      { id: 'doomherald', weight: 2, presence: { from: 8 } },
      { id: 'unmaker_acolyte', weight: 2, presence: { from: 10 } },
      { id: 'marshal_ozrimoth', weight: 1, presence: { from: 14 } },
    ],
    hostTraits: { roaming: 0.4, aggression: 0.9 },
  },
  {
    id: 'nyxara', short: 'Nyxara', epithet: 'the Hollow Hush',
    name: 'Nyxara, the Hollow Hush', creed: 'Everything goes quiet.',
    color: '#5aa0a0', sigil: '☾', faction: 'host_nyxara',
    temper: { push: 0.45, hold: 0.5, opportunism: 0.8, wrath: 0.35, deepStrike: 0.4 },
    lord: 'lord_nyxara', marshal: 'marshal_nyxara',
    strikes: [{ type: 'imp_incursion', weight: 3 }],
    throne: { name: 'The Hushed Court' },
    deeds: { take: '%z goes quiet. Nyxara holds it now.', fall: 'Sound returns to %z — the Hush recedes.' },
    roster: [
      { id: 'imp', weight: 3, presence: { to: 20, fadeOut: 8 } },
      { id: 'hellhound', weight: 2 },
      { id: 'hushmaiden', weight: 3, presence: { from: 6 } },
      { id: 'veil_stalker', weight: 2, presence: { from: 8 } },
      { id: 'marshal_nyxara', weight: 1, presence: { from: 14 } },
    ],
    hostTraits: { roaming: 0.6, aggression: 0.7 },
  },
  {
    id: 'bhorog', short: 'Bhorog', epithet: 'the Siegewright',
    name: 'Bhorog, the Siegewright', creed: 'Everything kneels.',
    color: '#a8683a', sigil: 'Ξ', faction: 'host_bhorog',
    temper: { push: 0.75, hold: 0.8, opportunism: 0.2, wrath: 0.55, tideAmp: 0.3 },
    lord: 'lord_bhorog', marshal: 'marshal_bhorog',
    strikes: [{ type: 'hell_host', weight: 4 }],
    throne: { name: 'The Siegecamp Perpetual' },
    deeds: { take: "Bhorog's engines grind %z flat!", fall: 'The engines stall — %z casts off the Siegewright.' },
    roster: [
      { id: 'imp', weight: 3, presence: { to: 20, fadeOut: 8 } },
      { id: 'hellhound', weight: 2 },
      { id: 'dread_fiend', weight: 3, presence: { from: 6 } },
      { id: 'bombard_demon', weight: 2, presence: { from: 8 } },
      { id: 'siege_hulk', weight: 2, presence: { from: 12 } },
      { id: 'marshal_bhorog', weight: 1, presence: { from: 14 } },
    ],
    hostTraits: { roaming: 0.5, aggression: 1.1 },
  },
  {
    id: 'molochai', short: 'Molochai', epithet: 'the Tithe-King',
    name: 'Molochai, the Tithe-King', creed: 'Everything is owed.',
    color: '#8ab04a', sigil: '¤', faction: 'host_molochai',
    temper: { push: 0.55, hold: 0.55, opportunism: 0.55, wrath: 0.9 },
    lord: 'lord_molochai', marshal: 'marshal_molochai',
    strikes: [{ type: 'imp_incursion', weight: 3 }, { type: 'flame_tide', weight: 1 }],
    throne: { name: 'The Counting Vault' },
    deeds: { take: "%z is added to Molochai's ledger!", fall: 'A debt unpaid — %z escapes the Tithe-King.' },
    roster: [
      { id: 'imp', weight: 5, presence: { to: 24, fadeOut: 10 } },
      { id: 'fulgur_imp', weight: 2, presence: { from: 5 } },
      { id: 'tithe_reaper', weight: 3, presence: { from: 6 } },
      { id: 'hatebound_hulk', weight: 2, presence: { from: 8 } },
      { id: 'marshal_molochai', weight: 1, presence: { from: 14 } },
    ],
    hostTraits: { roaming: 0.8, aggression: 1.0 },
  },
];

for (const l of LORDS) registerLord(l);

// The hosts speak the INFERNAL TONGUE (data/monsterNames + data/nemesis
// 'demon' pools) — aliased at boot, not copied: the lords conscript demons,
// they don't invent a language. One tongue, nine banners.
for (const l of LORDS) {
  if (MONSTER_NAMES.byFaction.demon) MONSTER_NAMES.byFaction[l.faction] ??= MONSTER_NAMES.byFaction.demon;
  if (NEMESIS_NAMES.byFaction.demon) NEMESIS_NAMES.byFaction[l.faction] ??= NEMESIS_NAMES.byFaction.demon;
}

// --- the grafted host factions -------------------------------------------------
// Pairwise-hostile (the eternal struggle; a run's rolled TRUCE overrides at
// runtime through the stance layer), kin to the Legion rabble they conscript,
// and at war with the Caul (hell's other claimant organism). contexts keeps
// the hosts OUT of baseline generation — only the war fields them.

const HOST_FACTIONS: FactionSpec[] = LORDS.map((l, i) => ({
  id: l.faction,
  name: hostName(l.id),
  color: l.color,
  traits: {
    roaming: l.hostTraits.roaming, aggression: l.hostTraits.aggression,
    warlordHome: 'origin', contexts: ['underworld_war'], temper: 'territorial',
  },
  roster: l.roster,
  relations: [
    { a: l.faction, b: 'demon', kind: 'ally', strength: 1 },
    { a: l.faction, b: 'caulborn', kind: 'hostile', strength: 1 },
    ...LORDS.slice(0, i).map(o => ({ a: l.faction, b: o.faction, kind: 'hostile' as const, strength: 1 })),
  ],
}));

function hostName(lordId: string): string {
  switch (lordId) {
    case 'surtash': return 'the Pyre Host';
    case 'vormaul': return 'the Chain-Levy';
    case 'morgrath': return 'the Carrion Court';
    case 'vethriss': return 'the Host of Doors';
    case 'ozrimoth': return 'the Final Choir';
    case 'nyxara': return 'the Hushed Host';
    case 'bhorog': return 'the Iron Grind';
    case 'molochai': return 'the Tithe Legion';
    default: return `the host of ${lordId}`;
  }
}

// --- the package ----------------------------------------------------------------

export const UNDERWORLD_WAR: ContentPackage = {
  id: 'underworld_war',
  label: 'The War Below',
  blurb: 'The Underworld is a country at war: rolled lords, living fronts, and a struggle no one can win — least of all you.',
  color: '#a83a4a',
  cost: 120,
  unlock: {
    id: 'underworld_war_unlock',
    label: 'Witness a Demonic Incursion',
    test: ctx => (ctx.ledger.demon_invasion_seen ?? 0) >= 1,
  },
  // A CONDITION of the dimension, not a surface event: no weight seat, no
  // sliders — the config purchase is recognition, not a lever (The Pit's mode).
  modifiers: [],
  defaultWeight: 0,
  defaultStartLevel: 0,
  defaultEnabled: true,
  pressureless: true,
  world: {
    overlay: ctx => new HellWarField(ctx),
    dimensions: ['underworld'],
  },
  factions: HOST_FACTIONS,
  validate: look => {
    const out: string[] = [];
    for (const l of LORDS) {
      if (!look.monster(l.lord)) out.push(`lord '${l.id}': manifestation body '${l.lord}' is not a registered monster`);
      if (!look.monster(l.marshal)) out.push(`lord '${l.id}': marshal '${l.marshal}' is not a registered monster`);
      if (!l.throne.name) out.push(`lord '${l.id}': the seat of power needs a name`);
      if (!l.strikes.length) out.push(`lord '${l.id}': no strike preferences`);
    }
    return out;
  },
};

// --- the player's levers (kill bounties) -----------------------------------------
// Both bodies carry their lord on Actor.eventKey ('hellwar:<lordId>'), stamped
// where the war spawns them — the handler never guesses from def ids.

registerKillHandler({
  id: 'hell_marshal',
  tag: 'hell_marshal',
  run: ctx => {
    const lordId = ctx.actor.eventKey?.split(':')[1] ?? '';
    ctx.sim.hellWarField?.onMarshalSlain(lordId, { x: ctx.zone.map.x, y: ctx.zone.map.y });
    ctx.bumpLedger('hell_marshals_slain');
    ctx.grantXp(Math.round(160 + ctx.zone.level * 30));
    ctx.dropGemAt(ctx.actor.pos);
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 48), 'The push collapses!', '#e8b060', 15);
  },
});

registerKillHandler({
  id: 'hell_lord',
  tag: 'hell_lord',
  run: ctx => {
    const lordId = ctx.actor.eventKey?.split(':')[1] ?? '';
    ctx.sim.hellWarField?.onLordSlain(lordId);
    ctx.bumpLedger('hell_lords_slain');
    ctx.bumpAccountLedger('hell_lords_slain', 1, true);
    ctx.grantXp(Math.round(340 + ctx.zone.level * 56));
    for (let i = 0; i < 4; i++) ctx.dropGemAt(ctx.actor.pos);
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 60), 'CAST DOWN — and the war does not even pause.', '#ffd700', 19);
  },
});
