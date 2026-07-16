// ---------------------------------------------------------------------------
// FACTION TRAITS — each faction's TEXTURE, as data.
//
// The same overlays (invasion, warlord, events) drive every faction, but this
// table makes them FEEL different. A roamer like the goblins marches its wars
// from anywhere it holds; the undead are ROOTED — their warbands, events, and
// warlord all stem from their grave biome, barely venturing out. The demons
// are rift-born and aggressive but seat their tyrant at home. Adding the next
// faction's texture is one row here — the overlays never change.
//
// Pure data + tiny pure helpers; the overlays import these (one-way leaf).
// ---------------------------------------------------------------------------

import { FACTIONS } from '../data/monsters';
import type { TemperId } from '../data/monsters';
import type { ZoneDef } from '../data/zones';

/** Display name without the leading article ("Goblin Warband", not "the …") —
 *  the one place HUD/map strings shorten a faction id. */
export function factionShortName(f: string): string {
  return (FACTIONS[f]?.name ?? f).replace(/^the /, '');
}

export type WarlordHome = 'capital' | 'origin';

export interface FactionTraits {
  /** Appetite to march. 1 = roams freely; ~0.15 = rooted. Scales invasion chance. */
  roaming: number;
  /** Extra invasion-chance multiplier (demons are rift-aggressive at 1.6). */
  aggression: number;
  /** 'capital' = throne drifts to the strongest hold (roamers). 'origin' = the
   *  throne seats only on the faction's home ground. */
  warlordHome: WarlordHome;
  /** Authored home zone id (rooted factions). */
  originZone?: string;
  /** Biome tag this faction reads as home (matches ZoneDef.biome). */
  homeBiome?: string;
  /** Node-distance from home within which it stages zone events (undefined =
   *  anywhere it holds — roamers). */
  eventRange?: number;
  /** SPAWN CONTEXTS this faction may appear in (omitted = `['baseline']`). A
   *  generalized gate on WHERE a faction is allowed to be fielded: 'baseline' =
   *  ordinary procedural generation (zone packs, contests, war zones, biome
   *  patron, garrisons); 'crusade' = eligible to lead / fill a Crusade. A faction
   *  that lists 'crusade' but NOT 'baseline' (the dedicated zealots) is summoned
   *  ONLY by a Crusade and never leaks into normal generation. */
  contexts?: string[];
  /** DEATH-ALIGNED: this faction's corpses/summons/deaths feed the corpse-tide
   *  systems (the Deadwake's accrual reads this, never a faction literal — a
   *  future lich cult or wraith host joins the loop with one flag). */
  deathAligned?: boolean;
  /** DISPERSAL TEMPER default for this faction's bodies (MonsterDef.temper
   *  overrides per def; absent everywhere = 'wary'). How the faction behaves
   *  when a disturbance that drew it (an extraction, a swarm event) ENDS:
   *  skittish scatters home even under fire; wary leaves unless struck;
   *  territorial hardens into a lingering expedition before it goes. */
  temper?: TemperId;
}

export const DEFAULT_TRAITS: FactionTraits = { roaming: 1, aggression: 1, warlordHome: 'capital' };

/** Contexts assumed when a faction declares none — present in ordinary world gen. */
const DEFAULT_CONTEXTS = ['baseline'];

