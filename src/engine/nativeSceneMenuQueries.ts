/** Exact native menu query bodies from e0600ae; actual owner bindings are explicit. */
import type {World, Seat} from './world';
import type {NativeSceneMenuHost} from './nativeSceneMenuHost';
import { massBountiesAvailable, massBountyRoute } from '../worldmass/bounties';
import { Actor } from './actor';
import { findBagGem, freeCellCount } from './gemitems';
import { memoryProvenanceLabel, MEMORY_CFG, MEMORY_KINDS, memoryGroups, memoryKindOf, memoryUnitsOf, type MemoryRecallGroup, type MemoryRecallViewData } from './memories';
import { type ItemCategory } from './items';
import { VENDORS } from '../data/vendors';
import { SKILLS } from '../data/skills';
import { MONSTERS } from '../data/monsters';
import { SUPPORTS } from '../data/supports';
import { START_ZONE, type ZoneDef } from '../data/zones';
import { BOUNTY_BOARD_CFG, BOUNTY_KINDS, describeBountyPay } from '../data/bountyboard';
import { type BountyPosting } from '../data/bountyboard';
import { CARAVAN_BANDS, caravanBandLabel } from '../data/caravan';
import { QUESTS } from '../quests/defs';
import { massQuestTarget } from '../worldmass/quests';
import { DEFAULT_QUEST_CATEGORY, questStandingLine, type QuestCategory, type QuestStanding } from '../quests/types';
import { type ContinentInfo } from '../world/continents';
import { coordDist } from '../world/coords';
import { collectOmens, omenLine, omenReach, type Omen } from '../world/omens';
import { PORT_CFG } from '../data/ports';
import { seaById } from '../world/seas';
import { holdClassOf, holdRestoreCost } from '../data/harborholds';
import type { BoroughSpec } from '../packages/encounters';
import { featureEnabled } from '../meta/account';
import { MERC_CFG, type MercOffer } from '../meta/mercs';
const MIREILLE_GIFT_SKILLS = ['life_flask', 'mana_flask'];
interface MireilleLessonStep {
  id: 'learn';
  /** Live read: the gift skills this move still wants demonstrating on. */
  pendingSkills: (w: Pick<World,'meta'>) => string[];
}
const MIREILLE_LESSON_STEPS: MireilleLessonStep[] = [
  { // seat each carried gift flask ITEM onto the rack (learn = seat = barred)
    id: 'learn',
    pendingSkills: w => MIREILLE_GIFT_SKILLS.filter(id => !w.meta.knownSkills.has(id)
      && !!findBagGem(w.meta.items, 'skill', id)),
  },
];
export function sceneBoroughArmView(host:NativeSceneMenuHost, folkId: number):{
    folk: Actor; gifts: number; maxGifts: number; stacks: Record<string, number>;
    arming: BoroughSpec['arming']; stage: string; timer: number;
    folkAlive: number; folkTotal: number;
  } | null {
    const found = host.boroughOf(folkId);
    if (!found) return null;
    const { e } = found;
    const folk = host.actorById(folkId);
    if (!folk || folk.dead) return null;
    const arms = e.bo!.arms.get(folkId);
    return {
      folk,
      gifts: arms?.gifts ?? 0,
      maxGifts: found.spec.arming.maxGifts,
      stacks: { ...(arms?.stacks ?? {}) },
      arming: found.spec.arming,
      stage: e.bo!.stage,
      timer: e.timer,
      folkAlive: host.boroughFolkAlive(e).length,
      folkTotal: e.bo!.folkIds.length,
    };
  }

