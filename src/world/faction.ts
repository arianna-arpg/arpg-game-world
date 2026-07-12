// ---------------------------------------------------------------------------
// FACTION TERRITORY — who holds the ground, as an evolving field.
//
// Every charted node carries a sparse bag of per-faction influence (0..100).
// Three forces move it each fixed step:
//   1. CENSUS — the faction whose monsters are alive in the zone you stand in
//      gains ground there; thin them out and their hold slips. This is the
//      hook the player pulls on: kill goblins and goblin power here falls.
//   2. DIFFUSION — influence bleeds along real roads to neighbouring nodes, so
//      a strong faction spreads outward and a frontier shifts over time.
//   3. HOMEOSTASIS — a homeland pulls back to a standing baseline (so a region
//      stays its faction's even while you are away), while an interloper
//      squatting on ground that isn't theirs slowly fades. A teeming zone the
//      player has lit up spikes past the baseline and floods its neighbours —
//      power "explodes" — then cools again once the pressure is off.
//
// A node is OWNED when one faction leads past a threshold; CONTESTED when two
// mutually-hostile factions both hold a stake (so both spawn and tear into each
// other); and CONQUERED when a faction's hold crosses the high-water line — the
// zone's POPULATION then flips to that faction (see `conquered`), so a place you
// knew as undead can re-open flying goblin colours. That flip is what an
// invasion (see invasion.ts, which pours influence in) is fighting to achieve.
// Pure float math, no RNG.
// ---------------------------------------------------------------------------

import { clamp } from '../core/math';
import { factionStance, MONSTERS } from '../data/monsters';
import type { ZoneDef } from '../data/zones';
import { patronFaction } from './biomes';
import { factionAllowed } from './zonePolicy';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from './overlay';
import { FACTION_COLORS, FALLBACK_FACTION_COLOR } from './palette';
import { factionAllowsContext } from './traits';

export const OWN_THRESHOLD = 55;
export const CONTEST_THRESHOLD = 30;

const DIFFUSE = 0.16;          // share of the gradient that flows along roads per step
const DECAY = 0.05;            // fraction an out-of-place faction sheds per second
const CENSUS_GAIN = 10;        // influence moved toward the live count per second
const CENSUS_TARGET_K = 9;     // each living enemy ≈ this much target influence
const BASE_NATIVE = 62;        // a faction's standing hold over its own homeland
const REGEN_NATIVE = 4;        // per second a homeland relaxes back to its baseline
const INF_CAP = 100;
const OWN_MARGIN = 10;         // lead over the runner-up needed to "own"
const CONQUER_THRESHOLD = 78;  // hold past this and the zone FLIPS to your side
const STEP = 0.5;

/** factionId -> influence, sparse (entries below ~0.5 are pruned). */
type NodeInfluence = Record<string, number>;

export interface FactionOwner {
  faction: string | null;
  power: number;
  owned: boolean;
  contested: boolean;
}

export class FactionField implements WorldOverlay {
  readonly id = 'faction' as const;
  readonly mapLabel = 'Territory';
  private field = new Map<string, NodeInfluence>();
  private acc = 0;
  /** Zones taken from their original holders: zoneId -> current ruler. A
   *  conquered zone's homeland baseline (and so its spawns) follow this. */
  private conquered = new Map<string, string>();
  /** War bulletins (a zone changed hands) drained by the engine each frame. */
  readonly conquests: { zoneId: string; faction: string; reclaimed: boolean }[] = [];

