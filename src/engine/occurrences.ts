// ---------------------------------------------------------------------------
// THE OCCURRENCE FABRIC — court-seated mini-events under THE UNCERTAINTY
// DOCTRINE (the batch-18 charter): a court/massif ring may hold a lair, an
// occurrence, or plain loot, and the player can never pre-read which. The
// fabric is the middle leg — an OPEN REGISTRY of occurrences (never a
// fracture one-off) that enter the world AS RING TENANTS and spring their
// event at the spot the player was busy reading as ordinary ground.
//
// THE DOCTRINE MADE STRUCTURAL (the parity law, probe rig A): the tenant
// registrant below delegates its whole VISIBLE face to a standing tenant
// kind ('cache' by default — the loot that BAITS the dwell) with the fork
// stream untouched before and after, then records its trigger with ZERO
// draws and ZERO dress. An occurrence court is therefore BYTE-IDENTICAL to
// a plain court of its face kind — grid, doodads, spawns, every dressing
// jitter — so no pre-read exists even in principle. Ambiguity is not a
// discipline here; it is a construction.
//
// THE MINTED-TRIGGER SEAM (the court shrine's idiom, data/puzzles.ts): the
// handler runs at GEN time inside generateLayout, so the planted trigger is
// recorded into a zone-keyed module registry (recordMintedOccurrence /
// mintedOccurrencesOf) the load half adopts. A new generation pass for the
// same zone (same ctx never repeats) RESETS the bundle and re-records —
// zones re-mint from seed, so re-entry re-derives the identical rows and
// Zone Memory indices stay aligned by construction. Nothing serializes.
//
// THE LIFECYCLE: armed → (telegraph) → sprung.
//   · TRIGGERS are an open registry (registerOccTrigger — the
//     registerTrapEffect shape): 'dwell' banks seconds while a hero stands
//     in the radius ("the abyssals hear the footsteps"), 'proximity' fires
//     on approach, 'disturb' fires on a breaking body nearby (popBrittle
//     feeds World.occDisturbs — smash the urns, wake what listens).
//   · THE TELEGRAPH LAW (banked triggers only): past `fromFrac` the spot
//     SPEAKS — a one-time line, one-time warning dress (abyss cracks
//     spidering the floor), and a ground rumble while the hero stays in —
//     the trapworks rake-stroke doctrine: the pending spring is readable
//     before it fires. Instant triggers (proximity/disturb) telegraph
//     nothing, honestly — they are the trapworks-plate school.
//   · THE SPRING: announce + shake + flash (standing FX levers only), the
//     wound dress (standing doodad kinds only — no new painters), and the
//     WAVE through the host's one pour seam (weightedPick over authored kin
//     rows or a registered faction roster, minted at the LIVE zone level).
//   · ONE-SHOT BY MEMORY: sprung state rides Zone Memory (occSprung — the
//     riftCharges idiom, index-aligned with the minted rows); re-entry
//     re-stands the wound via reviveOccSite and never re-arms. Past the
//     memory TTL the ground forgets like all ground.
//
// THE AFTERMATH REGISTRY (registerOccAftermath, open): a sprung spot may
// CONVERT. Core kind 'fixture' — the breached spot keeps pouring on a
// jittered world-clock (the rift-pour grammar verbatim: arm on first beat,
// zone-wide live cap on the born tag, small batches, kin at the LIVE zone
// level). THE QUICKENING ANCHOR is free by construction: every mint reads
// this.zone.level at spawn time, and the Quickening surges exactly that
// field for its window (probe rig F pins the read).
//
// THE DRESS DETERMINISM LAW: telegraph and spring dress each draw from a
// position-hash seeded stream (site.seed — the pitfall fabric's
// position-hash idiom), never the world dice — so the re-entry replant is
// byte-identical to the lived sequence, and no live clock jitter can move
// a remembered wound.
//
// World speaks through the narrow OccHost (the TrapHost precedent) — this
// module never imports World. Debut content: data/occurrences.ts (THE
// ABYSSAL FRACTURE). Probe: balance/probe_occurrences.ts. Docs: the charter
// in planned-passes #18.
// ---------------------------------------------------------------------------