export function sceneBountyBoardView(host:NativeSceneMenuHost, boardId: string = BOUNTY_BOARD_CFG.boardId):{
    /** No new work while its destination geography is unavailable. */
    unavailable?: string;
    countdown: number;
    offers: { id: string; title: string; ask: string; route: string; pay: string; locked?: boolean }[];
    hands: { id: string; title: string; ask: string; route: string; pay: string; state: 'afield' | 'ready' | 'failed' }[];
    /** THE COAST WRITS (a quay board only): the local writ lane's rest
     *  clock — 0 = postable now (the panel's button drives the standing
     *  postHoldWrits grammar). Absent off harborhold ground. */
    coastWrits?: { restSec: number };
    /** THE RECEIPT (the counter laws): the last turn-in at THIS board while
     *  it is still fresh — `pay` printed, or `failed` for a handed-back
     *  posting. Absent once BOUNTY_BOARD_CFG.counter.receiptSec has run. */
    receipt?: { title: string; pay: string; failed: boolean };
  } {
    // THE JOURNAL ROW: a render shell reads the board its own seat was shipped (the
    // countdown runs on the shared clock off the host's restock time).
    const net = host.clientActionHook ? host.netJournal?.boards?.[boardId] : undefined;
    if (net) {
      const { restockAt, ...rest } = net;
      return { ...rest, countdown: restockAt - host.time };
    }
    const slip = host.bountyReceipt;
    const receipt = slip && slip.boardId === boardId && host.time - slip.at <= BOUNTY_BOARD_CFG.counter.receiptSec
      && (!slip.seat || slip.seat === host.questHand().id) // THE BOARD PER SEAT: a receipt prints for the seat it paid
      ? { title: slip.title, pay: slip.pay, failed: slip.failed } : undefined;
    const easyRoutes = host.bountyApproaches(boardId, true), hardRoutes = host.bountyApproaches(boardId, false);
    const face = (p: BountyPosting): { id: string; title: string; ask: string; route: string; pay: string; locked?: boolean } => {
      const c = BOUNTY_KINDS[p.kind]?.copy(host, p) ?? { title: p.id, ask: '' };
      const route = easyRoutes.get(p.expedition?.anchor ?? p.zoneId) ?? hardRoutes.get(p.expedition?.anchor ?? p.zoneId);
      const approach = BOUNTY_KINDS[p.kind]?.route?.(host, p) ?? (route
        ? `Route: ${route.path.length - 1}${p.expedition ? '+1' : ''} crossing${route.path.length === 2 && !p.expedition ? '' : 's'} · up to Lv ${route.peak}`
        : 'Route: no open local approach');
      const level = p.challengeLevel ?? p.expedition?.level ?? host.zoneMap[p.zoneId]?.level ?? 1;
      return {
        id: p.id, title: c.title, ask: c.ask, route: `${approach}${BOUNTY_KINDS[p.kind]?.route ? '' : ` · Target Lv ${level}`}`,
        pay: describeBountyPay(p.pay),
        ...(p.locked ? { locked: true } : {}),
      };
    };
    const hold = host.zone.holdAnchor ? host.zoneMap[host.zone.holdAnchor]?.harborhold : undefined;
    const writs = boardId !== BOUNTY_BOARD_CFG.boardId && boardId === host.zone.id && hold?.state === 'open'
      ? { restSec: Math.max(0, (hold.writsAt ?? 0) - host.time) } : undefined;
    return {
      ...(!host.graphWorkAvailable() && !massBountiesAvailable(host, boardId) ? { unavailable: 'No hunts are posted for this country yet.' } : {}),
      countdown: (host.bountyBeat() + 1) * host.bountyBeatSeconds() - host.time,
      ...(writs ? { coastWrits: writs } : {}),
      ...(receipt ? { receipt } : {}),
      offers: host.bountyOffers.filter(o => o.boardId === boardId && (host.graphWorkAvailable() ? !o.massBounty : massBountiesAvailable(host, boardId) && !!o.massBounty)).map(face),
      // THE READINESS LAW: the card's state is the one fold (handState).
      hands: host.bountyHands.filter(h => h.boardId === boardId && host.handOwns(h)).map(p => ({ ...face(p), state: host.handState(p), // THE BOARD PER SEAT: the reader's own hands
        ...(!host.graphWorkAvailable() && !p.massBounty && host.handState(p) === 'afield'
          ? { route: 'Destination unavailable in this expedition' } : {}) })),
    };
  }

export function sceneCanRetireHere(host:NativeSceneMenuHost):boolean {
    // Retirement is a WILDS rite: the port captain hires blades but never
    // takes them in (data law — see data/harborholds.ts merc notes).
    return (host.modeStageDef().canRetire ?? false) && !!host.mercOutpost
      && !host.mercOutpost.captain.dead && !host.mercOutpost.port;
  }

export function sceneCaravanMenuBands(host:NativeSceneMenuHost):{ band: number; level: number; label: string; name: string }[] {
    return CARAVAN_BANDS.filter(b => featureEnabled(host.account, b.feature))
      .map(b => ({ band: b.band, level: b.level, label: caravanBandLabel(b.band), name: host.caravanDestName(b.band) }));
  }

export function sceneContinentAtMap(host:NativeSceneMenuHost, c: { x: number; y: number }):ContinentInfo { return host.continentFor(c); }

export function sceneDimensionBiomeAtMap(host:NativeSceneMenuHost, dimId: string, c: { x: number; y: number }):string {
    return host.dimensionBiomeFor(dimId)(c);
  }

