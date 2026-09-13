// ---------------------------------------------------------------------------
// MU — the hub between lives (data half; the stage handler lives in
// engine/scenes.ts as the seventh core kind).
//
// Mu is an ephemeral, ethereal zone of NOTHING the player actually PLAYS
// between runs, instead of navigating a menu: the hero stands as a WISP (a
// small guarded light with no kit), and the class roster stands IN the zone
// as shaded apparitions — real bodies wearing each class's own look, named by
// the free npcRole nameplate, translucent by the untargetable ladder plus the
// mu_veiled / mu_faint markers (engine/status.ts). Drifting close to an AWAKE
// vessel and being STILL fills a linger bar and asks the shell for that
// class's card (name front and center, the life-contract row, one Wake
// button); taking it tears this provisional world down and starts the run
// proper — "begins exactly as normal inside Lastlight" by construction,
// because the pick calls the same startGame the class screen always called.
//
// THE HAND LAW (economy parity with the class screen): the dealt hand stands
// AWAKE (selectable — hand size = selectableSlotCount, dealt from the
// account-unlocked pool), the rest of the unlocked pool stands VEILED (named,
// refusing — "not this waking"), and the locked remainder is a rank of faint
// UNKNOWN cowls with no names to give (the discovery web keeps its secrets).
// Class Slots still widen the hand; Class unlocks still deepen the pool.
//
// TWO ROADS IN, ONE GROUND: the prologue's last stage is a 'mu' stage (the
// tutorial's death IS the door — stampComplete marks the prologue LIVED at
// the threshold), and the standalone MU_SCENE below is the veteran lane (New
// Run, and every solo run's end). Both mint the same off-graph 'scene_mu'
// ground; the scene fabric's save stand-down means Mu is never a run.
//
// Pure data leaf: registry rows only (the workshop MONSTERS-record idiom).
// Every number is a dial.
// ---------------------------------------------------------------------------

import { CLASSES } from './classes';
import { MONSTERS, type MonsterDef } from './monsters';
import { registerScene, type SceneDef, type SceneZoneSpec } from './scenes';

export const MU_SCENE_ID = 'mu';

/** The hub's staging ground — minted off-graph via the scene fabric (never
 *  serialized, sealed + rewardless by sealStageZone). Boundless: a zone of
 *  nothing has no edge, only a fading heart of pale ground. */
export const MU_ZONE: SceneZoneSpec = {
  tileset: 'mu',
  name: 'Mu',
  level: 1,
  objectiveLabel: 'Choose a vessel',
  seed: 0x00a0,
  boundless: true,
};

/** The wisp's pale ether ink — the body, and every word the hub speaks at it. */
const WISP_INK = '#bcd4e8';