import type { GenCtx, DoodadKind } from './levelgen';
import { registerTenantKind, tenantKindOf, type TenantRow } from './massif';
import type { PresenceSpec } from './presence';
import { Rng } from '../core/rng';

/** Framework dials (the MASSIF_CFG idiom — reference numbers, never magic
 *  inlined at the drive sites). */
export const OCC_CFG = {
  /** The default visible face — a registered TENANT KIND the registrant
   *  delegates to. 'cache' on purpose: the hoard knot is the bait that
   *  makes the dwell natural. */
  face: 'cache',
  /** Trigger defaults: hearing radius (px) + banked seconds to spring. */
  radius: 150,
  dwellSec: 24,
  /** THE TELEGRAPH LAW: banked fraction past which the spot speaks. */
  telegraphFrac: 0.5,
  /** Ground rumble (screen-shake floor) held while a hero stands in a
   *  telegraphing spot — a simmer, never a quake. */
  rumbleMag: 2.2,
  /** The born tag (THE CAP LAW's census key — the rift_born idiom). */
  bornTag: 'occ_born',
  /** 'fixture' aftermath defaults (the RIFT_CFG.pour grammar). */
  pour: {
    every: [9, 14] as [number, number],
    batch: [1, 2] as [number, number],
    /** Zone-wide cap on live born bodies (MANDATORY — no uncapped pour). */
    cap: 6,
    radius: [40, 110] as [number, number],
    levelBonus: 0,
  },
  /** Dress-stream salts (fork identity — fixed, the TENANT_SALT law). */
  telegraphSalt: 0x7e11a3,
  springSalt: 0x5b17c9,
  accent: '#b06aff',
} as const;

// --- The spec vocabulary ------------------------------------------------------

/** One weighted kin row (PackTableEntry-shaped: presence envelopes fold at
 *  World.weightedPick like every leveled list). */
export interface OccKinRow {
  id: string;
  weight: number;
  presence?: PresenceSpec;
}

/** Who pours/waves: authored kin rows win; else a registered FACTIONS roster
 *  (boss/spawner/passive bodies filtered host-side); else nothing, warned. */
export interface OccKinSpec {
  kin?: OccKinRow[];
  faction?: string;
  /** Level bonus over the LIVE zone level (the quickening-anchored read). */
  levelBonus?: number;
  /** Census tag on every born body (default OCC_CFG.bornTag). */
  tag?: string;
}

/** One wound-dress row: standing doodad kinds only (no new painters — the
 *  telegraph law's own rule), planted on the site's seeded dress stream. */
export interface OccDressRow {
  kind: DoodadKind;
  radius: [number, number];
  count: [number, number];
  /** Ring band off the spot (px); [0, 0] seats ON the spot. */
  ring: [number, number];
  /** Stamp the pit word (abyssal_rent's own stamp sets it — the fall pit). */
  fall?: boolean;
}

/** The trigger row — `kind` names a registered trigger (open registry). */
export interface OccTriggerSpec {
  kind: string;
  /** Hearing/arming radius (px; default OCC_CFG.radius). */
  radius?: number;
  /** Banked seconds to spring (banked kinds; default OCC_CFG.dwellSec). */
  sec?: number;
}

/** THE TELEGRAPH (banked triggers only — see the header law). */
export interface OccTelegraphSpec {
  /** Banked fraction past which the spot speaks (default cfg). */
  fromFrac?: number;
  /** The one-time spoken line. */
  text?: string;
  /** One-time warning dress (the spidering cracks). */
  dress?: OccDressRow[];
  /** Held rumble while a hero stands in (default cfg; 0 = silent ground). */
  rumble?: number;
}

/** THE SPRING — what smashes through. */
export interface OccSpringSpec {
  dress?: OccDressRow[];
  wave?: OccKinSpec & { count: [number, number]; radius: [number, number] };
  text?: string;
  shake?: number;
  flash?: { radius: number; color?: string };
}

/** THE AFTERMATH row — `kind` names a registered aftermath. `pour` is the
 *  core 'fixture' kind's tailoring; future kinds read `params`. */