export const FACTION_TRAITS: Record<string, FactionTraits> = {
  // The mortal & beast war-hosts are baseline natives that can ALSO be raised
  // into a Crusade (Warbands leading the vanguard). Demons keep their own event.
  goblin: { roaming: 1.0, aggression: 1.1, warlordHome: 'capital', contexts: ['baseline', 'crusade'], temper: 'territorial' },
  gnoll: { roaming: 0.9, aggression: 1.0, warlordHome: 'capital', contexts: ['baseline', 'crusade'], temper: 'territorial' },
  wild: { roaming: 0.7, aggression: 0.8, warlordHome: 'capital', contexts: ['baseline', 'crusade'], temper: 'skittish' },
  elemental: { roaming: 0.55, aggression: 0.8, warlordHome: 'capital', contexts: ['baseline', 'crusade', 'fractures'] },
  sylvan: { roaming: 0.35, aggression: 0.6, warlordHome: 'origin', homeBiome: 'grove', eventRange: 160, contexts: ['baseline', 'crusade'], temper: 'territorial' },
  // Rooted factions home on their BIOME (the sylvan pattern): with the static
  // web cut to town + hub there is no authored graveyard/rift to originZone —
  // the undead throne on whatever grave-biome ground the run mints, the Legion
  // on its rifts. (originZone stays a valid lever for future authored ground.)
  undead: { roaming: 0.18, aggression: 0.5, warlordHome: 'origin', homeBiome: 'grave', eventRange: 150, contexts: ['baseline', 'crusade'], deathAligned: true },
  demon: { roaming: 0.85, aggression: 1.6, warlordHome: 'origin', homeBiome: 'rift', eventRange: 240, contexts: ['baseline', 'fractures'], temper: 'territorial' },
  // The Deep — marine-only (contexts:['marine'], NOT baseline), so it never seeds
  // ordinary war/territory; it appears purely via the marine tilesets' pack tables.
  // Its DROWNED COURT wing (the sunken nobility) keeps the same door — and the
  // faction stays CROWNLESS in WARLORD_OF (the chitin/sarcophate precedent):
  // the Tidebound Regent is the Wraithsail's flagship boss, boarded at sea,
  // never a marching warlord. The sea does not invade; it ARRIVES.
  deep: { roaming: 0.3, aggression: 1.0, warlordHome: 'origin', homeBiome: 'deepsea', contexts: ['marine'], temper: 'skittish' },
  // The Horned Tribes — highland raiders: they march far and gladly (the
  // gnolls' allies on the winter roads), throne wherever the strongest holds.
  beastkin: { roaming: 0.95, aggression: 1.1, warlordHome: 'capital', contexts: ['baseline', 'crusade'], temper: 'territorial' },
  // The Hollowborn — interred iron: it barely marches (armor stands its
  // ground), throning wherever it was buried.
  hollowborn: { roaming: 0.35, aggression: 1.0, warlordHome: 'origin', temper: 'territorial' },
  // The Chattel — the field country's own trouble: herds range, but home
  // is the open grass.
  chattel: { roaming: 0.9, aggression: 0.9, warlordHome: 'origin', homeBiome: 'field', temper: 'territorial' },
  // The Starfall Court — event-native (contexts:['starfall']): it exists only
  // under the shower; it marches nowhere and seeds no wars.
  starfall: { roaming: 0.2, aggression: 1.1, warlordHome: 'origin', contexts: ['starfall'], temper: 'skittish' },
  // RESERVED KIN (data/monsters.ts RESERVED_KIN — authored, doorless): each
  // context names the mechanic that will one day field it; nothing registers
  // these contexts yet, and the validator holds the bar.
  smoulder: { roaming: 0.6, aggression: 1.3, warlordHome: 'origin', contexts: ['burnfields'], temper: 'territorial' },
  magpie: { roaming: 1.1, aggression: 1.0, warlordHome: 'capital', contexts: ['magpie_court'], temper: 'skittish' },
  // The Glut — rooted meat: it barely marches, it ACCRETES. Wars stem only
  // from its own dripping halls.
  flesh: { roaming: 0.2, aggression: 0.7, warlordHome: 'origin', homeBiome: 'flesh', eventRange: 150, contexts: ['baseline'] },
  // The Night Court — patient predators: they range at their own pace, but
  // the throne never leaves the gloam — the Countess seats only under the
  // haunted wood's crooked roof (its patron since the wood learned whose
  // teeth run it), and her wars ride OUT from under it. Rich feeding
  // elsewhere is an ESTATE (the Long Night's grounds), never a capital.
  nightkin: { roaming: 0.6, aggression: 1.2, warlordHome: 'origin', homeBiome: 'gloamwood', eventRange: 170, contexts: ['baseline', 'crusade'] },
  // The Junglekin — the strangling green's tribes: they barely leave the
  // treeline (the walls ARE the argument) and never cede a lane of it.
  junglekin: { roaming: 0.25, aggression: 1.0, warlordHome: 'origin', homeBiome: 'jungle', eventRange: 160, contexts: ['baseline'], temper: 'territorial' },
  // The Sirocco Court — the deep desert's own: half-roaming (the court walks
  // its country), territorial about every yard of it.
  sirocco: { roaming: 0.45, aggression: 0.95, warlordHome: 'origin', homeBiome: 'desert', eventRange: 150, contexts: ['baseline'], temper: 'territorial' },
  // The Chitin — the Seethe under the deep sand: broods rooted in their
  // warren-country, foragers ranging far past it. QUEENLESS: no WARLORD_OF
  // crown (the invasion gate never opens — no warbands) and no 'crusade'
  // context; the roost defends its ground, and its only map-scale march is
  // the Swarming. Their fight is SOURCE WARFARE — kill the wells or drown.
  chitin: { roaming: 0.85, aggression: 1.05, warlordHome: 'origin', homeBiome: 'desert', eventRange: 170, contexts: ['baseline'], temper: 'territorial' },
  // The Emberkin — the cinder country's tribe: rooted vent-tenders who barely
  // march but never, ever cede the calderas (the volcanic biome finally has a
  // native banner; its long war is with the Legion treating the fires as a door).
  emberkin: { roaming: 0.3, aggression: 0.9, warlordHome: 'origin', homeBiome: 'volcanic', eventRange: 170, contexts: ['baseline'], temper: 'territorial' },
  // The Caulborn — the membrane does the marching: the organism barely
  // roams as BODIES; it spreads as GROUND (the creep fabric) and defends
  // what it has skinned. Its long war is with the Legion — hell's landlord
  // versus the thing remaking hell's tissue.
  caulborn: { roaming: 0.15, aggression: 0.8, warlordHome: 'origin', homeBiome: 'caul', eventRange: 150, contexts: ['baseline'], temper: 'territorial' },
  // The Rimebound — the Winter Court: patron of BOTH cold biomes (tundra +
  // taiga, biomes.ts), throned on the open tundra (the court's high seat;
  // the taiga is its wooded march). Half-rooted — the court keeps its cold
  // country and holds every yard of it; the map-scale march it dreams of
  // (Deepwinter's creeping front) is the overlay's, not the invasion gate's.
  rimebound: { roaming: 0.4, aggression: 0.9, warlordHome: 'origin', homeBiome: 'tundra', eventRange: 170, contexts: ['baseline'], temper: 'territorial' },
  // The Sand Sarcophate — the tomb-dynasty UNDER the desert: the most rooted
  // banner in the game (its country is downstairs — the Sepulcher Sands the
  // deep dunes conceal), CROWNLESS by design (no WARLORD_OF seat: the Regent
  // is the Unsealing's tomb boss, never a marching warlord — the chitin
  // precedent, so the invasion gate never opens), and DEATH-ALIGNED: every
  // interred kill feeds the Deadwake's corpse-tide exactly as the graveland
  // dead do. What little it wants of the surface it wants back.
  sarcophate: { roaming: 0.12, aggression: 0.7, warlordHome: 'origin', homeBiome: 'desert', eventRange: 150, contexts: ['baseline'], deathAligned: true, temper: 'territorial' },
};

