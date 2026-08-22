// ---------------------------------------------------------------------------
// THE SCALD KIT — K1: the monster side, the folds, the geyser-step spike
// (charter docs/design/scald-kit.md v2, WALKED 2026-08-21 — cards 1–8
// ratified, card 3 amended by THE RUPTURE LAW; parent docs/design/
// scald-basin.md §8/§8b/§9). The compounding law's third layer: the basin's
// themes (SCALD / STEAM / PRESSURE / GEYSER-STEP / PRISM) graduate from the
// terrain into KIT — monsters first (THE MIRROR LAW: every player piece has a
// scald monster wearer, so the player sees the verb before owning it), the
// player's pieces after (K2 — acquisition, gems); this round pulls ONE
// player spike forward at her word: GEYSER-STEP.
//
// The kit's engine law lives where each fabric lives (this file is the
// registry leaf + the K1 census the probe reads — the garden.ts single-file
// doctrine, data only):
//   · THE SCALD BANK + THE WET FOLD   — engine/status.ts StatusDef.bank
//                                       (`scalded` row), Actor.applyStatus,
//                                       Actor.isWet, World.updateWetSky,
//                                       WeatherDef.wets (world/weather.ts);
//   · THE RUPTURE                      — engine/skills.ts RuptureEffect →
//                                       World.ruptureBank (the on-hit loop);
//   · THE VENT (a planted steam bank)  — engine/skills.ts VentEffect →
//                                       World.plantVent → FogField.plantBank;
//                                       THE VAPOR RIDE: FogBankDef.occludesSight
//                                       → World.opaqueAt → castRay 'sight';
//   · THE PRESSURE GAUGE read          — engine/tells.ts 'rounds:<skillId>'
//                                       (Actor.roundsOf — the magazine IS
//                                       the bank, card 6);
//   · THE VENT-RIDE                    — engine/skills.ts LeapDelivery.vent
//                                       (the cast's broil, the take-off
//                                       column, the flight's jet —
//                                       render/vis/ventRideLayer.ts).
// The kin + looks + skills ride data/monsters.ts / looks.ts / skills.ts; the
// packs data/tilesets.ts; the new look parts render/vis/parts.ts (THE
// NEW-PIECES PREFERENCE — her word: build the part the theme wants).
// THE NO-LOCK LAW (§1): every player piece works ANYWHERE (geyser-step is a
// leap + a fire splash; steam is occlusion; the bank is a status) — the
// country is where it SHINES, never the only place it works. THE NO-TAG LAW
// binds every demeanor (a vent-rider relocates, never hovers).
// Every number is a DIAL (unblessed — she blesses via playthroughs).
// Docs: docs/engine/scaldkit.md. Probe: balance/probe_scaldkit.ts.
// ---------------------------------------------------------------------------

import { registerFogBank } from '../engine/fog';
import { registerAICondition } from '../engine/brain';
import { registerGemFloor } from '../engine/loot';

/** THE SCALD KIT's dials — all DIAL. */
export const SCALDKIT_CFG = {
  /** THE STEAM BANK (the `vent` effect's debut kind): reach/life rolls stand
   *  for a ZONE-spec'd bank; a PLANTED bank takes the cast's radius + duration
   *  instead (World.plantVent). Barely drifts (steam pools where it rose),
   *  dense enough to hide a body (alpha), a few lobes, a short life. */
  steam: { alpha: 0.5, radius: [70, 120] as [number, number], lobes: [4, 7] as [number, number], drift: [1, 4] as [number, number], life: [8, 14] as [number, number] },
} as const;

// --- THE STEAM BANK (FogBankDef 'steam') ------------------------------------
// The `vent` SkillEffect's registered kind (engine/skills.ts VentEffect — the
// lightwell-planting effect's sibling aimed at the fog fabric): white,
// dense, short-lived, and OPAQUE TO SIGHT (occludesSight — THE VAPOR RIDE:
// eyes stop at the white through the one castRay 'sight' ride, so ranged
// kin lose the lock and the vaporling strikes out of it). Occupants wear
// fogveiled (the stealth fabric's own concealment mark). No scald grant in
// K1 (the charter's "optional" — concealment stays pure; a later row may
// add a light sting). The vent-shaman's Steam Vent, the vaporling's own
// white, and K2's player Steam Veil all plant this kind (the Cistern
// Crone's `steam_veil` is a CONJURED cloud of the cloud-craft fabric — a
// different seam; only this kind occludes sight).
registerFogBank({
  id: 'steam',
  color: '#eef6f8',
  alpha: SCALDKIT_CFG.steam.alpha,
  radius: SCALDKIT_CFG.steam.radius,
  lobes: SCALDKIT_CFG.steam.lobes,
  drift: SCALDKIT_CFG.steam.drift,
  meander: 0.1,
  breathe: 0.2,
  churn: 0.4,
  life: SCALDKIT_CFG.steam.life,
  rampFrac: 0.25,
  overFrac: 0.5,
  occludesSight: true,
  grants: [{ status: 'fogveiled' }],
});

// --- THE VAPORLING's condition: `lacksStatus` ---------------------------------
// The open AI-condition seam's generic tenant (the packDrive / nerveBelow
// precedent): true while the body does NOT wear the named status. The
// vaporling reads its own steam through it (`fogveiled` is what a bank
// grants — "am I in the white?" is one status read, no new world hook) and
// plants a fresh veil when it has none. Generic by construction: any rule
// may ask "not wearing X".
registerAICondition('lacksStatus', (actor, _t, _ctx, arg) =>
  typeof arg === 'string' && !actor.statuses.some(s => s.id === arg));