export function sceneForgeWrits(host:NativeSceneMenuHost, seat: Seat = host.localSeat):{ uid: number; category: ItemCategory; complexity: number; ilvl: number; restSec: number }[] {
    const out: { uid: number; category: ItemCategory; complexity: number; ilvl: number; restSec: number }[] = [];
    for (const it of seat.meta.items) {
      if (!it.writ) continue;
      // A pre-walk-2 writ carried `tier` — read it as the class (tolerant).
      const complexity = it.writ.complexity ?? (it.writ as { tier?: number }).tier ?? 1;
      out.push({
        uid: it.uid, category: it.writ.category, complexity, ilvl: it.ilvl,
        restSec: Math.max(0, (host.traceRests.get(it.uid) ?? 0) - host.time),
      });
    }
    return out;
  }

export function sceneHarborHearsay(host:NativeSceneMenuHost):{ id: string; line: string; price: number; canChart: boolean }[] {
    const here = host.zone.map;
    const H = PORT_CFG.hearsay;
    const cand: { o: Omen; d: number; reach: number }[] = [];
    for (const o of collectOmens(host)) {
      if ((o.dimension ?? 'surface') !== 'surface') continue; // harbors are surface ears
      if (host.omenRevealed.has(o.id)) continue;              // already on the map
      if (host.chartsBought.has(o.id)) continue;              // the chart is owned — never re-sold
      const d = coordDist(o.at, here);
      if (d < H.farBeyond) continue;
      cand.push({ o, d, reach: omenReach(o).whisper });
    }
    cand.sort((a, b) => (b.reach - a.reach) || (a.o.age - b.o.age));
    return cand.slice(0, H.max).map(({ o, d }) => ({
      id: o.id,
      line: o.lines.length ? omenLine(o, o.lines[0], here) : 'something waits out there',
      price: Math.max(H.chartPriceMin, Math.round(d * H.chartPricePerDist)),
      canChart: !!o.zoneId && !!host.zoneMap[o.zoneId ?? ''],
    }));
  }

export function sceneHarvestPauseLocked(host:NativeSceneMenuHost):boolean {
    return host.harvestSessions.some(s => s.held);
  }

export function sceneHoldPanelInfo(host:NativeSceneMenuHost):{
    name: string; clsLabel: string; state: 'besieged' | 'open' | 'fallen';
    prosperity: number; prosperityCap: number; defenses: number; falls: number;
    waves: number; restoreCost: number; canMuster: boolean; canRestore: boolean;
    rebuildLeft: number; fallLeft: number; defenseLive: boolean;
    services: { id: string; at: number; active: boolean }[];
  } | null {
    const hold = host.zone.harborhold;
    if (!hold) return null;
    const cls = holdClassOf(hold);
    const restoreCost = holdRestoreCost(cls, Math.max(1, host.zone.level));
    return {
      name: host.zone.name, clsLabel: cls.label, state: hold.state,
      prosperity: hold.prosperity, prosperityCap: cls.prosperityCap,
      defenses: hold.defenses, falls: hold.falls,
      waves: cls.siege.waves, restoreCost,
      canMuster: hold.state === 'besieged' && !host.holdDefense,
      canRestore: hold.state === 'fallen' && host.mortalValueOf() >= restoreCost,
      rebuildLeft: hold.state === 'fallen' && hold.rebuildAt !== undefined ? Math.max(0, hold.rebuildAt - host.time) : 0,
      fallLeft: hold.state === 'besieged' && hold.fallAt !== undefined ? Math.max(0, hold.fallAt - host.time) : 0,
      defenseLive: !!host.holdDefense,
      services: cls.services.map(s => ({ id: s.id, at: s.at, active: hold.state === 'open' && hold.prosperity >= s.at })),
    };
  }

export function sceneMemoryRecallLesson(host:NativeSceneMenuHost, seat: Seat = host.localSeat):boolean {
    return seat === host.localSeat && !host.account.ledger[MEMORY_CFG.lessonReceipt]
      && !host.ledger[MEMORY_CFG.lessonReceipt] && !host.spoilsSealed()
      && seat.meta.items.some(item => !!memoryUnitsOf(item)?.length);
  }

