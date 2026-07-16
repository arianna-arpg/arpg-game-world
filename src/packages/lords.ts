// ---------------------------------------------------------------------------
// THE LORDS BELOW — the Underworld's ruling pool, as an open registry.
//
// The Underworld is not a dungeon; it is a COUNTRY AT WAR, and these are the
// belligerents. Each lord is one declarative row: a banner (color + sigil), a
// creed, a WAR TEMPER (the dials the territory sim runs on — push, hold,
// opportunism, wrath — the revolving-door dynamic is emergent from these, not
// scripted), a grafted HOST faction, an apex body and a front-marshal, the
// incursion flavors it favors when it strikes the surface, and the seat it
// rules from. A run ROLLS a handful of lords from this pool (seeded, manifest-
// locked), so every run's hell is a different war: which thrones stand, which
// tempers collide, who strangles whom — rolled once, then simulated live.
//
// Pure data leaf (no engine imports) — the war overlay, the package def, the
// map, and the announcements all read lords through lordDef()/LORDS_POOL. A
// ninth lord is one registerLord() row: give it a temper and a host and every
// fabric — territory, fronts, manifestation, strikes, bulletins — fields it
// with zero engine edits. The pool being LARGER than the rolled seat count is
// the point: RUN VARIETY. The rolled lords are EVERLASTING within their run —
// ephemeral, eternal, never eliminated, never replaced (cast one down and it
// regathers); the unrolled simply wait for another world.
// ---------------------------------------------------------------------------

/** The war-personality dials the territory sim reads. All 0..1. The ETERNAL
 *  STRUGGLE is these dials disagreeing: a high-push lord thins its own rear
 *  as it advances (attack strength is MOVED forward, never minted), a high-
 *  opportunism lord floods the vacuum it left, and the displaced power pushes
 *  somewhere else in turn — the revolving door, from four numbers. */
export interface LordTemper {
  /** How hard fronts advance (attack-flow rate at hostile borders). */
  push: number;
  /** Garrison stickiness — a defense multiplier on this lord's cells. */
  hold: number;
  /** Extra push against WEAK borders — the vacuum-feeder dial. */
  opportunism: number;
  /** Surface-strike appetite: attribution weight when an incursion ignites. */
  wrath: number;
  /** War-tide swing size for this lord's fronts (default WAR_CFG.tideAmp) —
   *  a patient lord surges seldom but enormously (Ozrimoth). */
  tideAmp?: number;
  /** Chance-scale for BEHIND-THE-LINES enclave seeding (a rift-lord's front
   *  ignores adjacency — Vethriss). 0/undefined = never. */
  deepStrike?: number;
}

export interface UnderworldLordDef {
  id: string;
  /** Full style: 'Surtash, the Pyre Sovereign'. */
  name: string;
  /** Bulletin handle: 'Surtash'. */
  short: string;
  epithet: string;
  /** The one-line doctrine the UI shows — what this lord WANTS. */
  creed: string;
  /** Banner color: map wash, front arrows, epicenter rings, sigil tint. */
  color: string;
  /** One glyph — the map seat + front badge. Keep it one text glyph (SVG). */
  sigil: string;
  /** The grafted HOST faction id (FactionSpec registered by the package). */
  faction: string;
  temper: LordTemper;
  /** Apex body def id — the lord's MANIFESTATION: it holds court in sanctum
   *  ground the player walks into (never a minted set-piece zone), and being
   *  cast down only collapses the lord's power for a while. */
  lord: string;
  /** Front-marshal def id — leads pushes at contested ground; killable to
   *  collapse a local front (which heals). */
  marshal: string;
  /** Preferred incursion flavors (InvasionType ids) when this lord strikes —
   *  weighted roll among these; unknown ids are skipped at attribution. */
  strikes: { type: string; weight: number }[];
  /** The seat of power: a FIELD ANCHOR the lord's influence wells around —
   *  a name on the map, never a zone. The throne is wherever the lord
   *  stands, and it stands where you walked in. */
  throne: { name: string };
  /** Conquest-bulletin verbs, %z = zone name (data-driven flavor):
   *  take = this lord seizes ground; fall = this lord's ground is lost. */
  deeds: { take: string; fall: string };
}

const LORDS: Record<string, UnderworldLordDef> = {};

export function registerLord(def: UnderworldLordDef): void {
  if (LORDS[def.id]) console.warn(`[lords] re-registering '${def.id}' — overriding`);
  LORDS[def.id] = def;
}

export function lordDef(id: string): UnderworldLordDef | undefined { return LORDS[id]; }
export function lordIds(): string[] { return Object.keys(LORDS); }
export function allLords(): UnderworldLordDef[] { return Object.values(LORDS); }

/** The faction → lord reverse read (host_surtash → surtash). */
export function lordOfFaction(factionId: string): UnderworldLordDef | undefined {
  return Object.values(LORDS).find(l => l.faction === factionId);
}