  update(dt: number, view: OverlayView): void {
    for (const z of view.nodes) this.ensure(z);
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.step(view);
    }
  }

  onNodeCharted(zone: ZoneDef): void {
    this.ensure(zone);
  }

  affectSpawns(zone: ZoneDef): SpawnBias {
    this.ensure(zone);
    const rivals = this.contestants(zone.id);
    if (rivals.length >= 2) {
      // Contested: stage both rosters, tilt the table toward the dominant.
      return { countMul: 1.1, factionMul: { [rivals[0]]: 1.4 }, injectFactions: rivals };
    }
    const o = this.owner(zone.id);
    if (o.faction && o.power >= CONTEST_THRESHOLD) {
      // A single holder colours its native packs a little more strongly.
      return { countMul: 1, factionMul: { [o.faction]: 1.3 }, injectFactions: [] };
    }
    return NO_BIAS;
  }

  /** Who holds this node, and is it owned outright / contested. */
  owner(zoneId: string): FactionOwner {
    const inf = this.field.get(zoneId) ?? {};
    let best: string | null = null, bw = 0, second = 0;
    for (const [f, v] of Object.entries(inf)) {
      if (v > bw) { second = bw; bw = v; best = f; }
      else if (v > second) second = v;
    }
    const owned = best !== null && bw >= OWN_THRESHOLD && (bw - second) >= OWN_MARGIN;
    return { faction: best, power: bw, owned, contested: this.contestants(zoneId).length >= 2 };
  }

  /**
   * Factions staking this node, dominant first. Returns the leader plus every
   * other over-threshold faction HOSTILE to it; an empty array means no real
   * contest (one holder, or only allies share the ground).
   */
  contestants(zoneId: string): string[] {
    const inf = this.field.get(zoneId) ?? {};
    const over = Object.entries(inf)
      .filter(([, v]) => v >= CONTEST_THRESHOLD)
      .sort((a, b) => b[1] - a[1])
      .map(([f]) => f);
    if (over.length < 2) return [];
    const top = over[0];
    const rivals = over.filter(f => f === top || factionStance(top, f) === 'hostile');
    return rivals.length >= 2 ? rivals : [];
  }

  /** Pour influence into a node for a faction (an invasion's war host calls
   *  this as it bears down). The node must already exist in the field. */
  reinforce(zoneId: string, faction: string, amount: number): void {
    const inf = this.field.get(zoneId);
    if (!inf) return;
    inf[faction] = clamp((inf[faction] ?? 0) + amount, 0, INF_CAP);
  }

  /** Drain a faction's hold on a node (a slain warlord's grip loosening).
   *  Just a named negative reinforce — the 0-clamp does the rest. */
  bleed(zoneId: string, faction: string, amount: number): void {
    this.reinforce(zoneId, faction, -amount);
  }

  /** The faction now ruling this zone if it was taken from its original
   *  holders, else null (it still belongs to whoever its packs name). */
  conquerorOf(zoneId: string): string | null {
    return this.conquered.get(zoneId) ?? null;
  }

  /** WORLDSTATE: territory IS the world's memory — the per-node influence
   *  bags and the conquest ledger both persist (pure JSON already). */
  snapshot(): unknown {
    return {
      field: Object.fromEntries([...this.field].map(([id, inf]) => [id, { ...inf }])),
      conquered: Object.fromEntries(this.conquered),
    };
  }

  /** Rebuild tolerantly: non-finite influence entries drop; a stale zone id
   *  (a scrubbed event zone) just sits inert until pruned by disuse — the
   *  field only ever steps view.nodes, so it can never act on a ghost. */
  restore(snap: unknown): void {
    const s = snap as { field?: Record<string, unknown>; conquered?: Record<string, unknown> } | null;
    if (!s || typeof s !== 'object') return;
    if (s.field && typeof s.field === 'object') {
      this.field.clear();
      for (const [id, raw] of Object.entries(s.field)) {
        if (!raw || typeof raw !== 'object') continue;
        const inf: NodeInfluence = {};
        for (const [f, v] of Object.entries(raw as Record<string, unknown>)) {
          if (typeof v === 'number' && Number.isFinite(v)) inf[f] = clamp(v, 0, INF_CAP);
        }
        this.field.set(id, inf);
      }
    }
    if (s.conquered && typeof s.conquered === 'object') {
      this.conquered.clear();
      for (const [id, f] of Object.entries(s.conquered)) {
        if (typeof f === 'string') this.conquered.set(id, f);
      }
    }
  }

  /** Undo every conquest a faction made — its taken zones revert to their
   *  original holders, who grow back into them via homeostasis. Called when a
   *  faction's warlord falls, so a wiped-out frontier always has a way home. */
  releaseConquests(faction: string): void {
    for (const [zoneId, ruler] of [...this.conquered]) {
      if (ruler === faction) this.conquered.delete(zoneId);
    }
  }

  renderMap(nodes: ZoneDef[]): MapLayer {
    let under = '', over = '';
    for (const z of nodes) {
      const o = this.owner(z.id);
      if (!o.faction || o.power < CONTEST_THRESHOLD) continue;
      const col = FACTION_COLORS[o.faction] ?? FALLBACK_FACTION_COLOR;
      const r = 14 + 16 * clamp(o.power / INF_CAP, 0, 1);
      const op = o.owned ? 0.32 : 0.16;
      under += `<circle cx="${z.map.x}" cy="${z.map.y}" r="${r.toFixed(1)}" `
        + `fill="${col}" fill-opacity="${op}"/>`;
      if (o.contested) {
        const rivals = this.contestants(z.id);
        const cc = FACTION_COLORS[rivals[1]] ?? FALLBACK_FACTION_COLOR;
        over += `<circle cx="${z.map.x}" cy="${z.map.y}" r="${(r + 3).toFixed(1)}" `
          + `fill="none" stroke="${cc}" stroke-width="1.5" stroke-dasharray="3 3"/>`
          + `<text x="${z.map.x}" y="${(z.map.y - r - 4).toFixed(1)}" text-anchor="middle" `
          + `font-size="11" fill="#ff5a5a">⚔</text>`;
      }
    }
    return { under, over };
  }

  // ---- internals ----------------------------------------------------------

  private ensure(zone: ZoneDef): NodeInfluence {
    let inf = this.field.get(zone.id);
    if (inf) return inf;
    inf = {};
    this.field.set(zone.id, inf);
    // Sanctuaries hold no territory — they are neutral ground, always.
    if (zone.objective.kind === 'safe') return inf;
    // Only BASELINE factions seed territory. A non-baseline faction (a conclave-only
    // Occult/Eldritch, a fractures-only Abyssal) is event/realm-driven — it never
    // holds ground in the homeland/contest sim, so an Incursion epicenter that wires
    // in never bleeds faction influence into its neighbours.
    const native = this.tableNative(zone);
    if (native && factionAllowsContext(native, 'baseline')) inf[native] = BASE_NATIVE;
    // A zone that spawns already at war starts as a live contest.
    if (zone.factionWar) {
      for (const f of zone.factionWar) inf[f] = Math.max(inf[f] ?? 0, CONTEST_THRESHOLD + 10);
    }
    return inf;
  }

  /** A zone's EFFECTIVE homeland faction: its conqueror if it has fallen, else
   *  the faction its own pack table names. Drives homeostasis and spawns. */
  private nativeFaction(zone: ZoneDef): string | null {
    const conq = this.conquered.get(zone.id);
    if (conq) return conq;
    // A non-baseline native (Eldritch/Occult/Abyssal) is NOT a homeland — no
    // homeostasis pull, so its influence (if a live census ever adds any) fades as
    // an interloper instead of regrowing. Keeps event/realm factions off the map.
    const t = this.tableNative(zone);
    return t && factionAllowsContext(t, 'baseline') ? t : null;
  }

  /** The faction with the heaviest presence in a zone's ORIGINAL pack table. A
   *  faction the zone's biome DENIES (zonePolicy) never seeds as native — so a
   *  marine zone won't breed goblins even if its authored table lists them. */
  private tableNative(zone: ZoneDef): string | null {
    const tally: Record<string, number> = {};
    for (const e of zone.packs?.table ?? []) {
      const f = MONSTERS[e.id]?.faction;
      if (f && factionAllowed(f, zone)) tally[f] = (tally[f] ?? 0) + e.weight;
    }
    let best: string | null = null, bw = 0;
    for (const [f, w] of Object.entries(tally)) if (w > bw) { bw = w; best = f; }
    if (best) return best;
    // When the pack table names no (allowed) faction, the land's biome decides who
    // it breeds — so a biome region seeds its patron, unless the biome denies it.
    const pat = patronFaction(zone.biome);
    return pat && factionAllowed(pat, zone) ? pat : null;
  }

  private step(view: OverlayView): void {
    const census = view.census;
    const curId = view.currentZoneId;

    // 1. Diffusion over real roads (double-buffered: read field, write delta).
    //    Safe zones neither hold nor transmit influence — they stay neutral.
    const delta = new Map<string, NodeInfluence>();
    for (const z of view.nodes) {
      if (z.objective.kind === 'safe') continue;
      const inf = this.field.get(z.id);
      if (!inf) continue;
      const neighbours: string[] = [];
      for (const e of z.exits) {
        const nb = view.byId[e.to];
        if (e.to !== '?' && nb && nb.objective.kind !== 'safe') neighbours.push(e.to);
      }
      const deg = neighbours.length;
      if (deg === 0) continue;
      const facs = new Set<string>(Object.keys(inf));
      for (const nb of neighbours) for (const f of Object.keys(this.field.get(nb) ?? {})) facs.add(f);
      for (const f of facs) {
        const here = inf[f] ?? 0;
        let grad = 0;
        for (const nb of neighbours) grad += ((this.field.get(nb) ?? {})[f] ?? 0) - here;
        const d = DIFFUSE * STEP * grad / deg;
        if (d !== 0) {
          const dn = delta.get(z.id) ?? {};
          dn[f] = (dn[f] ?? 0) + d;
          delta.set(z.id, dn);
        }
      }
    }

    // 2. Apply diffusion, then the three forces: a live census in the zone you
    //    stand in, a homeland's pull back to its baseline, and the slow fade of
    //    a faction squatting on ground that isn't its own.
    for (const z of view.nodes) {
      if (z.objective.kind === 'safe') continue;
      const inf = this.field.get(z.id);
      if (!inf) continue;
      const native = this.nativeFaction(z);
      const isCurrent = z.id === curId;
      const dn = delta.get(z.id);
      const facs = new Set<string>([...Object.keys(inf), ...(dn ? Object.keys(dn) : [])]);
      if (native) facs.add(native);
      if (isCurrent) for (const f of Object.keys(census)) facs.add(f);
      for (const f of facs) {
        let v = (inf[f] ?? 0) + (dn?.[f] ?? 0);
        if (isCurrent && (census[f] ?? 0) > 0) {
          // The faction whose monsters are alive here climbs toward (or, as you
          // cull them, falls toward) the live headcount.
          const target = clamp(census[f] * CENSUS_TARGET_K, 0, INF_CAP);
          v += clamp(target - v, -CENSUS_GAIN * STEP, CENSUS_GAIN * STEP);
        } else if (f === native) {
          // The homeland relaxes back to its standing hold.
          v += clamp(BASE_NATIVE - v, -REGEN_NATIVE * STEP, REGEN_NATIVE * STEP);
        } else {
          // An interloper's grip fades unless diffusion keeps feeding it.
          v *= 1 - DECAY * STEP;
        }
        v = clamp(v, 0, INF_CAP);
        if (v < 0.5) delete inf[f];
        else inf[f] = v;
      }
    }

    // 3. Conquest: whoever holds a node past the high-water line takes it. The
    //    zone's population follows, until the original owner (or a third power)
    //    drives them back out the same way.
    for (const z of view.nodes) {
      if (z.objective.kind === 'safe') continue;
      const inf = this.field.get(z.id);
      if (!inf) continue;
      let lead: string | null = null, lv = 0;
      for (const [f, v] of Object.entries(inf)) if (v > lv) { lv = v; lead = f; }
      if (!lead || lv < CONQUER_THRESHOLD) continue;
      // A non-baseline faction (an Incursion/realm native that a live census briefly
      // pushed past the line) never conquers nor fires a "reclaim" bulletin — it's
      // event-driven, not territorial. (Guards the SEAL: nativeFaction is null for it,
      // so the already-ruler check below would otherwise fall through to a reclaim.)
      if (!factionAllowsContext(lead, 'baseline')) continue;
      if (lead === this.nativeFaction(z)) continue; // already the ruler — nothing changes
      if (lead === this.tableNative(z)) {
        // The original holders have driven the occupier back out.
        this.conquered.delete(z.id);
        this.conquests.push({ zoneId: z.id, faction: lead, reclaimed: true });
      } else {
        this.conquered.set(z.id, lead);
        this.conquests.push({ zoneId: z.id, faction: lead, reclaimed: false });
      }
    }
  }
}