export interface OccAftermathSpec {
  kind: string;
  pour?: OccKinSpec & Partial<{
    every: [number, number];
    batch: [number, number];
    cap: number;
    radius: [number, number];
  }>;
  params?: Record<string, unknown>;
}

/** One registered occurrence — the open vocabulary content registers
 *  against (data/occurrences.ts is the debut shelf). */
export interface OccurrenceDef {
  id: string;
  /** The visible face (a registered tenant kind; default OCC_CFG.face). */
  face?: string;
  trigger: OccTriggerSpec;
  telegraph?: OccTelegraphSpec;
  spring: OccSpringSpec;
  aftermath?: OccAftermathSpec;
  accent?: string;
}

// --- The registries -----------------------------------------------------------

export const OCCURRENCES: Record<string, OccurrenceDef> = {};

export function registerOccurrence(def: OccurrenceDef): void {
  if (OCCURRENCES[def.id]) console.warn(`[occ] re-registering occurrence '${def.id}' — overriding`);
  OCCURRENCES[def.id] = def;
}

export function occurrenceOf(id: string): OccurrenceDef | undefined { return OCCURRENCES[id]; }
export function occurrenceIds(): string[] { return Object.keys(OCCURRENCES); }

/** One trigger driver: advance `site` (bank freely) and return true the
 *  frame the spot SPRINGS. Pure over the host's narrow senses. */
export type OccTriggerDriver = (
  host: OccHost, site: OccSite, spec: OccTriggerSpec, dt: number,
) => boolean;

const OCC_TRIGGERS: Record<string, OccTriggerDriver> = {};

export function registerOccTrigger(kind: string, driver: OccTriggerDriver): void {
  if (OCC_TRIGGERS[kind]) console.warn(`[occ] re-registering trigger kind '${kind}' — overriding`);
  OCC_TRIGGERS[kind] = driver;
}

export function occTriggerKinds(): string[] { return Object.keys(OCC_TRIGGERS); }

/** One aftermath: `establish` converts the spot (at spring time AND at the
 *  re-entry revive of a remembered sprung spot — `revive` says which; plant
 *  standing state only, never FX on a revive), `drive` runs its standing
 *  life on the sweep (the fixture clock). */
export interface OccAftermathHooks {
  establish?(host: OccHost, site: OccSite, revive: boolean): void;
  drive?(host: OccHost, site: OccSite, dt: number): void;
}

const OCC_AFTERMATHS: Record<string, OccAftermathHooks> = {};

export function registerOccAftermath(kind: string, hooks: OccAftermathHooks): void {
  if (OCC_AFTERMATHS[kind]) console.warn(`[occ] re-registering aftermath kind '${kind}' — overriding`);
  OCC_AFTERMATHS[kind] = hooks;
}

export function occAftermathKinds(): string[] { return Object.keys(OCC_AFTERMATHS); }

// --- The narrow host (the TrapHost precedent) ---------------------------------

/** What an occurrence may ask of the world — and nothing else. World
 *  implements it once (World.occHost); drivers/aftermaths speak only this. */
export interface OccHost {
  timeOf(): number;
  zoneLevel(): number;
  /** Nearest LOCAL hero distance to (x, y) — Infinity when none stands.
   *  Distance only, on purpose: footsteps are SOUND, not sight. */
  heroDist(x: number, y: number): number;
  /** A body broke near (x, y) this frame (popBrittle's ping ring). */
  disturbedNear(x: number, y: number, r: number): boolean;
  /** The world dice (runtime clock jitter — the rift pour's own die). */
  dice(a: number, b: number): number;
  diceInt(a: number, b: number): number;
  /** Plant one standing doodad (pushed + families marked). */
  plant(row: { x: number; y: number; r: number; kind: DoodadKind; rot?: number; fall?: boolean }): void;
  /** THE POUR SEAM: mint `n` kin at the live zone level around (x, y) —
   *  kin rows first, else a registered faction roster (boss/spawner/passive
   *  filtered), else nothing. Returns how many stood. */
  pour(spec: OccKinSpec, x: number, y: number, band: [number, number], n: number): number;
  /** Live census of a born tag (THE CAP LAW's read). */
  tagCount(tag: string): number;
  announce(x: number, y: number, text: string, color: string): void;
  rumble(mag: number): void;
  flash(x: number, y: number, radius: number, color: string): void;
}