export function sceneMemoryRecallView(host:NativeSceneMenuHost, seat: Seat, uid: number):MemoryRecallViewData | null {
    const pouch = host.bagItem(seat, uid);
    const units = pouch ? memoryUnitsOf(pouch) : null;
    const memKind = pouch ? memoryKindOf(pouch) : null;
    if (!pouch || !units || !memKind) return null;
    const facets = MEMORY_KINDS[memKind].facets;
    const lvl = Math.max(host.zone.level, seat.actor.level);
    const pool = host.skillDropPool(lvl);
    const refusal = host.spoilsSealed() ? MEMORY_CFG.strings.sealed
      : freeCellCount(seat.meta.items) + (units.length === 1 ? 1 : 0) < 1 ? MEMORY_CFG.strings.noRoom
      : null;
    const groups = memoryGroups(units).map((g): MemoryRecallGroup => {
      const def = MONSTERS[g.d];
      const name = memoryProvenanceLabel(g.d, def?.name);
      // THE PROMISE's row wears no lean chips — the sealed gem IS its odds
      // face (a vanished id degrades to the wild rung, exactly as the cut
      // falls: drawn == rolled).
      const pinDef = g.pin ? (g.pin.k === 'skill' ? SKILLS[g.pin.id] : SUPPORTS[g.pin.id]) : undefined;
      if (g.pin && pinDef) {
        return {
          key: g.key, d: g.d, name, count: g.count, rung: 'pinned', kit: [], tags: [],
          pin: { kind: g.pin.k, id: g.pin.id, name: pinDef.name, color: pinDef.color, ...(g.pin.r ? { rarity: g.pin.r } : {}) },
        };
      }
      // The banner lane never reads the dropper's leans — its rows stand
      // wide and the facet decides (drawn == rolled, both ways).
      const lean = facets ? { rung: 'wide' as const, kit: [] } : host.memoryLeanOf(def, pool);
      return {
        key: g.key, d: g.d, name, count: g.count, rung: lean.rung,
        kit: lean.kit.map(s => ({ id: s.id, name: s.name, color: s.color, mult: MEMORY_CFG.kitMult })),
        tags: lean.rung === 'bias' ? [...(def?.gemBias ?? [])] : [],
      };
    });
    return { uid: pouch.uid, kind: memKind, total: units.length, groups, refusal };
  }

export function sceneMercHireCap(host:NativeSceneMenuHost):number {
    return Math.max(1, Math.floor(MERC_CFG.maxHired + host.player.sheet.get('mercRetinue')));
  }

export function sceneMercHireCost(host:NativeSceneMenuHost, o: MercOffer):number {
    const L = host.mercTargetLevel();
    const base = MERC_CFG.hireCostBase + MERC_CFG.hireCostPerLevel * L;
    const discount = Math.min(0.9, Math.max(0, host.player.sheet.get('mercHireDiscount')));
    return Math.max(1, Math.round(base * (o.kind === 'retired' ? MERC_CFG.retiredCostMult : 1) * (1 - discount)));
  }

export function sceneMercOfferBlocked(host:NativeSceneMenuHost, o: MercOffer):string | null {
    if (o.kind !== 'retired') return null;
    const r = host.account.mercRoster.find(x => x.mercId === o.refId);
    if (!r) return 'Gone from the wake.';
    if (r.engagedBy === host.meta.charId) return 'Already rides with you.';
    if (r.engagedBy) return 'Spoken for — sworn to another patron.';
    return null;
  }

export function sceneMireilleLessonSkills(host:NativeSceneMenuHost):string[] {
    const step = host.mireilleGiftLesson();
    if (step === null) return [];
    return MIREILLE_LESSON_STEPS.find(s => s.id === step)?.pendingSkills(host) ?? [];
  }

export function sceneNearAnyVendor(host:NativeSceneMenuHost, seat: Seat = host.localSeat):boolean {
    return VENDORS.some(v => v.near(host, seat));
  }