// --- THE K1 CENSUS (what the probe reads) -------------------------------------

/** The kit's FAMILIES (charter §3) and their MONSTER WEARERS in the scald's
 *  lists — THE MIRROR LAW's ledger: every player piece of a family must find
 *  at least one wearer here (the probe asserts it; K2 appends its pieces). A
 *  wearer is a def whose kit carries the family's verb (the probe checks the
 *  skills, not just the names). */
export const SCALD_KIT_FAMILIES: Record<string, { wearers: string[]; verb: string }> = {
  scald: { wearers: ['scald_lancer', 'kettleback', 'kettle_bladder'], verb: 'banks scalded / ruptures the bank' },
  steam: { wearers: ['vent_shaman', 'vaporling'], verb: 'plants a steam bank (vent effect)' },
  pressure: { wearers: ['kettle_bladder', 'spout_hopper', 'scald_lancer'], verb: 'a drawn gauge fills and spends (drive / rounds)' },
  geyserStep: { wearers: ['vent_shaman', 'spout_hopper'], verb: 'a leap that rides its own vent (LeapDelivery.vent)' },
  prism: { wearers: ['prism_snail', 'terrace_warden'], verb: 'tune: re-tunes to the last blow' },
};

/** The PLAYER pieces shipped so far, by family — K1 ships the geyser-step
 *  spike only (dev-obtainable: the Gems tab lists every SKILLS entry; no
 *  acquisition rows until K2). THE NO-LOCK CENSUS reads this list: every
 *  piece must carry a non-scald effect (a leap, a hit, a shove — something
 *  that works in the grove or the desert). */
export const SCALD_KIT_PLAYER_PIECES: { skill: string; family: keyof typeof SCALD_KIT_FAMILIES }[] = [
  { skill: 'geyser_step', family: 'geyserStep' },
  // K2 — the roster cut (charter §7 card 1): SCALD + PRESSURE +
  // GEYSER-STEP as skills, STEAM light. PRISM ships supports/vestiges
  // only, so it has no skill row here (its census runs off the supports
  // list below).
  { skill: 'scalding_lash', family: 'scald' },
  { skill: 'kettle_burst', family: 'scald' },
  { skill: 'boil_over', family: 'scald' },
  { skill: 'head_of_steam', family: 'pressure' },
  { skill: 'blowhole', family: 'pressure' },
  { skill: 'vent_hop', family: 'geyserStep' },
  { skill: 'vent_veil', family: 'steam' },
];

/** K2's GEM side — the same two censuses read these (a support's NO-LOCK
 *  test is "does its payload read anything but scald?", its MIRROR test is
 *  its family's wearer list above). */
export const SCALD_KIT_PLAYER_SUPPORTS: { support: string; family: keyof typeof SCALD_KIT_FAMILIES }[] = [
  { support: 'boiling_point', family: 'scald' },
  { support: 'pressure_seal', family: 'pressure' },
  { support: 'afterspray', family: 'geyserStep' },
  { support: 'vaporize', family: 'steam' },
  { support: 'mineral_tuning', family: 'prism' },
];

/** The basin's mineral register (charter §3.5 — PRISM's worn half). */
export const SCALD_KIT_VESTIGES = ['sinter', 'travertine', 'sulphur', 'vitriol'] as const;

// --- ACQUISITION (charter §4, ratified: floored drops + the ledger opens
// the pool + the vendor rung following) --------------------------------------
// THE GEM FLOOR (engine/loot.ts): the country's own loot seam carries its
// own gems FIRST. While the player stands on scald ground — any of the five
// faces, the galleries, the den, the cistern — the kit's gems drop there
// even before the account has unlocked them, and roll at ×floorMult weight
// so the basin visibly advertises itself. Everywhere ELSE the account-wide
// pool is the law, which is exactly what the unlock below opens (THE NO-LOCK
// LAW's acquisition half: found in the scald, owned everywhere).
// (TILESET ids only — the probe pins that every row names a real one. The
// CISTERN needs no row: it is an under-STORY of the sulphur_pools face, so
// its zones carry that tileset and are already floored by it.)
export const SCALD_KIT_FLOOR_TILESETS = [
  'sinter_terraces', 'geyser_fields', 'char_reach', 'sulphur_pools',
  'steam_galleries', 'great_geyser',
] as const;

registerGemFloor({
  id: 'scald_kit',
  tilesets: SCALD_KIT_FLOOR_TILESETS,
  skills: SCALD_KIT_PLAYER_PIECES.map(p => p.skill),
  supports: SCALD_KIT_PLAYER_SUPPORTS.map(s => s.support),
});

/** THE LEDGER ROWS the account-wide unlock opens on (meta/unlocks.ts
 *  gem_skills_scald / sup_scald read this list as an ANY-OF gatework group):
 *  the den's entry + its alpha, and the cistern's descent — whichever road
 *  the player's own walk crosses first (the M3 piles stamp these). */
export const SCALD_KIT_UNLOCK_LEDGERS = [
  'great_geyser_entered', 'geysermaw_slain', 'cistern_entered',
] as const;

/** THE WAVE-3 KIN (charter §5): the five debuts, each on ONE standing
 *  fabric — the probe's seating census (scald faces only) reads this. */
export const SCALD_KIT_WAVE3 = ['scald_lancer', 'vaporling', 'kettle_bladder', 'spout_hopper', 'terrace_warden'] as const;
