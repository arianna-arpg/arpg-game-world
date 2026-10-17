import type {Actor} from './actor';
import type {ZoneDef} from '../data/zones';
import type {throngTravelProtected} from './throngEvolution';
import type {clingBurrowed} from './cling';
import type {normalizeBrain} from './brain';
import type {STATUS_DEFS} from './status';
import type {factionStance} from '../data/monsters';
import type {dist} from '../core/math';

/** Trusted live native source capabilities. No controller capture or default diplomacy. */
export interface NativeHostilitySources {
 readonly throngTravelProtected:typeof throngTravelProtected; readonly clingBurrowed:typeof clingBurrowed;
 readonly normalizeBrain:typeof normalizeBrain; readonly STATUS_DEFS:typeof STATUS_DEFS;
 readonly factionStance:typeof factionStance; readonly dist:typeof dist;
}
/** One actual staged population and its own sanctuary/tier context. */
export interface NativeHostilityHost {
 readonly actors:Actor[]; readonly zone:Pick<ZoneDef,'tiers'>;
 sanctuaryBlocksCombat(a:Actor,b:Actor):boolean; isPrey(a:Actor,b:Actor):boolean; hostileTo(a:Actor,b:Actor):boolean;
}

export function nativeHostileTo(host:Pick<NativeHostilityHost,'zone'|'sanctuaryBlocksCombat'|'isPrey'>,sources:NativeHostilitySources,a:Actor,b:Actor):boolean {
    if (host.sanctuaryBlocksCombat(a,b)) return false;
    if ((0, sources.throngTravelProtected)(b)) return false;
    // THE TIER LAW (engine/tiers.ts): layers share a screen, never a fight —
    // a deck body and a valley body cannot target, strike, or threaten each
    // other. Sitting in the ONE hostility gate, targeting, swings, threat
    // and projectiles all agree for free. (Shoving a body OFF its layer is
    // the honest way to bring a fight down — the rim fall in the push lane.)
    // EXCEPT under RIM DUELS (ZoneTiers.rimDuels, open exposure): cross-tier
    // hostility stands and SIGHT mediates — the butte walls' blocksSight
    // already confine the fights to rims and spans, which is the fantasy.
    if ((a.tier ?? 0) !== (b.tier ?? 0) && !host.zone.tiers?.rimDuels) return false;
    // THE GUISE (the possession seam, engine/possess.ts): a seat wearing a
    // body of faction F reads as KIN to team-enemy bodies of F while the
    // guise holds — ONE-directional in the one hostility gate (their
    // targeting, swings, threat and stray zones all pass the rider by; the
    // rider's own targeting asks the other direction and stays live). The
    // first harm the rider authors tears it for good (resolveHit).
    if (b.possession?.guiseFaction && !b.possession.guiseBroken
      && a.team === 'enemy' && a.faction === b.possession.guiseFaction) return false;
    // THE BURROW (the latch fabric, engine/cling.ts): a rider sunk INSIDE
    // the body it rides cannot be found BY that body — sitting in the one
    // hostility gate, the host's targeting, swings, novas and stray zones
    // all pass its own parasite by for free. ONE-directional like the
    // guise: the rider's teeth ask the other direction and stay live, and
    // every OTHER combatant still scrapes riders off normally. The host's
    // honest answer is its shake clock — the pop-out (clingRelease
    // 'shake') scatters the rider into a real vulnerability window.
    if (b.clingTo?.id === a.id && (0, sources.clingBurrowed)(b)) return false;
    if (a.team !== b.team) return true;
    // PREDATION (TargetSpec.prey): a hunter is hostile to its FOOD no matter
    // whose side the food nominally stands on — and it's ONE-directional:
    // the hare never wars back, it runs (MoraleSpec.skittish). Because this
    // sits in the one hostility gate, targeting, swings, and projectiles all
    // agree the wolf may eat.
    if (host.isPrey(a, b)) return true;
    // Faction grudges are LIVE wherever rivals share ground: a gnoll pack
    // that stumbles into the risen dead doesn't wait for a war banner.
    return !!(a.team === 'enemy'
      && a.faction && b.faction
      && (0, sources.factionStance)(a.faction, b.faction) === 'hostile');
  }

export function nativeIsPrey(sources:NativeHostilitySources,a:Actor,b:Actor):boolean {
    if (!a.brain || a === b || b.dead) return false;
    const prey = a.aiPrey ?? (0, sources.normalizeBrain)(a.brain).base.target?.prey;
    if (!prey || !prey.length) return false;
    if (b.defId === a.defId) return false;
    if (a.squadId !== undefined && b.squadId === a.squadId) return false;
    // THE SCENT LAW (StatusDef.smellsOfPrey — Scentcraft's mark): a body
    // wearing prey-scent is FOOD to anything that already hunts. The list's
    // CONTENTS stop mattering; its existence is the qualifier (a hunter's
    // nose, fooled). The kin guards above still hold — nothing eats its
    // own kind or its own squad, however it smells.
    if (b.statuses.some(s => sources.STATUS_DEFS[s.id]?.smellsOfPrey)) return true;
    return prey.some(p => b.tag === p || b.faction === p || b.defId === p);
  }

export function nativeSeekPrey(host:Pick<NativeHostilityHost,'actors'|'isPrey'>,sources:Pick<NativeHostilitySources,'dist'>,actor:Actor,range:number):Actor|null {
    // SOVEREIGNTY: scent — hunger walks the crossing (the goal carries its story) (the derived census, probe_tiers RIG T).
    let best: Actor | null = null;
    let bd = range;
    for (const b of host.actors) {
      if (b.dead || b.passive || b.untargetable || !host.isPrey(actor, b)) continue;
      const d = (0, sources.dist)(actor.pos, b.pos);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

export function nativeEnemiesOf(host:Pick<NativeHostilityHost,'actors'|'hostileTo'>,actor:Actor):Actor[] {
    return host.actors.filter(a =>
      (host.hostileTo(actor, a)
        // BREAKABLE conjured objects join their OWNER's hostile pool — the
        // owner's every damage path (swings, zones, projectiles) can find
        // and demolish them, though the steering PICKS refuse to CHASE
        // furniture (assistAim + the SEEKWORTHY homing gate). Never anyone
        // else's pool: minions and allies see furniture, the owner sees a
        // target.
        || (a.construct?.breakable !== undefined && a.owner === actor))
      && !a.dead && !a.untargetable && !a.downed);
  }