// --- The minted-trigger seam (the court shrine's idiom) -----------------------

/** One planted trigger, recorded at gen time (position = the court's own
 *  interior seat — no draw spent; floorR = the court's usable floor). */
export interface MintedOccurrence {
  id: string;
  x: number;
  y: number;
  floorR: number;
}

/** Per-zone bundles, reset on ctx identity (a fresh generation pass replaces
 *  the stale list; same-pass courts append in deterministic seat order). */
const MINTED = new Map<string, { ctx: object; rows: MintedOccurrence[] }>();

export function recordMintedOccurrence(ctx: object, zoneId: string, row: MintedOccurrence): void {
  const bundle = MINTED.get(zoneId);
  if (!bundle || bundle.ctx !== ctx) {
    MINTED.set(zoneId, { ctx, rows: [row] });
    return;
  }
  bundle.rows.push(row);
}

export function mintedOccurrencesOf(zoneId: string): readonly MintedOccurrence[] {
  return MINTED.get(zoneId)?.rows ?? [];
}

// --- The runtime sites --------------------------------------------------------

/** One live spot (index-aligned with the minted rows — Zone Memory's
 *  occSprung rides that order). A `dud` keeps its seat so indices never
 *  shift, and drives nothing. */
export interface OccSite {
  def?: OccurrenceDef;
  x: number;
  y: number;
  floorR: number;
  /** Position-hash dress seed (THE DRESS DETERMINISM LAW). */
  seed: number;
  state: 'armed' | 'sprung';
  /** Banked trigger progress (dwell seconds). Never persisted — the scent
   *  fades when you leave; only SPRUNG persists. */
  bank: number;
  /** Telegraph one-shots. */
  told: boolean;
  cracked: boolean;
  /** The fixture clock (0 = unarmed — the rift pour's arm-on-first-beat). */
  pourAt: number;
  dud?: boolean;
}

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const warned = new Set<string>();
function warnOnce(key: string, msg: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[occ] ${msg}`);
}

/** Build the zone's live sites from its minted rows + remembered sprung
 *  flags (index-aligned). Unknown def ids seat DUDS (indices never shift;
 *  degrade, never wedge). */
export function bootOccSites(zoneId: string, sprung?: number[]): OccSite[] {
  const rows = mintedOccurrencesOf(zoneId);
  return rows.map((row, i) => {
    const def = OCCURRENCES[row.id];
    if (!def) warnOnce(`def:${row.id}`, `minted occurrence '${row.id}' has no registered def — a dud seat holds its index`);
    return {
      def, x: row.x, y: row.y, floorR: row.floorR,
      seed: (hashStr(`${zoneId}:occ:${i}`) ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0,
      state: def && sprung?.[i] ? 'sprung' : 'armed',
      bank: 0, told: false, cracked: false, pourAt: 0,
      ...(def ? {} : { dud: true }),
    };
  });
}

// --- The dress law ------------------------------------------------------------

function plantDress(host: OccHost, site: OccSite, rows: OccDressRow[] | undefined, salt: number): void {
  if (!rows?.length) return;
  const rng = new Rng((site.seed ^ salt) >>> 0);
  for (const row of rows) {
    const n = rng.int(row.count[0], row.count[1]);
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, Math.PI * 2);
      const d = rng.range(row.ring[0], row.ring[1]);
      host.plant({
        x: site.x + Math.cos(a) * d, y: site.y + Math.sin(a) * d,
        r: rng.range(row.radius[0], row.radius[1]),
        kind: row.kind, rot: rng.range(0, Math.PI * 2),
        ...(row.fall ? { fall: true } : {}),
      });
    }
  }
}

// --- The lifecycle ------------------------------------------------------------

function accentOf(def: OccurrenceDef): string { return def.accent ?? OCC_CFG.accent; }

/** THE SPRING — fire the event at the spot (live path only). */
function springOccSite(host: OccHost, site: OccSite): void {
  const def = site.def;
  if (!def || site.state !== 'armed') return;
  site.state = 'sprung';
  const s = def.spring;
  if (s.text) host.announce(site.x, site.y, s.text, accentOf(def));
  if (s.shake) host.rumble(s.shake);
  if (s.flash) host.flash(site.x, site.y, s.flash.radius, s.flash.color ?? accentOf(def));
  // The wound (a sprung spot that never telegraphed — instant triggers —
  // still wears the full scar; a spot the telegraph already cracked skips
  // its phase, or the seeded stream would stack duplicates).
  if (!site.cracked) {
    plantDress(host, site, def.telegraph?.dress, OCC_CFG.telegraphSalt);
    site.cracked = true;
  }
  plantDress(host, site, s.dress, OCC_CFG.springSalt);
  if (s.wave) {
    const n = host.diceInt(s.wave.count[0], s.wave.count[1]);
    host.pour(s.wave, site.x, site.y, s.wave.radius, n);
  }
  OCC_AFTERMATHS[def.aftermath?.kind ?? '']?.establish?.(host, site, false);
  if (def.aftermath && !OCC_AFTERMATHS[def.aftermath.kind]) {
    warnOnce(`aftermath:${def.aftermath.kind}`, `occurrence '${def.id}' names unknown aftermath '${def.aftermath.kind}' — the spring stands alone`);
  }
}

/** THE REVIVE — re-stand a remembered SPRUNG spot on re-entry: the seeded
 *  wound replants byte-identical (both dress phases), the aftermath
 *  re-establishes its standing state. No FX, no wave — history, not news. */
export function reviveOccSite(host: OccHost, site: OccSite): void {
  const def = site.def;
  if (!def || site.state !== 'sprung') return;
  plantDress(host, site, def.telegraph?.dress, OCC_CFG.telegraphSalt);
  site.cracked = true;
  plantDress(host, site, def.spring.dress, OCC_CFG.springSalt);
  OCC_AFTERMATHS[def.aftermath?.kind ?? '']?.establish?.(host, site, true);
}

/** THE SWEEP — drive every live site one frame: armed spots run their
 *  trigger (+ the telegraph law), sprung spots run their aftermath. Cheap
 *  by construction: a zone holds a handful of sites at most. */
export function driveOccSites(host: OccHost, sites: OccSite[], dt: number): void {
  for (const site of sites) {
    const def = site.def;
    if (!def || site.dud) continue;
    if (site.state === 'armed') {
      const spec = def.trigger;
      const driver = OCC_TRIGGERS[spec.kind];
      if (!driver) {
        warnOnce(`trigger:${spec.kind}`, `occurrence '${def.id}' names unknown trigger '${spec.kind}' — the spot sleeps`);
        continue;
      }
      const fired = driver(host, site, spec, dt);
      // THE TELEGRAPH LAW (banked triggers only): past the fraction the spot
      // speaks — once in words and cracks, and in the ground while you stand.
      const need = spec.sec ?? (spec.kind === 'dwell' ? OCC_CFG.dwellSec : 0);
      if (!fired && need > 0 && site.bank > 0) {
        const tg = def.telegraph;
        const from = tg?.fromFrac ?? OCC_CFG.telegraphFrac;
        if (site.bank / need >= from) {
          if (!site.told) {
            site.told = true;
            if (tg?.text) host.announce(site.x, site.y, tg.text, accentOf(def));
          }
          if (!site.cracked) {
            site.cracked = true;
            plantDress(host, site, tg?.dress, OCC_CFG.telegraphSalt);
          }
          const r = spec.radius ?? OCC_CFG.radius;
          if (host.heroDist(site.x, site.y) <= r) host.rumble(tg?.rumble ?? OCC_CFG.rumbleMag);
        }
      }
      if (fired) springOccSite(host, site);
    } else {
      OCC_AFTERMATHS[def.aftermath?.kind ?? '']?.drive?.(host, site, dt);
    }
  }
}

// --- Core trigger kinds -------------------------------------------------------

// DWELL — the debut's grammar: seconds bank while a hero stands inside the
// hearing radius ("the abyssals hear the footsteps at the surface"). The
// bank HOLDS when you step away — what listens does not forget inside one
// visit; only leaving the zone (armed state never persists) fades the scent.
registerOccTrigger('dwell', (host, site, spec, dt) => {
  const r = spec.radius ?? OCC_CFG.radius;
  if (host.heroDist(site.x, site.y) <= r) site.bank += dt;
  return site.bank >= (spec.sec ?? OCC_CFG.dwellSec);
});

// PROXIMITY — the plate school: the first step inside springs it.
registerOccTrigger('proximity', (host, site, spec) =>
  host.heroDist(site.x, site.y) <= (spec.radius ?? OCC_CFG.radius));

// DISTURB — a body breaking nearby (the cache face's own urns included)
// rings it: popBrittle feeds the frame's ping ring world-side.
registerOccTrigger('disturb', (host, site, spec) =>
  host.disturbedNear(site.x, site.y, spec.radius ?? OCC_CFG.radius));

// --- Core aftermath: THE FIXTURE ----------------------------------------------

// The breached spot keeps pouring on the clock — the rift-pour grammar
// verbatim (arm on the first beat, jittered cadence, zone-wide live cap on
// the born tag, small batches), kin minted at the LIVE zone level so the
// Quickening's surge anchors the pour for free (probe rig F).
registerOccAftermath('fixture', {
  establish(_host, site) {
    site.pourAt = 0; // arm on the first driven beat — never instant
  },
  drive(host, site) {
    const def = site.def;
    if (!def) return;
    const P = { ...OCC_CFG.pour, ...(def.aftermath?.pour ?? {}) };
    if (site.pourAt === 0) {
      site.pourAt = host.timeOf() + host.dice(P.every[0], P.every[1]);
      return;
    }
    if (host.timeOf() < site.pourAt) return;
    site.pourAt = host.timeOf() + host.dice(P.every[0], P.every[1]);
    const tag = P.tag ?? OCC_CFG.bornTag;
    const born = host.tagCount(tag);
    if (born >= P.cap) return;
    const n = Math.min(host.diceInt(P.batch[0], P.batch[1]), P.cap - born);
    if (n <= 0) return;
    if (host.pour(P, site.x, site.y, P.radius, n) > 0) {
      host.flash(site.x, site.y, 50, def.accent ?? OCC_CFG.accent);
    }
  },
});

// --- THE TENANT REGISTRANT ----------------------------------------------------

// The occurrence door into the world: a TenantRow `{ kind: 'occurrence',
// weight, params: { id, face? } }` on any court table. THE ORDER OF THIS
// HANDLER IS THE DOCTRINE: the visible face delegates FIRST with the fork
// stream untouched (so the court is byte-identical to a plain court of that
// face — rig A pins it), then the trigger records with zero draws and zero
// dress. An unknown occurrence id still seats the face (the court stays a
// court); only the trigger is skipped, warned once.
registerTenantKind('occurrence', (ctx: GenCtx, def, grid, cm, rng, kd, row: TenantRow) => {
  const p = row.params as { id?: string; face?: string } | undefined;
  const od = typeof p?.id === 'string' ? OCCURRENCES[p.id] : undefined;
  if (!od) {
    warnOnce(`row:${String(p?.id)}`,
      p?.id === undefined
        ? `an occurrence row names no id (params.id) — seating the bare face`
        : `occurrence row names unregistered '${String(p.id)}' — seating the bare face`);
  }
  const face = p?.face ?? od?.face ?? OCC_CFG.face;
  const handler = tenantKindOf(face);
  if (handler) handler(ctx, def, grid, cm, rng, kd, row);
  else warnOnce(`face:${face}`, `occurrence face '${face}' is no registered tenant kind — the ring stands bare`);
  if (!od || !cm.interior) return;
  recordMintedOccurrence(ctx, def.id, {
    id: od.id, x: cm.interior.x, y: cm.interior.y,
    floorR: cm.r * (kd.ringInner ?? 0.6) * 0.9,
  });
});