export const MU_CFG = {
  /** The player-as-spirit body worn while Mu holds the seat: the raw 'spirit'
   *  look (a burning mote in a halo, trailing wisps), pale ether ink, small.
   *  Nothing restores it — the pick builds a whole new world. */
  wisp: { look: 'spirit', color: WISP_INK, radius: 10 },
  /** The provisional class a Mu boot seats under the wisp (invisible — the
   *  wisp strips the kit; also the auto-class a virgin account's first Begin
   *  walks the tutorial as). */
  provisionalClass: 'warrior',
  /** Apparition ranks: BASE radii off the wake point (px) — the floors THE
   *  RING LAW (engine/muRing.ts) grows from: the dealt hand nearest, the
   *  veiled pool behind it, the unknown cowls deepest. */
  ranks: { awake: 250, veiled: 430, faint: 610 },
  /** The DEFAULT crescent the ranks stand on (radians; -PI/2 = due north of
   *  the wake) — THE RING LAW widens it symmetrically about its centre as a
   *  rank fills, up to a closed ring around the wisp. */
  arc: { from: -Math.PI * 0.82, to: -Math.PI * 0.18 },
  /** THE RING LAW (2026-09-13, her word — "given enough class and slot
   *  unlocks the dwell ring might be too large"): seats are DERIVED from a
   *  readable gap, never a fixed arc. `seatGap` = the least centre-to-centre
   *  distance between neighbours per rank (px): a rank whose crescent would
   *  pack tighter WIDENS about its centre up to a closed ring, and a closed
   *  ring still too tight GROWS in radius; ranks stack outward by at least
   *  `rankGap`. THE DISJOINT REACH: the awake gap stands at least twice the
   *  dwell reach (dwell.radius + APPARITION_RADIUS = 93), so no point in Mu
   *  lies within reach of two awake vessels — THE NEAREST LAW (the stage's
   *  selection: one engaged vessel, the nearest surface, seat order on a tie)
   *  is then only the belt. validate.ts warns when a dial breaks it. */
  ring: { seatGap: { awake: 190, veiled: 64, faint: 64 }, rankGap: 180 },
  /** THE GAZE (2026-09-11, her word: the vessels stood facing east — "they
   *  should be looking AT the wisp that's going to inhabit them"): where
   *  every apparition's eyes point. 'wisp' = the live spirit, followed as
   *  it drifts (the roster watches you); 'wake' = the wake point, inward,
   *  held; 'south' = a fixed bearing down the screen. `turnRate` (rad/s)
   *  is the swing toward the mark — slow enough to read as attention,
   *  never a snap; 0 = instant. A vessel is BORN looking at its mark. */
  gaze: { at: 'wisp' as 'wisp' | 'wake' | 'south', turnRate: 2.4 },
  /** How many unknown cowls at most (the locked remainder can be large —
   *  a crowd of mist shapes reads as fog, not as a roster). */
  faintCap: 12,
  /** The commune linger: stand this close, this still, this long. */
  dwell: { radius: 78, sec: 0.9 },
  /** THE GLOBE (her word): drift far enough into the nothing and it WRAPS —
   *  past `radius` off the wake point you pop out the antipode at `reentry`,
   *  still walking the same bearing, so every long walk leads right back to
   *  the vessels. The rim is pure void (the arcs end at ranks.faint, the
   *  motes are screen-space), so the seam is invisible by construction. */
  wrap: { radius: 920, reentry: 880, clear: 310 },
  // ↑ `clear` (THE RING LAW): the pure void kept beyond the OUTERMOST seat —
  //   the live wrap radius is max(radius, outer + clear) and the reentry keeps
  //   the authored radius→reentry step, so a grown ring never meets the seam.
  /** The nameplates' hover — a slow per-vessel bob (px + Hz), phase-split by
   *  actor id so the names breathe independently. */
  bob: { px: 3, hz: 0.45 },
  /** A VEILED vessel's name ink: present-but-not — ephemeral and nothing. */
  veiledInk: '#5f5c74',
  /** The standing HUD prompt while nothing is engaged — YOUNG accounts only
   *  (fewer completed runs than this): veterans know the drift, and the
   *  words would only crowd the stillness. */
  promptRuns: 3,
  prompt: 'Drift near a standing vessel and be still.',
  /** A veiled vessel's refusal (dealt-hand law: not offered this waking). */
  veiledLine: 'This vessel does not stir — not this waking.',
  /** A faint cowl's non-answer. */
  faintLine: 'A shape not yet earned.',
  /** THE PANEL SEAL (her lever, 2026-09-11): hero pages (menu-entry ids,
   *  data/menu.ts) the hub keeps SHUT while the wisp stands — every one of
   *  them: a spirit carries no pack, reads no sheet, spends no points, and
   *  charts no ground, and the provisional class beneath the wisp is not a
   *  build to be read or unlearned. The Menu button still stands (the
   *  shell's door — the pages read greyed, the pause page stays one click
   *  away). `line` is the refusal the press hears (floated at the hero's
   *  feet in `ink`) and the tray's sealed hint. An empty list opens every
   *  page as in a run. */
  sealPanels: { ids: ['inventory', 'character', 'passives', 'map', 'journal'], line: 'A spirit carries nothing between lives.', ink: WISP_INK },
  /** THE OFFERED CONTRACT's card words (her ruling 2026-09-13; the roll
   *  itself is data on the mode row — meta/modes.ts `muOffer`, dealt by
   *  engine/muDeal.ts; the vessel's own tell is its marker status's body
   *  fx, drawn and never told). These are the card HEADER's lines: `sworn`
   *  while the offered contract stands selected, `declined` once the player
   *  steps it back to the default waking (`{mode}` = the selected
   *  contract's name), and the sub-line beneath the sworn badge. */
  offer: {
    sworn: '◈ {mode}',
    swornSub: 'offered this waking — take it, or wake mortal',
    declined: '{mode} · the offer declined',
  },
} as const;

/** The standalone hub scene — the veteran lane (New Run, run's end). The
 *  prologue reaches the same ground as its own final stage instead. */
export const MU_SCENE: SceneDef = {
  id: MU_SCENE_ID,
  ledger: 'mu_visited', // never stamped — transient scenes stamp nothing
  transient: true,
  zone: MU_ZONE,
  stages: [{ kind: 'mu' }],
};

registerScene(MU_SCENE);

// --- THE APPARITIONS ---------------------------------------------------------
// One def per class, generated from the roster itself (the def IS the class's
// look + color + name — the exact triple the live hero body wears), plus ONE
// unknown-cowl def every locked class shares (nameless: no npcRole, so the
// free nameplate stays silent; which classes remain is the world's secret).
// The shading: untargetable bodies already draw at 0.55 alpha (the renderer's
// ladder); mu_veiled / mu_faint floor it lower per rank (StatusDef.ghostAlpha,
// stamped per instance by the mu stage handler).

export const APPARITION_PREFIX = 'apparition_';
export const apparitionDefId = (classId: string): string => `${APPARITION_PREFIX}${classId}`;
export const APPARITION_UNKNOWN_ID = 'apparition_unknown';
/** The nameplate/dwell role every class apparition wears. */
export const APPARITION_ROLE = 'class_apparition';

/** Every apparition's body radius (px) — THE RING LAW's disjoint-reach dial
 *  (data/validate.ts) and the dwell reach read it beside MU_CFG.dwell. */
export const APPARITION_RADIUS = 15;

const apparitionDef = (id: string, name: string, color: string, look: string, role?: string): MonsterDef => ({
  id, name, color,
  shape: 'circle', radius: APPARITION_RADIUS, material: 'ethereal', look,
  // Deliberately FACTIONLESS (the shrine-spirit precedent): a faction tag
  // would enrol a menu fixture in territory censuses and ally-fx scans.
  base: { life: 100, moveSpeed: 0, mana: 0 },
  skills: [], xp: 0, drops: 0,
  passive: true, invulnerable: true, untargetable: true, aims: false,
  noBestiary: true, noNemesis: true,
  ...(role ? { npcRole: role } : {}),
});

for (const c of CLASSES) {
  MONSTERS[apparitionDefId(c.id)] =
    apparitionDef(apparitionDefId(c.id), c.name, c.color, c.look ?? 'spirit', APPARITION_ROLE);
}
MONSTERS[APPARITION_UNKNOWN_ID] =
  apparitionDef(APPARITION_UNKNOWN_ID, 'an unclaimed shape', '#5a5a72', 'ghost');
