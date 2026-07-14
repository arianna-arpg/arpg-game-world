// ---------------------------------------------------------------------------
// ROAMING WARLORD — the engine behind a faction's wars.
//
// When a faction grows strong enough (it OWNS several zones), it crowns a
// warlord in its strongest hold — its capital. While that warlord lives, the
// faction marches: its invasions are GATED on the warlord being alive. Walk
// into the capital and it is a boss fight; cut the warlord down and the
// faction's grip on the land loosens everywhere at once, its invasions fall
// quiet for a spell, and the frontier rebounds — the player's lever on which
// power rises and which recedes. The throne drifts with the front; if the
// faction stays strong, a new warlord rises once the mourning passes.
//
// This is the 4th WorldOverlay. It reads settled ownership from FactionField
// (so it ticks after it) and bleeds influence through it on a warlord's death.
// ---------------------------------------------------------------------------

import type { ZoneDef } from '../data/zones';
import type { FactionField } from './faction';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from './overlay';
import { FACTION_COLORS } from './palette';
import { traitsOf } from './traits';

export interface WarlordState {
  faction: string;
  /** The zone the warlord rules (re-derived each tick — it drifts with power). */
  capitalId: string;
  alive: boolean;
  /** While now < this, a fallen warlord's faction launches no invasions. */
  suppressUntil: number;
}

/** The champion each faction fields as its warlord (all real monster ids). */
export const WARLORD_OF: Record<string, string> = {
  goblin: 'goblin_chief',
  gnoll: 'gnoll_howler',
  sylvan: 'grove_singer',
  undead: 'lich_marshal',
  elemental: 'stone_sentinel',
  wild: 'alpha_stalker',
  demon: 'balor_warlord',
  beastkin: 'beastlord_khan',
  flesh: 'flesh_amalgam',
  fungal: 'amanita_sovereign', // the Bloom finally crowns (mycelia package roster)
  nightkin: 'vampire_countess',
  emberkin: 'emberkin_matriarch',
  junglekin: 'verdant_tyrant',
  sirocco: 'mirage_khagan',
};

const RISE_ZONES = 2;   // owned zones a faction needs to crown a warlord
const SUPPRESS = 90;    // seconds its invasions stay quiet after the warlord falls
const BLEED = 28;       // influence drained from every zone when it dies

export class WarlordField implements WorldOverlay {
  readonly id = 'warlord' as const;
  /** Transient BY DERIVATION: lords re-crown each tick from the (persisted)
   *  faction territory, so saving them would only duplicate that truth. */
  readonly persistence = 'transient' as const;
  readonly mapLabel = 'Warlords';
  readonly lords = new Map<string, WarlordState>();
  private faction: FactionField;

  constructor(faction: FactionField) {
    this.faction = faction;
  }

  update(_dt: number, view: OverlayView): void {
    // Tally each faction's owned zones, its strongest hold (the drifting
    // capital), AND its strongest HOME-GROUND hold (for rooted factions).
    const realm = new Map<string, {
      count: number; capital: string | null; power: number;
      originSeat: string | null; originPower: number;
    }>();
    for (const z of view.nodes) {
      if (z.objective.kind === 'safe') continue;
      const o = this.faction.owner(z.id);
      if (!o.faction || !o.owned) continue;
      const e = realm.get(o.faction)
        ?? { count: 0, capital: null, power: 0, originSeat: null, originPower: 0 };
      e.count++;
      // Boss zones add to strength but can't seat the throne — their own boss
      // owns it, so the warlord would have no killable body. Keep it fightable.
      if (z.objective.kind !== 'boss' && o.power > e.power) { e.power = o.power; e.capital = z.id; }
      // Rooted factions seat ONLY on native home ground (origin zone or home
      // biome), never on a conquered frontier hold.
      const t = traitsOf(o.faction);
      if (t.warlordHome === 'origin' && z.objective.kind !== 'boss'
        && this.faction.conquerorOf(z.id) === null
        && (z.id === t.originZone || (!!t.homeBiome && z.biome === t.homeBiome))
        && o.power > e.originPower) {
        e.originPower = o.power; e.originSeat = z.id;
      }
      realm.set(o.faction, e);
    }
    const now = view.time;
    const factions = new Set<string>([...realm.keys(), ...this.lords.keys()]);
    for (const f of factions) {
      const e = realm.get(f);
      const lord = this.lords.get(f);
      // Rooted factions seat ONLY on native home ground — no capital fallback.
      // With the static web cut to town + hub, a rooted faction may hold no
      // home-biome zone yet; it stays UNCROWNED until one mints rather than
      // throne on its strongest hold (early on that is the level-1 hub — a
      // Lich Marshal squatting the Wayfarer's Crossroads greeted new heroes).
      const seat = traitsOf(f).warlordHome === 'origin'
        ? (e?.originSeat ?? null)
        : (e?.capital ?? null);
      if (e && e.count >= RISE_ZONES && seat) {
        if (!lord) {
          this.lords.set(f, { faction: f, capitalId: seat, alive: true, suppressUntil: 0 });
        } else {
          lord.capitalId = seat;
          if (!lord.alive && now >= lord.suppressUntil) lord.alive = true; // a new warlord rises
        }
      } else if (lord && (lord.alive || now >= lord.suppressUntil)) {
        // No realm left to rule (and not mid-mourning) — the line dies out.
        this.lords.delete(f);
      }
    }
  }

  onNodeCharted(): void { /* warlords track ownership, not nodes */ }
  affectSpawns(): SpawnBias { return NO_BIAS; }

  /** A faction marches only behind a LIVING warlord. */
  canInvade(faction: string): boolean {
    const l = this.lords.get(faction);
    return !!(l && l.alive);
  }

  /** The living warlord whose capital is this zone, if any. */
  lordAt(zoneId: string): WarlordState | null {
    for (const l of this.lords.values()) if (l.alive && l.capitalId === zoneId) return l;
    return null;
  }

  bossId(faction: string): string | undefined {
    return WARLORD_OF[faction];
  }

  /** The warlord is slain: its faction falls quiet for a spell and its grip on
   *  the land loosens everywhere at once. */
  onWarlordKilled(faction: string, now: number, view: OverlayView): void {
    const l = this.lords.get(faction);
    if (l) { l.alive = false; l.suppressUntil = now + SUPPRESS; }
    // The lands it took rise up again — conquered zones revert to their old
    // holders, so a wiped-out frontier faction always has a way home.
    this.faction.releaseConquests(faction);
    for (const z of view.nodes) {
      if (z.objective.kind === 'safe') continue;
      this.faction.bleed(z.id, faction, BLEED);
    }
  }

  renderMap(nodes: ZoneDef[]): MapLayer {
    let over = '';
    for (const z of nodes) {
      const l = this.lordAt(z.id);
      if (!l) continue;
      // Deliberately GOLD when the faction has no colour: a crown is a crown.
      const col = FACTION_COLORS[l.faction] ?? '#ffd700';
      over += `<text x="${z.map.x}" y="${(z.map.y - 17).toFixed(1)}" text-anchor="middle" `
        + `font-size="14" fill="${col}" stroke="#0a0a0e" stroke-width="0.4">♛</text>`;
    }
    return { under: '', over };
  }
}