export function sceneQuestLog(host:NativeSceneMenuHost):{
    active: {
      id: string; label: string; category: QuestCategory;
      /** The one fold (questStanding); `ready` is its 'ready' face, kept for readers. */
      standing: QuestStanding; ready: boolean;
      /** THE STANDING'S WORDS for this row — where to walk and why. */
      line: string;
      /** A posting's card ask, progress included ("2 still stand"). */
      ask?: string;
      target?: string;
    }[];
    completed: { id: string; label: string; category: QuestCategory }[];
  } {
    if (host.clientActionHook && host.netJournal) return host.netJournal.log; // THE JOURNAL ROW
    const handPos = host.questHand().actor.pos; // THE QUEST HAND
    const active = host.activeQuests.filter(e => { // THE BOARD PER SEAT: another seat's hand is not this journal's
      const p = host.bountyHands.find(h => h.id === e.questId);
      return !p || host.handOwns(p);
    }).map(e => {
      const q = host.questDefOf(e.questId); // generated postings resolve too
      const p = host.bountyHands.find(h => h.id === e.questId);
      const targetId = p && BOUNTY_KINDS[p.kind]?.target ? BOUNTY_KINDS[p.kind].target!(host, p) : e.zoneId;
      const z = targetId ? host.zoneMap[targetId] : undefined;
      const standing = host.questStanding(e);
      const home = host.questHome(e);
      const homeName = host.zoneMap[home.zoneId]?.name;
      const ask = p ? [BOUNTY_KINDS[p.kind]?.copy(host, p).ask, BOUNTY_KINDS[p.kind]?.route?.(host, p)].filter(Boolean).join(' · ') : undefined;
      return {
        id: e.questId, label: q?.offerLabel ?? e.questId,
        category: q?.category ?? DEFAULT_QUEST_CATEGORY,
        standing, ready: standing === 'ready',
        line: questStandingLine(standing, p && homeName ? `${home.counter} at ${homeName}` : home.counter),
        ...(ask ? { ask } : {}),
        // The journal names ground by the map's own fog seam (World.visible):
        // a lifted charge reads its name here as on the chart; an omen-face
        // errand's veiled seat stays the ask.
        target: p?.massBounty ? standing === 'ready' ? 'Return to the Bounty Board at Lastlight' : massBountyRoute(host, p)
          : e.placeId && host.massRuntime ? standing === 'ready' ? 'Return to ' + home.counter + ' at ' + (homeName ?? 'the settlement')
          : massQuestTarget(host.massRuntime, e, handPos)
          : !host.graphWorkAvailable() && standing === 'afield' ? 'Destination unavailable in this expedition'
          : z ? (host.visible(z) ? z.name : e.directionsKnown === false
          ? 'Lead undiscovered — explore or seek information'
          : `${host.bearingOf(host.zone.map, z.map)} — unexplored country`) : undefined,
      };
    });
    const completed = [...host.completedQuests].map(id => ({
      id, label: QUESTS[id]?.offerLabel ?? id, category: QUESTS[id]?.category ?? DEFAULT_QUEST_CATEGORY,
    }));
    return { active, completed };
  }

export function sceneQuestHome(host:NativeSceneMenuHost, e: { questId: string }):{ zoneId: string; counter: string } {
    const p = host.bountyHands.find(h => h.id === e.questId);
    if (p) {
      const home = host.bountyBoardRoster().find(b => b.id === p.boardId)?.homeZoneId
        ?? (p.boardId === BOUNTY_BOARD_CFG.boardId ? START_ZONE : p.boardId);
      return { zoneId: home, counter: 'the bounty board' };
    }
    const q = QUESTS[e.questId];
    const g = q?.turnIn ? (Array.isArray(q.turnIn.giver) ? q.turnIn.giver[0] : q.turnIn.giver) : undefined;
    return { zoneId: START_ZONE, counter: (g && MONSTERS[g]?.name) || 'the giver' };
  }

export function sceneSailMenuPorts(host:NativeSceneMenuHost):{ id: string; name: string; level: number; sailed: boolean; seaName: string | null; tier: string | null; sameSea: boolean }[] {
    if (!host.zone.port) return [];
    const routes = new Set(host.zone.searoutes ?? []);
    // The harbor lists what the WORLD knows plus what the HARBOR knows: every
    // found port, and any VEILED harbor a shipping lane already runs to (the
    // sea fabric rings lanes at system mint — "ships run there, friend;
    // never been?"). Sailing a lane into veiled country IS the discovery.
    // Grouped for the panel: THIS water's harbors first, then farther shores.
    return Object.values(host.zoneMap)
      .filter(z => z.port && z.id !== host.zone.id && (!z.veiled || routes.has(z.id)))
      .map(z => ({
        id: z.id, name: z.name, level: z.level, sailed: routes.has(z.id),
        seaName: host.seaNameOf(z), tier: z.portTier ?? null,
        sameSea: !!z.seaId && z.seaId === host.zone.seaId,
      }))
      .sort((a, b) => Number(b.sameSea) - Number(a.sameSea) || (a.seaName ?? '').localeCompare(b.seaName ?? ''));
  }

export function sceneSeaNameOf(host:NativeSceneMenuHost, z: ZoneDef):string | null {
    if (!z.seaId) return null;
    return seaById(z.seaId, host.sim.biomeField.fieldSeed)?.name ?? null;
  }

export function sceneTraceActive(host:NativeSceneMenuHost, seatId?: string):boolean {
    return host.traceRuns.some(r => seatId === undefined || r.seatId === seatId);
  }