/** Does this faction feed the corpse-tide loops (Deadwake accrual)? Reads the
 *  trait row — never compare a faction id literal for death-alignment. */
export function isDeathAligned(faction: string | undefined): boolean {
  return !!(faction && FACTION_TRAITS[faction]?.deathAligned);
}

/** This faction's dispersal-temper DEFAULT (undefined = no faction stance;
 *  the resolver in data/monsters.ts `temperOf` falls through to 'wary'). */
export function factionTemper(faction: string | undefined): TemperId | undefined {
  return faction ? FACTION_TRAITS[faction]?.temper : undefined;
}

export function traitsOf(faction: string): FactionTraits {
  return FACTION_TRAITS[faction] ?? DEFAULT_TRAITS;
}

/** May this faction be fielded in the given spawn CONTEXT? Absent `contexts` ⇒
 *  baseline-only (every built-in faction's prior behavior is unchanged). The one
 *  generalized switch that keeps a crusade-only faction out of ordinary gen. */
export function factionAllowsContext(faction: string, ctx: string): boolean {
  return (traitsOf(faction).contexts ?? DEFAULT_CONTEXTS).includes(ctx);
}

/** Every faction eligible to be fielded in `ctx` (used to build a Crusade's
 *  ignition pool from data, never a hardcoded id list). */
export function factionsInContext(ctx: string): string[] {
  return Object.keys(FACTION_TRAITS).filter(f => factionAllowsContext(f, ctx));
}

/** Is `zone` valid WAR ORIGIN ground for `faction`? Roamers march from anywhere;
 *  rooted factions only from their authored origin zone or a home-biome zone —
 *  and never from ground they merely CONQUERED (a frontier seat ≠ home). */
export function isWarOrigin(faction: string, zone: ZoneDef, conqueredBy: string | null): boolean {
  const t = traitsOf(faction);
  if (t.warlordHome !== 'origin') return true;
  if (conqueredBy === faction) return false;
  if (t.originZone && zone.id === t.originZone) return true;
  if (t.homeBiome && zone.biome === t.homeBiome) return true;
  return false;
}

/** Node-distance from a faction's home anchor to `zone`. 0 (always-near) for
 *  roamers, or when no home ground is charted yet (don't strand them).
 *  An authored originZone anchors exactly; a biome-homed faction (undead on
 *  grave ground, the Legion on rifts, sylvans in groves) anchors to its
 *  NEAREST charted home-biome zone — so eventRange keeps meaning something
 *  now that the static web is just town + hub and homes are minted. */
export function distFromHome(faction: string, zone: ZoneDef, byId: Record<string, ZoneDef>): number {
  const t = traitsOf(faction);
  if (t.originZone) {
    const home = byId[t.originZone];
    return home ? Math.hypot(zone.map.x - home.map.x, zone.map.y - home.map.y) : 0;
  }
  if (t.homeBiome) {
    let best = Infinity;
    for (const z of Object.values(byId)) {
      if (z.caveDepth != null || z.biome !== t.homeBiome) continue;
      const d = Math.hypot(zone.map.x - z.map.x, zone.map.y - z.map.y);
      if (d < best) best = d;
    }
    return best === Infinity ? 0 : best;
  }
  return 0;
}
