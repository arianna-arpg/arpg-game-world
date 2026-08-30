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

export const MU_CFG = {
  /** The player-as-spirit body worn while Mu holds the seat: the raw 'spirit'
   *  look (a burning mote in a halo, trailing wisps), pale ether ink, small.
   *  Nothing restores it — the pick builds a whole new world. */
  wisp: { look: 'spirit', color: '#bcd4e8', radius: 10 },
  /** The provisional class a Mu boot seats under the wisp (invisible — the
   *  wisp strips the kit; also the auto-class a virgin account's first Begin
   *  walks the tutorial as). */
  provisionalClass: 'warrior',
  /** Apparition ranks: arc radii off the wake point (px) — the dealt hand
   *  nearest, the veiled pool behind it, the unknown cowls deepest. */
  ranks: { awake: 250, veiled: 430, faint: 610 },
  /** The arc the ranks stand on (radians; -PI/2 = due north of the wake). */
  arc: { from: -Math.PI * 0.82, to: -Math.PI * 0.18 },
  /** How many unknown cowls at most (the locked remainder can be large —
   *  a crowd of mist shapes reads as fog, not as a roster). */
  faintCap: 12,
  /** The commune linger: stand this close, this still, this long. */
  dwell: { radius: 78, sec: 0.9 },
  /** The standing HUD prompt while nothing is engaged. */
  prompt: 'Drift near a standing vessel and be still.',
  /** A veiled vessel's refusal (dealt-hand law: not offered this waking). */
  veiledLine: 'This vessel does not stir — not this waking.',
  /** A faint cowl's non-answer. */
  faintLine: 'A shape not yet earned.',
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

const apparitionDef = (id: string, name: string, color: string, look: string, role?: string): MonsterDef => ({
  id, name, color,
  shape: 'circle', radius: 15, material: 'ethereal', look,
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
