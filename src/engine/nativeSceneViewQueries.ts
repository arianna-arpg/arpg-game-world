/** Exact native renderer and interaction query bodies from e0600ae.
 * Named providers below preserve actual area ownership and native partial effects. */
import type {World, DeathBurst, EmergeRecord, FractureRun, NpcSpeechLine, Seat} from './world';
import type {NativeSceneViewHost} from './nativeSceneViewHost';
import { QUESTGIVER_DWELL } from './nativeSceneQuestInteraction';
import { QUESTGIVER_RADIUS } from './nativeSceneQuests';
import { massBountiesAvailable } from '../worldmass/bounties';
import { type WorldPing } from './pings';
import { clamp, dist, vec, type Vec2 } from '../core/math';
import { rectCenter } from './fourthwall';
import { Actor } from './actor';
import { reviveTargetsOfRow } from '../net/partyReads';
import { convertRuleHolds, instanceChargeCost, instanceConvert, instanceMods, instanceSelfStack, instanceTargeting, instanceTrigger, UNLEASH_CFG, skillContextTags, type SkillDef, type SkillInstance } from './skills';
import { ESSENCE_IDS, type EssenceCost } from '../data/essences';
import { VENDORS } from '../data/vendors';
import { SKILLS } from '../data/skills';
import { MONSTERS } from '../data/monsters';
import { mimicSelected } from './mimic';
import { START_ZONE, objectiveSeals, type ZoneDef } from '../data/zones';
import { BEACON_CFG } from '../data/beacons';
import { RIFT_CFG } from '../data/rifts';
import { PYRE_CFG } from '../data/pyres';
import { DIG_CFG } from '../data/digsites';
import { HARVEST_CFG } from './harvest';
import { type HoldFixture } from './holdObjectives';
import { ADOPT_CFG } from '../data/objectives';
import { doodadRuleOf, type Doodad, type PlacedStructure } from './levelgen';
import { dissolveSeedOf } from './dissolve';
import { dwellOf } from '../data/sidezones';
import { DWELL_CFG, npcDwellReach, transitDwell, transitRadius, transitReach } from '../data/transit';
import { VOYAGE_CFG, VOYAGE_ZONE_ID } from '../world/voyage';
import { BOUNTY_BOARD_CFG } from '../data/bountyboard';
import { traceVerdict } from './trace';
import { SALVAGE_CFG } from '../data/essences';
import { QUEST_GIVER_IDS, ZONE_QUEST_GIVER_IDS } from '../quests/defs';
import { survivalResource } from '../world/regions';
import { speechTell, speechWindowFor, speechAvailable } from './speech';
import { dwellFocus, type DwellFocus, type DwellCandidate } from './dwellFocus';
import { SPEECH_ATTENTION_CFG, speechAttentionFor } from '../data/speechAttention';
import { SPEECH_GRAMMAR_CFG, composeSpeech, dealSpeechDecks, hauntPhrase, type SpeechContext, type SpeechSpeakerRow } from './speechGrammar';
import { HARBORHOLD_CFG } from '../data/harborholds';
import { dimensionDef } from '../world/dimensions';
import { holdfastTollLabel } from '../packages/holdfast';
import { pocketFormOf } from '../data/pocketForms';
import { courtLord } from '../packages/courts';
import type { ActiveEncounter } from './encounter';
import { WEATHER_DEFS } from '../world/weather';
import { dayCycle, DAY_LENGTH } from '../world/daynight';
import { extractionLookFor } from '../data/extraction';
import { stageOf, type ModeStageDef } from '../meta/modes';
import { MERC_CFG } from '../meta/mercs';
import { hashStr } from './nativeSceneConfig';
export const BOSS_BAR_CFG = {
  /** A hero this close wakes the bar before first blood (world units). */
  senseRange: 800,
};
export const LEDGER_HERO_RENOWNED = 'hero_renowned';
const MIREILLE_RADIUS = 150;
const RESIDENT_RADIUS = 110;
const MIREILLE_DWELL = 0.8;
const MIREILLE_GIFT_LEDGER = 'mireille_flasks_given';
const CAMPFIRE_DWELL = 1.1;
const AMALGAM_RADIUS = 150;
const AMALGAM_DWELL = 1.0;
const AMALGAM_PICK_DWELL = 1.0;
const DELVER_RADIUS = 160;
const CARAVAN_RADIUS = 160;
const CARAVAN_DWELL = 0.9;
const CORPSE_RADIUS = 110;
const CORPSE_DWELL = 1.0;
const REVIVE_RADIUS = CORPSE_RADIUS;
const REVIVE_DWELL = 1.0;
export function sceneAmalgamPickView(host:NativeSceneViewHost):{ pos: Vec2; glyph: string; label: string; frac: number }[] {
    const af = host.sim.amalgamationField;
    const site = host.amalgamSite;
    if (!af || !site) return [];
    const info = af.activeIn(site.zoneId);
    if (!info || info.quest !== 'choose') return [];
    const spots = host.amalgamPickSpots(site.center, info.offered);
    return spots.map((s, i) => {
      const part = af.partById(s.partId);
      return {
        pos: s.pos, glyph: part?.glyph ?? '?', label: part?.label ?? s.partId,
        frac: clamp((host.amalgamPickDwell[i] ?? 0) / AMALGAM_PICK_DWELL, 0, 1),
      };
    });
  }

export function sceneBoardIntroduction(host:NativeSceneViewHost):{ id: string; pos: Vec2; tier: number }[] {
    if (!host.bountyLessonLive() || host.scene || host.player.dead || host.player.downed) return [];
    return host.bountyBoardsHere().filter(b => b.id === BOUNTY_BOARD_CFG.boardId);
  }

export function sceneBountyLessonLive(host:NativeSceneViewHost):boolean {
    return !host.account.ledger[BOUNTY_BOARD_CFG.boardIntroduction.receipt] && (host.ledger.bounties_accepted ?? 0)
      + (host.account.ledger.bounties_accepted ?? 0) === 0;
  }

export function sceneBoroughHint(host:NativeSceneViewHost):{ pos: Vec2; text: string } | null {
    for (const e of host.encounters) {
      if (!e.def.borough || e.phase !== 'open' || !e.bo) continue;
      const spec = e.def.borough;
      if (spec.muster.armWindow === 'muster' && e.bo.stage !== 'muster') continue;
      const radius = transitRadius('borough_arm', spec.arming.radius);
      for (const id of e.bo.folkIds) {
        const f = host.actorById(id);
        if (!f || f.dead) continue;
        if (dist(host.player.pos, f.pos) > radius + 60) continue;
        return { pos: vec(f.pos.x, f.pos.y), text: `${f.name}` };
      }
    }
    return null;
  }

export function sceneBossBarInfo(host:NativeSceneViewHost, a: Actor):{ pips: number; lit: number; hl: boolean } | null {
    // SOVEREIGNTY: census — a label read — touches no body (the derived census, probe_tiers RIG T).
    if (a.dead || a.team !== 'enemy' || !a.defId) return null;
    const def = MONSTERS[a.defId];
    if (!(def?.bossBar ?? def?.boss)) return null;
    if (!a.bossBarLive) {
      const live = a.grudgeMark || host.seats.some(s =>
        !s.actor.dead && dist(a.pos, s.actor.pos) <= BOSS_BAR_CFG.senseRange);
      if (!live) return null;
      a.bossBarLive = true;
    }
    if (a.brain?.script?.length) {
      return { pips: a.brain.script.length, lit: a.aiScriptIdx, hl: true };
    }
    if (a.brain?.phases?.length) {
      const pips = a.brain.phases.length + 1; // base + each HP phase
      return { pips, lit: clamp(a.aiPhaseIdx + 2, 1, pips), hl: false };
    }
    return { pips: 0, lit: 0, hl: false };
  }

export function sceneBountyBoardHint(host:NativeSceneViewHost):{ pos: Vec2; text: string } | null {
    const b = host.bountyBoardsHere().find(x => host.nearBountyBoard(host.localSeat, x.id));
    if (!b) return null;
    // THE RETURN speaks before the read: a resolved hand at ITS board is
    // what the linger will do first (drawn == done — the same predicate the
    // dwell resolves through).
    const owed = BOUNTY_BOARD_CFG.counter.dwellTurnIn ? host.resolvedHandsAt(b.id) : [];
    if (owed.length) {
      return { pos: b.pos, text: owed.every(h => h.state === 'failed') ? 'Linger to hand the failed posting back.' : 'Linger to turn in the writ.' };
    }
    return { pos: b.pos, text: host.graphWorkAvailable() || massBountiesAvailable(host, b.id) ? 'Linger to read the postings.' : 'No hunts are posted for this country yet.' };
  }

export function sceneCampfireHint(host:NativeSceneViewHost):{ pos: Vec2; text: string } | null {
    const a = host.stationAnchor('campfire');
    if (!a || !host.nearCampfire()) return null;
    return { pos: a.pos, text: 'Linger to refresh the wilds.' };
  }

export function sceneCouchActive(host:NativeSceneViewHost):boolean { return host.seats.some(s => s.couch); }

export function sceneCouchHeroes(host:NativeSceneViewHost):Actor[] {
    const out = [host.localSeat.actor];
    for (const s of host.seats) if (s.couch && !s.actor.dead) out.push(s.actor);
    return out;
  }

export function sceneCouchSeats(host:NativeSceneViewHost):Seat[] { return host.seats.filter(s => s.couch); }

export function sceneDeathBurstsView(host:NativeSceneViewHost):readonly DeathBurst[] { return host.deathBursts; }

export function sceneDescentView(host:NativeSceneViewHost):{ depth: number; haul: EssenceCost[]; lightFrac: number; shaft: Vec2 } | null {
    const run = host.descentRun;
    if (!run) return null;
    const max = host.sim.descentField?.surge().lightMax ?? 100;
    const light = host.player.survival?.get('light') ?? max;
    const haul: EssenceCost[] = [];
    for (const id of ESSENCE_IDS) {
      const n = run.haul[id] ?? 0;
      if (n > 0) haul.push({ essence: id, count: n });
    }
    return { depth: run.depth, haul, lightFrac: clamp(light / max, 0, 1), shaft: run.origin };
  }

export function sceneDimGatesView(host:NativeSceneViewHost):{ pos: Vec2; radius: number; label: string; accent: string }[] {
    const out: { pos: Vec2; radius: number; label: string; accent: string }[] = [];
    for (const g of host.dimGates) {
      const dd = dimensionDef(g.dimId);
      const gate = dd.entry?.gate;
      if (!gate) continue;
      const minted = host.zoneMap[gate.id];
      out.push({
        pos: g.pos, radius: g.radius,
        label: minted ? `${minted.name} · Lv ${minted.level}` : gate.name,
        accent: dd.color,
      });
    }
    return out;
  }

export function sceneDwellRingsView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; kind: string }[] {
    const out: { pos: Vec2; frac: number; kind: string }[] = [];
    const add = (v: { pos: Vec2; frac: number; kind: string } | null): void => {
      if (v && v.frac > 0.02) out.push(v);
    };
    // THE DWELL TELL's fills: the stations and NPCs the seat lingers at.
    for (const t of host.dwellTargetsView()) add(t);
    // THE ROAD RING (shard M1 W2, SeatW.rd): a hosted world's shell draws the
    // road dwell its host is filling for its own seat (null everywhere else).
    add(host.netRoadDwell);
    add(host.exitDwellView());
    add(host.caveDwellView());
    add(host.realmDwellView());
    add(host.doorDwellView());
    add(host.holdfastDwellView());
    add(host.descentDwellView());
    add(host.wardDwellView());
    add(host.extractionDwellView());
    add(host.boroughDwellView());
    // The Hunt's tracks: the trail-reading linger, finally with its fill.
    add(host.huntDwellView());
    // THE LITTER'S CLOCK (Growing Litter): a downed beast's passive revival
    // counts down on its own outer ring wherever it lies — no hand needed;
    // the bond's reviveSeconds is the clock, the 'revive:litter' row only
    // styles it. The tending fill (a dwell target above) rides inside it.
    for (const a of host.actors) {
      if (!a.companion || a.dead || !a.downed || a.companionDormant || a.companionReviveRemaining === undefined) continue;
      const total = host.companionBonds.reviveClock(a);
      if (!total) continue;
      add({ pos: vec(a.pos.x, a.pos.y), frac: clamp(1 - a.companionReviveRemaining / total, 0, 1), kind: 'revive:litter' });
    }
    // The survey stones' charge rings — one per unfinished stone with any
    // banked charge (the 'beacon' transit row styles them; full stones are
    // lit monuments and need no gauge).
    const bo = host.zone.objective;
    if (bo.kind === 'beacon' && !host.objectiveDone && host.spires.length) {
      const need = bo.chargeSec ?? transitDwell('beacon', BEACON_CFG.chargeSec);
      for (const s of host.spires) {
        if (s.charge < need) add({ pos: s.pos, frac: clamp(s.charge / Math.max(0.01, need), 0, 1), kind: 'beacon' });
      }
    }
    // The contest-law kin's progress rings — same law, their own transit
    // styles (each family's row tints its ring; full fixtures are finished
    // faces and need no gauge).
    if (bo.kind === 'rifts' && !host.objectiveDone && host.rifts.length) {
      const need = bo.sealSec ?? transitDwell('rift', RIFT_CFG.sealSec);
      for (const s of host.rifts) {
        if (s.charge < need) add({ pos: s.pos, frac: clamp(s.charge / Math.max(0.01, need), 0, 1), kind: 'rift' });
      }
    }
    for(const ring of host.massRuntime?.geography?.objectives.rings() ?? []) add(ring);
    if (bo.kind === 'pyres' && !host.objectiveDone && host.pyres.length) {
      const need = bo.kindleSec ?? transitDwell('pyre', PYRE_CFG.kindleSec);
      for (const s of host.pyres) {
        if (s.charge < need) add({ pos: s.pos, frac: clamp(s.charge / Math.max(0.01, need), 0, 1), kind: 'pyre' });
      }
    }
    if (bo.kind === 'unearth' && !host.objectiveDone && host.digs.length) {
      const need = bo.digSec ?? transitDwell('digsite', DIG_CFG.digSec);
      for (const s of host.digs) {
        if (s.charge < need) add({ pos: s.pos, frac: clamp(s.charge / Math.max(0.01, need), 0, 1), kind: 'digsite' });
      }
    }
    for(const view of host.massRuntime?.geography?.caravans.processions.views(host.player.pos)??[]){
      if(!view.rolling&&!view.done&&!view.lost&&!view.away&&view.rallyFrac>0)
        add({pos:view.pos,kind:'procession',frac:view.rallyFrac});
    }
    // The procession's rally ring while the dwell builds at the dormant cart.
    const pr = host.procession;
    if (pr && !pr.rolling && !host.objectiveDone && !host.objectiveLost && pr.dwellStart > 0) {
      const pv = host.processionView();
      if (pv) add({
        pos: pv.pos, kind: 'procession',
        frac: clamp((host.time - pr.dwellStart) / transitDwell('procession', 0.9), 0, 1),
      });
    }
    return out;
  }

export function sceneDwellTargetsView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; kind: string }[] {
    const out: { pos: Vec2; frac: number; kind: string }[] = [];
    const seats = host.localHumanSeats().filter(s => !s.actor.dead && !s.actor.downed);
    if (!seats.length) return out;
    const anySeat = (near: (s: Seat) => boolean): boolean => seats.some(near);
    const put = (pos: Vec2 | undefined | null, frac: number, kind: string): void => {
      if (pos) out.push({ pos: vec(pos.x, pos.y), frac: clamp(frac, 0, 1), kind });
    };
    // Anchored stations (the Vault's furniture): the gate's own clock.
    if (anySeat(s => host.nearSalvage(s))) put(host.stationAnchor('salvage')?.pos, host.salvageGate.frac(SALVAGE_CFG.stationDwell), 'station:salvage');
    if (anySeat(s => host.nearOracle(s))) put(host.stationAnchor('oracle')?.pos, host.oracleGate.frac(SALVAGE_CFG.stationDwell), 'station:oracle');
    if (anySeat(s => host.nearTracker(s))) put(host.stationAnchor('tracker')?.pos, host.trackerGate.frac(SALVAGE_CFG.stationDwell), 'station:tracker');
    if (host.nearCampfire()) put(host.stationAnchor('campfire')?.pos, host.campfireDwell / CAMPFIRE_DWELL, 'station:campfire');
    const font = host.fonts.find(f => anySeat(s => dist(f.pos, s.actor.pos) <= 150
      && host.dwellReachable(s.actor.pos, f.pos, DWELL_CFG.reach, { from: s.actor.tier ?? 0, to: f.tier ?? 0 })));
    if (font) put(font.pos, host.fontGate.frac(SALVAGE_CFG.stationDwell), 'station:font');
    const board = host.bountyBoardsHere().find(b => anySeat(s => host.nearBountyBoard(s, b.id)));
    if (board) put(board.pos, host.bountyGate.frac(BOUNTY_BOARD_CFG.dwell.sec), 'station:bounty');
    // The sea's furniture: the dock, the harbor board, the muster horn. THE
    // SEALED WORDS (shard M1 W2): a hosted world's shell draws no ring at the
    // dock or the harbor board, sealed roads there (its seat hears their word).
    const sealedShell = !!host.netCounters;
    const dock = sealedShell ? null : host.portDock();
    if (dock && dist(host.player.pos, dock.pos) <= 110
      && host.dwellReachable(host.player.pos, dock.pos, DWELL_CFG.reach, host.storyPair(host.player, dock))) {
      put(dock.pos, host.sailGate.frac(CARAVAN_DWELL), 'station:dock');
    }
    if (!sealedShell && host.nearHarborBoard()) put(host.doodads.find(d => d.kind === 'harbor_board')?.pos, host.harborGate.frac(CARAVAN_DWELL), 'station:harbor_board');
    if (host.nearMusterHorn()) put(host.doodads.find(d => d.kind === 'muster_horn')?.pos, host.holdGate.frac(HARBORHOLD_CFG.muster.dwellSec), 'station:muster_horn');
    // Bodies: the counters (each VendorDef names its keeper's role), the
    // caravanner, the innkeeper, the quartermaster, the Bonewright, the
    // captain — each ring seats on the body the dwell reads.
    for (const v of VENDORS) {
      if (!anySeat(s => v.near(host, s))) continue;
      put(host.actors.find(a => host.hasNpcRole(a, v.npcRole))?.pos, host.vendorGate.frac(SALVAGE_CFG.stationDwell), `npc:${v.npcRole}`);
    }
    if (anySeat(s => host.nearCaravan(s))) put(host.actors.find(a => host.hasNpcRole(a, 'caravanner'))?.pos, host.caravanGate.frac(CARAVAN_DWELL), 'npc:caravanner');
    put(host.getMireille()?.pos, host.mireilleDwell / MIREILLE_DWELL, 'npc:innkeep');
    put(host.getQuestGiver()?.pos, host.questGiverDwell / QUESTGIVER_DWELL, 'npc:questgiver');
    const necro = host.amalgamSite ? host.actorById(host.amalgamSite.necroId) : null;
    if (necro && !necro.dead && dist(necro.pos, host.player.pos) <= AMALGAM_RADIUS
      && host.dwellReachable(host.player.pos, necro.pos, npcDwellReach('bonewright'), host.storyPair(host.player, necro))) {
      put(necro.pos, host.amalgamNecroDwell / AMALGAM_DWELL, 'npc:bonewright');
    }
    const post = host.mercOutpost;
    if (post && !post.captain.dead && host.mercParley().near) put(post.captain.pos, host.mercDwell / MERC_CFG.outpost.dwellSec, 'npc:captain');
    // THE REVIVE RINGS + the reclaim: downed bodies and a prior run's corpse
    // are dwell targets like any station's — the base ring where the reach
    // is, the fill off the gate's own clock (reviveTargetsView /
    // corpseTargetsView read exactly what the ticks fire on).
    for (const r of host.reviveTargetsView()) put(r.pos, r.frac, r.kind);
    for (const c of host.corpseTargetsView()) put(c.pos, c.frac, c.kind);
    return out;
  }

export function sceneReviveTargetsView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; kind: string; name: string }[] {
    // THE PARTY THAT READS (net/partyReads.ts, SeatW.rv): a hosted shell holds only its own
    // seat, so its ring and the hint beside it read the row its host fills.
    if (host.netRevive !== undefined) return reviveTargetsOfRow(host);
    const out: { pos: Vec2; frac: number; kind: string; name: string }[] = [];
    const seats = host.localHumanSeats().filter(s => !s.actor.dead && !s.actor.downed);
    if (!seats.length) return out;
    const inReach = (target: Actor, kind: string): boolean => seats.some(s =>
      dist(s.actor.pos, target.pos) <= transitRadius(kind, REVIVE_RADIUS)
      && host.dwellReachable(s.actor.pos, target.pos, transitReach(kind), host.storyPair(s.actor, target)));
    for (const seat of host.seats) {
      const a = seat.actor;
      if (a.dead || !a.downed || !inReach(a, 'revive')) continue;
      let built = 0;
      for (const t of seat.reviveDwellBy.values()) built = Math.max(built, t);
      out.push({ pos: vec(a.pos.x, a.pos.y), frac: clamp(built / transitDwell('revive', REVIVE_DWELL), 0, 1), kind: 'revive', name: a.name });
    }
    for (const a of host.actors) {
      if (!a.companion || a.dead || !a.downed || a.companionDormant || !inReach(a, 'revive:companion')) continue;
      out.push({
        pos: vec(a.pos.x, a.pos.y), kind: 'revive:companion', name: a.name,
        frac: clamp(a.companionReviveDwell / transitDwell('revive:companion', REVIVE_DWELL), 0, 1),
      });
    }
    return out;
  }

export function sceneCorpseTargetsView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; kind: string }[] {
    const out: { pos: Vec2; frac: number; kind: string }[] = [];
    if (host.player.dead || host.player.downed) return out;
    for (const c of host.playerCorpses) {
      if (c.reclaimed || !host.canReclaim(c)) continue;
      if (dist(c.pos, host.player.pos) > transitRadius('corpse_reclaim', CORPSE_RADIUS)
        || !host.dwellReachable(host.player.pos, c.pos, transitReach('corpse_reclaim'), host.storyPair(host.player))) continue;
      out.push({ pos: vec(c.pos.x, c.pos.y), frac: clamp(c.dwell / transitDwell('corpse_reclaim', CORPSE_DWELL), 0, 1), kind: 'corpse_reclaim' });
    }
    return out;
  }

export function sceneExitDwellView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; kind: string } | null {
    if (host.exitDwellIdx < 0) return null;
    const e = host.exits.find(x => x.defIndex === host.exitDwellIdx);
    if (!e) return null;
    const kind = e.boundary ? `zone_exit:${e.boundary}` : 'zone_exit';
    return { pos: vec(e.pos.x, e.pos.y), frac: clamp((host.time - host.exitDwellStart) / transitDwell(kind), 0, 1), kind };
  }

export function sceneCaveDwellView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; kind: string } | null {
    if (host.caveDwellIdx < 0 || host.caveDwellIdx >= host.caveEntrances.length) return null;
    const cm = host.caveEntrances[host.caveDwellIdx];
    return { pos: vec(cm.pos.x, cm.pos.y), frac: clamp((host.time - host.caveDwellStart) / dwellOf(cm.kind), 0, 1), kind: `sidezone:${cm.kind}` };
  }

export function sceneRealmDwellView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; kind: string } | null {
    if (!host.realmDwellKey) return null;
    const kind = `realm_gate:${host.realmDwellKind}`;
    return { pos: vec(host.realmDwellPos.x, host.realmDwellPos.y), frac: clamp((host.time - host.realmDwellStart) / transitDwell(kind), 0, 1), kind };
  }

export function sceneDoorDwellView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; kind: string } | null {
    if (!host.doorDwellId) return null;
    const d = host.doodads.find(x => x.door?.id === host.doorDwellId);
    if (!d?.door) return null;
    const need = d.door.dwell ?? transitDwell('door');
    return { pos: vec(host.doorDwellPos.x, host.doorDwellPos.y), frac: clamp((host.time - host.doorDwellStart) / need, 0, 1), kind: 'door' };
  }

export function sceneHoldfastDwellView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; kind: string } | null {
    if (host.holdfastDwellKey !== 'holdfast') return null;
    return { pos: vec(host.holdfastDwellPos.x, host.holdfastDwellPos.y), frac: clamp((host.time - host.holdfastDwellStart) / transitDwell('holdfast'), 0, 1), kind: 'holdfast' };
  }

export function sceneDescentDwellView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; kind: string } | null {
    if (!host.descentSite || host.descentShaftDwell <= 0) return null;
    const p = host.descentSite.platform;
    return { pos: vec(p.x, p.y), frac: clamp(host.descentShaftDwell / transitDwell('descent_shaft'), 0, 1), kind: 'descent_shaft' };
  }

export function sceneWardDwellView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; kind: string } | null {
    if (!host.wardDwellSeal) return null;
    const kind = `ward_seal:${host.wardDwellSeal.kind}`;
    return {
      pos: vec(host.wardDwellSeal.pos.x, host.wardDwellSeal.pos.y),
      frac: clamp((host.time - host.wardDwellStart) / transitDwell(kind), 0, 1), kind,
    };
  }

export function sceneExtractionDwellView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; kind: string } | null {
    for (const e of host.encounters) {
      if (!e.def.extract || e.phase !== 'dormant' || !e.ex || e.ex.dwellStart === 0) continue;
      const need = transitDwell('extraction', e.def.extract.arm.dwellSec);
      return { pos: e.pos, frac: clamp((host.time - e.ex.dwellStart) / need, 0, 1), kind: 'extraction' };
    }
    return null;
  }

export function sceneBoroughDwellView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; kind: string } | null {
    for (const e of host.encounters) {
      if (!e.def.borough || e.phase !== 'open' || !e.bo) continue;
      const need = transitDwell('borough_arm', e.def.borough.arming.dwellSec);
      for (const [fid, start] of e.bo.armDwellStart) {
        if (start === 0) continue;
        const f = host.actorById(fid);
        if (!f || f.dead) continue;
        return { pos: vec(f.pos.x, f.pos.y), frac: clamp((host.time - start) / need, 0, 1), kind: 'borough_arm' };
      }
    }
    return null;
  }

export function sceneHuntDwellView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; kind: string } | null {
    const hf = host.sim.huntField;
    if (!hf || !host.huntFootprint || host.huntFootprintDwell <= 0) return null;
    return {
      pos: vec(host.huntFootprint.pos.x, host.huntFootprint.pos.y), kind: 'hunt_tracks',
      frac: clamp(host.huntFootprintDwell / Math.max(0.01, hf.surge().dwellSeconds), 0, 1),
    };
  }

export function sceneProcessionView(host:NativeSceneViewHost):{
    pos: Vec2; frac: number; started: boolean; rolling: boolean;
    done: boolean; lost: boolean; lifeFrac: number;
  } | null {
    const geographic=host.massRuntime?.geography?.caravans.processions.views(host.player.pos).find(v=>!v.away&&!v.done&&!v.lost);
    if(geographic)return geographic;
    const o = host.zone.objective;
    if (o.kind !== 'procession') return null;
    const pr = host.procession;
    const cart = pr?.cartId != null ? host.actorById(pr.cartId) : null;
    const total = pr ? Math.max(1, dist(pr.startPos, pr.dest)) : 1;
    return {
      pos: cart ? cart.pos : pr ? pr.dest : host.zoneEntry,
      frac: pr && cart ? clamp(1 - dist(cart.pos, pr.dest) / total, 0, 1)
        : host.objectiveDone ? 1 : 0,
      started: !!pr?.started, rolling: !!pr?.rolling,
      done: host.objectiveDone, lost: host.objectiveLost,
      lifeFrac: cart ? clamp(cart.life / Math.max(1, cart.maxLife()), 0, 1) : 0,
    };
  }

export function sceneEncountersView(host:NativeSceneViewHost):readonly ActiveEncounter[] { return host.encounters; }

export function sceneExtractionHint(host:NativeSceneViewHost):{ pos: Vec2; text: string } | null {
    for (const e of host.encounters) {
      if (!e.def.extract || e.phase !== 'dormant') continue;
      if (dist(host.player.pos, e.pos) > e.def.extract.arm.radius + 90) continue;
      const look = extractionLookFor(host.zone.biome);
      return { pos: vec(e.pos.x, e.pos.y), text: `${look.title}` };
    }
    return null;
  }

export function sceneFractureView(host:NativeSceneViewHost):FractureRun | null { return host.fractureRun; }

export function sceneFrameLockFocus(host:NativeSceneViewHost):{ x: number; y: number } | null {
    for (const a of host.couchHeroes()) {
      if (!a.dead && a.frameLockRect) return rectCenter(a.frameLockRect);
    }
    return null;
  }

export function sceneGloamingView(host:NativeSceneViewHost):{ gloom: number; lightFrac: number } | null {
    if (host.descentRun || host.gloomCur <= 0.02) return null;
    const max = survivalResource('light')?.max ?? 100;
    const light = host.player.survival?.get('light') ?? max;
    return { gloom: host.gloomCur, lightFrac: clamp(light / max, 0, 1) };
  }

export function sceneHarvestView(host:NativeSceneViewHost):{
    nodes: {
      x: number; y: number; r: number; spent: boolean; accent: string;
      armFrac: number; offered: boolean; offeredPad: boolean;
    }[];
    rites: {
      x: number; y: number; steps: number[]; done: number;
      left: number; window: number; accent: string; pad: boolean; missT: number;
    }[];
  } | null {
    if (host.clientActionHook && host.netHarvest !== undefined) return host.netHarvest; // THE COUNTERS AND THE JOURNAL: the shell's own rite row
    if (!host.harvestNodes.length && !host.harvestSessions.length) return null;
    const arms = new Map<number, number>();
    for (const d of host.harvestDwell.values()) {
      arms.set(d.ix, Math.max(arms.get(d.ix) ?? 0, d.t / HARVEST_CFG.armSec));
    }
    // Which nodes stand OFFERED, and whether the offering seat is a pad
    // (the couch guest's chip speaks its own device).
    const offers = new Map<number, boolean>();
    for (const [sid, ix] of host.harvestOffer) {
      const seat = host.seats.find(x => x.id === sid);
      offers.set(ix, (offers.get(ix) ?? false) || !!seat?.couch);
    }
    return {
      nodes: host.harvestNodes.map((n, ix) => ({
        x: n.pos.x, y: n.pos.y, r: n.doodad.radius, spent: n.spent,
        accent: n.def.accent, armFrac: Math.min(1, arms.get(ix) ?? 0),
        offered: offers.has(ix), offeredPad: offers.get(ix) ?? false,
      })),
      rites: host.harvestSessions.map(s => {
        const seat = host.seats.find(x => x.id === s.seatId);
        const a = seat?.actor ?? host.player;
        const node = host.harvestNodes[s.ix];
        return {
          x: a.pos.x, y: a.pos.y - a.radius, steps: s.seq, done: s.done,
          left: s.left, window: s.window,
          accent: node?.def.accent ?? '#e8e0c8',
          pad: !!seat?.couch, missT: s.missT,
        };
      }),
    };
  }

export function sceneHoldfastTollPrompt(host:NativeSceneViewHost):{ pos: Vec2; text: string } | null {
    const k = host.holdfastKeeper();
    if (!k || dist(host.player.pos, k.pos) > transitRadius('holdfast', 78) + 30) return null;
    const site = host.holdfastSite;
    const gdef = site ? host.sim.holdfastField?.def(site.defId) : null;
    const u = gdef?.unlock;
    const price = gdef && u?.kind === 'pay-currency' && u.currency === 'mortal'
      ? holdfastTollLabel(gdef, host.zone.level)
      : 'a Memory';
    const pitch = site ? host.holdfastPocketPitch(site.zoneId, site.lockId) : null;
    return {
      pos: vec(k.pos.x, k.pos.y - 34),
      text: `dwell to pay the toll (${price})${pitch ? ` — ${pitch}` : ''}`,
    };
  }

export function sceneHoldfastPocketPitch(host:NativeSceneViewHost, zoneId: string, lockId: string | undefined):string | null {
    if (!lockId) return null;
    const to = host.zoneMap[zoneId]?.exits.find(e => e.lock === lockId)?.to;
    const dest = to && to !== '?' ? host.zoneMap[to] : undefined;
    if (!dest?.pocket) return null;
    return pocketFormOf(dest.pocketForm).pitch;
  }

export function sceneHuntFootprintView(host:NativeSceneViewHost):{ pos: Vec2 } | null { return host.huntFootprint; }

export function sceneLeylineView(host:NativeSceneViewHost):{ waypoint: Vec2 | null; siphon: Vec2 | null; name: string; besieged: boolean } | null {
    if (host.zone.objective.kind !== 'leyline') return null;
    const s = host.actors.find(a => !a.dead && a.tag === 'ley_siphon');
    return {
      waypoint: host.waypointPos ? vec(host.waypointPos.x, host.waypointPos.y) : null,
      siphon: s ? vec(s.pos.x, s.pos.y) : null,
      name: s?.name ?? '',
      besieged: !host.objectiveDone && !!s,
    };
  }

export function sceneNpcSpeechView(host:NativeSceneViewHost, admit = true, pointerHits?: ReadonlyMap<number, number>, retainedSpeakerId?: number | null):NpcSpeechLine[] {
    host.npcDialogues.refreshAppearances();
    const retainedSpeaker = retainedSpeakerId == null ? undefined : host.speechCandidates(host.localSeat).find(c => c.id === retainedSpeakerId);
    const callout = retainedSpeaker ? null : host.npcDialogues.callout(admit);
    if (callout) return [callout];
    const out: NpcSpeechLine[] = [];
    for (const seat of host.localHumanSeats()) {
      const candidates = seat === host.localSeat && retainedSpeaker ? [retainedSpeaker] : host.speechCandidates(seat);
      if (admit && seat === host.localSeat && SPEECH_ATTENTION_CFG.pointer.enabled) {
        for (const c of candidates) if (c.available) c.pointerDistance = pointerHits?.get(c.id);
      }
      const focus = dwellFocus(host.speechFocus.get(seat), candidates,
        admit && host.seatIdle(seat), host.time, SPEECH_ATTENTION_CFG.focus, seat.lastActedAt);
      if (focus) host.speechFocus.set(seat, focus);
      else host.speechFocus.delete(seat);
      const selected = candidates.find(c => c.id === focus?.id);
      if (seat === host.localSeat && selected && selected.id !== host.speechFocusSpeaker) {
        // A new focus retires the previous visible utterance, even while
        // dwelling. Its existing cooldown still runs without interruption.
        host.speechFocusSpeaker = selected.id;
      }
      let spoken: { a: Actor; text: string; color: string } | undefined;
      if (seat === host.localSeat) {
        // Poll even the non-selected speakers: selection cannot reset a
        // cooldown or turn render culling into a fresh approach. A finished
        // focus stays selected while near, so standing never rotates a crowd.
        for (const a of host.actors) {
          if (!host.speakerRows.has(a.id)) continue;
          const text = host.residentPrompt(a, admit && selected?.id === a.id && !!focus?.ready);
          if (text && !seat.actor.dead && host.speechFocusSpeaker === a.id
            && (!selected || (selected.id === a.id && focus?.ready))) {
            spoken = { a, text, color: '#d8c8a8' };
          }
        }
      }
      if (selected && !selected.ambient && focus?.ready && selected.text) {
        spoken = { a: selected.a, text: selected.text, color: selected.color };
        if (admit) host.npcDialogues.admitted(selected.a);
      }
      if (admit && spoken && !out.some(row => row.a.id === spoken!.a.id)) out.push({ ...spoken, seatId: seat.id });
    }
    return out;
  }

export function sceneSpeechCandidates(host:NativeSceneViewHost, seat: Seat):ReturnType<World['speechCandidates']> {
    const candidates: (DwellCandidate & { a: Actor; text: string | null; color: string;
      ambient: boolean; available: boolean; approachHint?: string })[] = [];
    if (!seat.actor.dead && !seat.actor.downed) for (const a of host.actors) {
      if (a.dead || !a.defId) continue;
      const def = MONSTERS[a.defId];
      const role = def?.npcRole ?? '';
      const authored = seat === host.localSeat ? host.npcDialogues.dwell(a) : null;
      const ambient = !authored && role === 'resident' && host.speakerRows.has(a.id);
      const quest = (host.massRuntime ? QUEST_GIVER_IDS : ZONE_QUEST_GIVER_IDS).has(a.defId);
      // Other counter content is local-hero scoped; the caravan already
      // supports couch guests. Do not lend one hero another's lesson.
      if (seat !== host.localSeat && role !== 'caravanner') continue;
      let radius: number, text: string | null = null, color = '#d8b87a';
      if (authored) { radius = authored.radius; text = authored.text; color = authored.def.color ?? def.color; }
      else if (ambient) { radius = RESIDENT_RADIUS; color = '#d8c8a8'; }
      else if (role === 'innkeep') { radius = MIREILLE_RADIUS; text = host.innkeepPrompt(); }
      else if (role === 'caravanner') { radius = CARAVAN_RADIUS; text = host.caravanPrompt(seat); }
      else if (role === 'bonewright') { radius = AMALGAM_RADIUS; text = host.amalgamPrompt(); color = '#9ad0b0'; }
      else if (role === 'delver') { radius = DELVER_RADIUS; text = host.delverPrompt(); color = '#7fe0d8'; }
      else if (quest) { radius = QUESTGIVER_RADIUS; text = host.questGiverPrompt(); color = '#c8a8e8'; }
      else continue;
      // A service body can also offer contracts. Preserve its native teaching
      // first, then let the same reader page through the additional work.
      // Authored conversations and resident speech retain their own selection.
      if (!authored && !ambient && quest && role !== 'questgiver' && host.getQuestGiver(a.defId)?.id === a.id) {
        const questPrompt = host.questGiverPrompt();
        if (questPrompt && questPrompt !== text) text = text ? text + '\n\n' + questPrompt : questPrompt;
      }
      if (role === 'bonewright' && host.amalgamSite?.necroId !== a.id) continue;
      if (role === 'delver' && (host.descentSite?.delverId !== a.id || host.descentRun)) continue;
      const distance = dist(seat.actor.pos, a.pos);
      if (distance > radius || !host.dwellReachable(seat.actor.pos, a.pos,
        npcDwellReach(role || (quest ? 'questgiver' : '')), host.storyPair(seat.actor, a))) continue;
      const attention = speechAttentionFor(ambient ? 'ambient' : 'functional', role, def.speechAttention);
      if (!ambient && !text) text = attention.restingLine ?? null;
      if (!ambient && !text && !attention.reserveSilent) continue;
      const row = host.speakerRows.get(a.id), memory = host.speechMemory.get(a.id);
      const available = !ambient || !row || speechAvailable(memory, host.time,
        speechWindowFor(row.lane, row.current ?? row.line));
      candidates.push({ id: a.id, a, text, color, distance, ambient, available,
        ...attention, ...(authored ? { priority: authored.def.priority, dwellSec: authored.seconds } : {}) });
    }
    return candidates;
  }

export function sceneInnkeepPrompt(host:NativeSceneViewHost):string | null {
    if (!host.nearMireille()) return null;
    // ('{name}' resolves at the DISPLAY surface against the live hero —
    // resolveNameTokens, render/vis/speech.ts, invoked beside the bind
    // expansion in Renderer.resolveText — so her greeting addresses the
    // player with no import here: the token is plain text; only the
    // display seam expands it. An innkeep hears every new name first —
    // but only once there is a name to hear: an UNKNOWN hero (heroKnown,
    // the renown gate) gets her original welcome for strangers, and the
    // "is it?" greeting arrives with the renown that makes it fitting.)
    if (host.mireilleGiftOwed()) return host.heroKnown()
      ? '{name}, is it? Come here — I keep flasks for new faces.'
      : 'Come here, dear — I keep flasks for new faces.';
    // The handed gift TEACHES: she names the player's own next move in the
    // one loop every Memory follows — and the line clears the moment they
    // make it. An in-universe tutorial: no popup, no forced hand.
    // ('{bind:…}' tokens resolve at the DISPLAY surface against the LIVE
    // keyboard/controller binds — resolveBindTokens, meta/settings.ts — so
    // her directions can never name a key the player rebound away.)
    const lesson = host.mireilleGiftLesson();
    if (lesson === 'learn') return 'Find your flasks in your pack ({bind:panelInv}), love — two little Memories. Press them into your skill rack (the SKILLS flap on the edge).';
    // THE AFTERGLOW (set at the brim reward, cleared when the player steps
    // out of her reach): the finished lesson closes on her send-off, and
    // the locked-care line below waits for the next visit.
    if (host.mireilleAfterglow) return 'Well set, love — a sip when it hurts, that\'s what they\'re for. Off with you now; the world\'s less kind than I am.';
    if (!host.mireilleUnlocked()) return 'No free innstay — unlock my care in the Vault.';
    const def = host.getMireille()?.defId;
    return speechAttentionFor('functional', 'innkeep', def ? MONSTERS[def]?.speechAttention : undefined).restingLine ?? null;
  }

export function sceneNearMireille(host:NativeSceneViewHost):boolean { return host.getMireille() !== null; }

export function sceneHeroKnown(host:NativeSceneViewHost):boolean { return (host.ledger[LEDGER_HERO_RENOWNED] ?? 0) >= 1; }

export function sceneMireilleGiftLesson(host:NativeSceneViewHost):'learn' | null {
    if (host.mireilleLessonLived()) return null;
    if (!host.ledger[MIREILLE_GIFT_LEDGER]) return null;
    return host.mireilleLessonStep();
  }

export function sceneCaravanPrompt(host:NativeSceneViewHost, seat: Seat = host.localSeat):string | null {
    return host.nearCaravan(seat) ? 'Linger to consult the Caravanner…' : null;
  }

export function sceneAmalgamPrompt(host:NativeSceneViewHost):string | null {
    const af = host.sim.amalgamationField;
    const site = host.amalgamSite;
    if (!af || !site) return null;
    const info = af.activeIn(site.zoneId);
    if (!info) return null;
    switch (info.quest) {
      case 'offer': return info.stage === 0 ? 'Linger — I have work for you, flesh.' : 'Linger — another hunt awaits.';
      case 'hunt': return 'My quarry yet draws breath. Bring it down.';
      case 'choose': return 'Choose what to graft — and what it shall yield.';
      default: return null;
    }
  }

export function sceneDelverPrompt(host:NativeSceneViewHost):string | null {
    if (!host.nearDelver()) return null;
    return host.descentSpent.has(host.zone.id)
      ? 'Linger to trade — the shaft below is spent.'
      : 'The wares wait on the deep — dwell the shaft to descend.';
  }

export function sceneResidentPrompt(host:NativeSceneViewHost, a: Actor, admitted = true):string | null {
    const row = host.speakerRows.get(a.id);
    if (!row || a.dead) return null;
    const near = admitted && dist(a.pos, host.player.pos) <= RESIDENT_RADIUS
      && host.dwellReachable(host.player.pos, a.pos, DWELL_CFG.reach, { from: host.player.tier ?? 0, to: a.tier ?? 0 });
    const prev = host.speechMemory.get(a.id);
    const step = speechTell(prev, near, host.time, speechWindowFor(row.lane, row.current ?? row.line));
    // THE SPEECH GRAMMAR: a FRESH telling composes its line once (the deck's
    // next resolvable entry — the authored line when nothing else can be
    // said) and stamps it for the whole window, so no slot flickers
    // mid-telling; the window then reads the line actually told.
    if (step.telling && step.mem.spokeAt !== (prev?.spokeAt ?? null)) {
      row.current = host.composeSpeakerLine(row) ?? row.line;
      step.mem.holdSec = speechWindowFor(row.lane, row.current).holdSec;
    }
    host.speechMemory.set(a.id, step.mem);
    return step.telling ? (row.current ?? row.line) || null : null;
  }

export function sceneComposeSpeakerLine(host:NativeSceneViewHost, row: SpeechSpeakerRow):string | null {
    const day = Math.floor(host.time / DAY_LENGTH);
    const zoneSeed = Math.imul(host.zone.seed ?? 0, 0x9e3779b1);
    const company: SpeechSpeakerRow[] = [];
    for (const r of host.speakerRows.values()) {
      if (r.speaker.company !== row.speaker.company) continue;
      const body = host.actorById(r.actorId);
      r.speaker.present = !!body && !body.dead;
      company.push(r);
    }
    if (row.dealtDay !== day) {
      const seed = (zoneSeed ^ hashStr(`speech:${host.zone.id}:${row.speaker.company}:${day}`) ^ SPEECH_GRAMMAR_CFG.dealSalt) >>> 0;
      const decks = dealSpeechDecks(company.map(r => r.speaker), seed);
      for (const r of company) { r.deck = decks.get(r.speaker.key) ?? []; r.dealtDay = day; r.pos = 0; }
    }
    const seed = (zoneSeed ^ hashStr(`speech:${host.zone.id}:${row.speaker.key}:${day}`)) >>> 0;
    const res = composeSpeech(row.speaker, company.map(r => r.speaker), row.deck, row.pos, host.speechContext(company), seed);
    if (!res) return null;
    row.pos = res.pos;
    return res.text;
  }

export function sceneSpeechContext(host:NativeSceneViewHost, company: readonly SpeechSpeakerRow[]):SpeechContext {
    const news = host.newsLog.length ? host.newsLog[host.newsLog.length - 1] : null;
    const slain = host.slainLog.length ? host.slainLog[host.slainLog.length - 1] : null;
    const front = host.skyFront();
    const from = host.entryFrom ? (host.zoneMap[host.entryFrom] ?? host.caveMap[host.entryFrom])?.name ?? null : null;
    return {
      day: Math.floor(host.time / DAY_LENGTH),
      phase: dayCycle(host.time).phase,
      town: host.zoneMap[START_ZONE]?.name ?? null,
      zone: host.zone.name ?? null,
      weather: front ? WEATHER_DEFS[front.kind]?.label ?? null : null,
      lastEvent: news && host.time - news.at <= SPEECH_GRAMMAR_CFG.newsWindowSec ? news.text : null,
      from,
      heroClass: host.meta.classDef.name ?? null,
      heroKnown: host.heroKnown(),
      monster: slain && host.time - slain.at <= SPEECH_GRAMMAR_CFG.slainWindowSec ? MONSTERS[slain.defId]?.name ?? null : null,
      doingOf: sp => {
        const r = company.find(x => x.speaker.key === sp.key);
        const body = r ? host.actorById(r.actorId) : undefined;
        const seat = body?.hauntSeat;
        if (!body || body.dead || !seat || seat.until === undefined) return null;
        const piece = host.doodadsNear(seat.fx, seat.fy, 4).find(d => !d.gone && !d.felled && Math.abs(d.pos.x - seat.fx) < 1 && Math.abs(d.pos.y - seat.fy) < 1);
        return piece ? hauntPhrase(piece.kind) : null;
      },
    };
  }

export function sceneObjectiveText(host:NativeSceneViewHost):string {
    // SOVEREIGNTY: census — nearby objective bearings and counts touch no body.
    if (host.massRuntime && host.isSafeAt(host.player.pos)) return 'Sanctuary';
    const activity=host.massRuntime?.geography?.objectives.views(host.player.pos)[0];
    // Local work is visible in the native fixtures, light and charge rings.
    // Bounty details and discovered destinations remain available on request.
    if(activity && dist(activity.pos,host.player.pos)<1600)return '';
    const caravan=host.massRuntime?.geography?.caravans.processions.views(host.player.pos)[0];
    if(caravan&&dist(caravan.pos,host.player.pos)<1600)return '';
    const massActivity=host.massRuntime?.localSite(host.player.pos)?.activity;
    if(massActivity)return massActivity.text;
    const odysseyPressure = host.odyssey.pressureText();
    if (odysseyPressure) return odysseyPressure;
    const o = host.zone.objective;
    if (o.kind === 'safe') return 'Sanctuary';
    // THE RESOLUTION LATCH (her ruling, 2026-08-07): a resolved venture's
    // own prose HOLDS this line — "the text remains in sight for a player
    // to see" — until BOTH linger gates pass (ADOPT_CFG.resolveLinger:
    // seconds since the resolution instant AND credited kills since it),
    // then the line "swaps to the new objective per what the prose actually
    // states" (the done state for a win, the live cull for a loss). A pure
    // read — the latch object goes inert once both gates pass and dies at
    // the next zone load. Ahead of the lost/done branches on purpose: the
    // resolution prose is the display truth for its whole window.
    const latch = host.objectiveLatch;
    if (latch && (host.time - latch.at < ADOPT_CFG.resolveLinger.sec
      || host.kills - latch.kills < ADOPT_CFG.resolveLinger.kills)) {
      return latch.text;
    }
    // A LOST objective reads as lost — and says what losing costs. On open
    // ground: nothing but the bounty, the roads never lock. On SEALED ground
    // (THE FORFEIT LAW, her ruling 2026-08-05): the seal belongs to the
    // ORIGINAL ask alone — a loss keeps the doors barred for the memory's
    // life (the ground forgets, a fresh ask re-stages, the seal re-arms
    // with it), and no fallback can buy the passage the ask itself
    // forfeited. The gate needs no lost-awareness: isExitLocked already
    // reads only the done latch + the seal policy.
    if (host.objectiveLost) {
      const barred = objectiveSeals(o);
      return o.kind === 'procession'
        ? (barred ? 'Caravan Lost · Sealed'
          : 'Caravan Lost · Open')
        : (barred ? 'Lost · Sealed'
          : 'Lost · Open');
    }
    if (host.objectiveDone) return 'Cleared';
    switch (o.kind) {
      case 'none': return o.label ?? 'Wilderness';
      case 'clear': {
        // THE CULL reads its scoreboard; authored full-clear ground
        // (`all: true` — cull state never stands there) keeps the classic
        // remain-count line, as does any ground with no stamped ask.
        const cu = host.cull;
        if (!cu) return `Clear · ${host.countedEnemies().length}`;
        return `Cull · ${cu.kills}/${cu.need}`;
      }
      case 'boss': return `${MONSTERS[o.id].name}`;
      case 'lair': {
        // THE ADOPTED ASK — THE UNTITLED CLAIM (her ruling, 2026-08-07):
        // the line never names the claim; identity lives in the mouth's
        // own distinct visual. Structure unchanged (den/hunt, entered,
        // keeper count) — only the title left the prose.
        const v = host.lairAskView();
        if (!v) return 'Lair';
        if (v.mode === 'den') {
          return v.entered
            ? 'Lair · Entered'
            : 'Lair';
        }
        return `Keepers · ${v.remain}`;
      }
      case 'package': {
        // THE ADOPTED GUEST: the row's own view authors the line (the label
        // arrives capitalized for the HUD's opening position). A gone guest
        // reads its exit for the frame before the driver hands the ask back.
        const v = host.packageAskView();
        if (!v || !v.standing) return `${o.title} · Departed`;
        return v.label;
      }
      case 'venture': {
        // THE ADOPTED VENTURE: the row's own view authors the line; a lost
        // or vanished venture reads its forfeit for the frame before the
        // driver hands the ask back to the cull.
        const v = host.ventureAskView();
        if (!v || v.verdict === 'lost') return `${o.title} · Lost`;
        return v.label;
      }
      case 'spawners': return `Spawners · ${host.livingSpawners().length}`;
      case 'escape': return o.exit === 'any' || !host.entryFrom
        ? 'Escape'
        : 'Escape · Another Exit';
      case 'waves': return o.waves === 0
        ? `Endless Waves · ${host.wave}`
        : `Assault · ${Math.min(host.wave, o.waves)}/${o.waves}`;
      case 'beacon': {
        const v = host.spireView();
        if (!v) return 'Survey Spire';
        // The contest reads on the line itself — the scoreboard never lies
        // about WHY the number stopped (or fell).
        const mark = v.draining ? ' · Overrun'
          : v.contested ? ' · Contested'
            : v.recouping ? ' · Recovering' : '';
        if (v.count > 1) return `Waystones · ${v.charged}/${v.count}${mark}`;
        return v.frac > 0
          ? `Survey Spire · ${Math.round(v.frac * 100)}%${mark}`
          : `Survey Spire${mark}`;
      }
      case 'leyline': {
        const v = host.leylineView();
        if (!v || !v.besieged) return 'Besieged Waypoint';
        return `${v.name || 'Siphon'}`;
      }
      case 'rifts': {
        const v = host.riftsView();
        if (!v) return 'Rifts';
        const mark = v.draining ? ' · Overrun'
          : v.contested ? ' · Contested'
            : v.recouping ? ' · Recovering' : '';
        return `Rifts · ${v.sealed}/${v.count}${mark}`;
      }
      case 'pyres': {
        const v = host.pyresView();
        if (!v) return 'Pyres';
        const mark = v.draining ? ' · Overrun'
          : v.contested ? ' · Contested'
            : v.recouping ? ' · Recovering' : '';
        return `Pyres · ${v.lit}/${v.count}${mark}`;
      }
      case 'unearth': {
        const v = host.digsView();
        if (!v) return 'Buried Caches';
        const mark = v.draining ? ' · Overrun'
          : v.contested ? ' · Contested'
            : v.recouping ? ' · Recovering' : '';
        return `Caches · ${v.dug}/${v.count}${mark}`;
      }
      case 'procession': {
        const v = host.processionView();
        if (!v || (!v.started && !v.rolling)) return 'Caravan · Waiting';
        if (!v.rolling) return 'Caravan · Waiting';
        return `Caravan · ${Math.round(v.frac * 100)}%`;
      }
      case 'bounty': {
        const n = host.actors.filter(a => !a.dead && a.tag === 'bounty_mark').length;
        return `Bounties · ${n}`;
      }
      case 'puzzle': {
        const run = host.puzzles.find(r => r.isObjective);
        if (!run) return 'Seek out the riddle';
        // The kind's own line, capitalized for the HUD's opening position.
        const line = run.kind.status(run);
        return line.charAt(0).toUpperCase() + line.slice(1);
      }
      case 'offering': {
        const of = host.offering;
        if (!of) return 'Hungering Altar';
        const alive = host.actors.some(a => a.team === 'enemy' && !a.dead);
        if (!alive && of.offered < of.need) {
          // STALLED, not lost — derived, so a migration/warband/storm that
          // spawns new bodies revives the hunt with zero bookkeeping.
          return 'Hungering Altar · Waiting';
        }
        return `Hungering Altar · ${of.offered}/${of.need}`;
      }
    }
  }

export function sceneSpireView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; done: boolean; charged: number; count: number; contested: boolean; draining: boolean; recouping: boolean } | null {
    const geographic=host.massRuntime?.geography?.objectives.views(host.player.pos,'beacon')[0];
    if(geographic)return {...geographic,charged:geographic.lit};
    const o = host.zone.objective;
    if (o.kind !== 'beacon' || !host.spires.length) return null;
    const need = o.chargeSec ?? transitDwell('beacon', BEACON_CFG.chargeSec);
    const v = host.holdFixturesView(host.spires, need);
    if (!v) return null;
    return {
      pos: v.pos, frac: v.frac, done: v.done,
      charged: v.filled, count: v.count,
      contested: v.contested, draining: v.draining, recouping: v.recouping,
    };
  }

export function sceneHoldFixturesView(host:NativeSceneViewHost, fixtures: HoldFixture[], need: number):{ pos: Vec2; frac: number; done: boolean; filled: number; count: number; contested: boolean; draining: boolean; recouping: boolean } | null {
    if (!fixtures.length) return null;
    const filled = fixtures.filter(s => s.charge >= need).length;
    let pick = fixtures[0];
    let bd = Infinity;
    for (const s of fixtures) {
      if (s.charge >= need) continue;
      const d = dist(host.player.pos, s.pos);
      if (d < bd) { bd = d; pick = s; }
    }
    if (host.heldFixture && fixtures.includes(host.heldFixture) && host.heldFixture.charge < need) {
      pick = host.heldFixture;
    }
    return {
      pos: pick.pos,
      frac: need > 0 ? clamp(pick.charge / need, 0, 1) : 1,
      done: host.objectiveDone, filled, count: fixtures.length,
      contested: pick.holdRead?.contested ?? false, draining: pick.holdRead?.draining ?? false,
      recouping: pick.holdRead?.recouping ?? false,
    };
  }

export function sceneRiftsView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; done: boolean; sealed: number; count: number; contested: boolean; draining: boolean; recouping: boolean } | null {
    const geographic=host.massRuntime?.geography?.objectives.views(host.player.pos,'rifts')[0];
    if(geographic)return {...geographic,sealed:geographic.lit};
    const o = host.zone.objective;
    if (o.kind !== 'rifts') return null;
    const v = host.holdFixturesView(host.rifts, o.sealSec ?? transitDwell('rift', RIFT_CFG.sealSec));
    return v && { pos: v.pos, frac: v.frac, done: v.done, sealed: v.filled, count: v.count, contested: v.contested, draining: v.draining, recouping: v.recouping };
  }

export function scenePyresView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; done: boolean; lit: number; count: number; contested: boolean; draining: boolean; recouping: boolean } | null {
    const geographic=host.massRuntime?.geography?.objectives.views(host.player.pos,'pyres')[0];
    if(geographic)return geographic;
    const o = host.zone.objective;
    if (o.kind !== 'pyres') return null;
    const v = host.holdFixturesView(host.pyres, o.kindleSec ?? transitDwell('pyre', PYRE_CFG.kindleSec));
    return v && { pos: v.pos, frac: v.frac, done: v.done, lit: v.filled, count: v.count, contested: v.contested, draining: v.draining, recouping: v.recouping };
  }

export function sceneDigsView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; done: boolean; dug: number; count: number; contested: boolean; draining: boolean; recouping: boolean } | null {
    const geographic=host.massRuntime?.geography?.objectives.views(host.player.pos,'unearth')[0];
    if(geographic)return {...geographic,dug:geographic.lit};
    const o = host.zone.objective;
    if (o.kind !== 'unearth') return null;
    const v = host.holdFixturesView(host.digs, o.digSec ?? transitDwell('digsite', DIG_CFG.digSec));
    return v && { pos: v.pos, frac: v.frac, done: v.done, dug: v.filled, count: v.count, contested: v.contested, draining: v.draining, recouping: v.recouping };
  }

export function sceneOracleHint(host:NativeSceneViewHost):{ pos: Vec2; text: string } | null {
    const player = host.player;
    const a = [host.stationAnchor('oracle'), host.actors.find(a => a.defId === 'townsfolk_oracle' && !a.dead)]
      .filter(a => !!a && host.dwellReachable(player.pos, a.pos, DWELL_CFG.reach, { from: player.tier ?? 0, to: a.tier ?? 0 }))
      .sort((a, b) => dist(player.pos, a!.pos) - dist(player.pos, b!.pos))[0];
    if (!a || !host.nearOracle()) return null;
    return { pos: a.pos, text: 'Linger to open Oracle storage.' };
  }

export function scenePingVisibleTo(host:NativeSceneViewHost, viewer: string, p: WorldPing):boolean {
    if (p.seat === viewer) return true;
    if (!host.partyMates && !host.partyRows) return true;
    return host.sameSeatParty(viewer, p.seat);
  }

export function scenePublishViewFrame(host:NativeSceneViewHost, x: number, y: number, w: number, h: number):void {
    if (!(w > 0) || !(h > 0)) return;
    if (host.viewFrame) {
      host.viewFrame.x = x; host.viewFrame.y = y;
      host.viewFrame.w = w; host.viewFrame.h = h;
    } else host.viewFrame = { x, y, w, h };
    host.viewFrameAt = host.time;
  }

export function sceneRampageActive(host:NativeSceneViewHost):boolean {
    return host.regrowing.length > 0;
  }

export function sceneRealmGatesView(host:NativeSceneViewHost):{ pos: Vec2; kind: string; color?: string; prompt?: string }[] {
    const out: { pos: Vec2; kind: string; color?: string; prompt?: string }[] = [];
    if (host.demonPortals.length) {
      const c = host.sim.demonFieldFor(host.zone.dimension)?.invasionOn(host.zone.id)?.color;
      for (const dp of host.demonPortals) out.push({ pos: dp.pos, kind: 'demon', ...(c ? { color: c } : {}) });
    }
    if (host.crusadePortals.length) {
      const c = host.sim.crusadeField?.crusadeOn(host.zone.id)?.color;
      for (const cp of host.crusadePortals) out.push({ pos: cp.pos, kind: 'crusade', ...(c ? { color: c } : {}) });
    }
    for (const np of host.necropolisPortals) out.push({ pos: np.pos, kind: 'necropolis' });
    for (const fr of host.fractureRifts) out.push({ pos: fr.pos, kind: 'fracture', color: fr.color });
    // COURT DOORS (encounter fabric): a fed veiled field's standing way into
    // its lord's domain — tinted and prompted by the lord's own row.
    for (const e of host.encounters) {
      if (e.phase !== 'door' || !e.doorAt) continue;
      const lord = e.lordId ? courtLord(e.lordId) : undefined;
      const kind = e.def.court?.door?.gateKind ?? 'court';
      out.push({ pos: e.doorAt, kind, ...(lord ? { color: lord.color, prompt: lord.gatePrompt } : {}) });
    }
    return out;
  }

export function sceneReviveHint(host:NativeSceneViewHost):{ pos: Vec2; text: string } | null {
    const me = host.localSeat.actor;
    if (me.dead || me.downed) return null;
    let best: { pos: Vec2; text: string } | null = null;
    let bd = Infinity;
    for (const t of host.reviveTargetsView()) {
      const d = dist(me.pos, t.pos);
      if (d < bd) { bd = d; best = { pos: t.pos, text: `Linger to revive ${t.name}.` }; }
    }
    return best;
  }

export function sceneSalvageHint(host:NativeSceneViewHost):{ pos: Vec2; text: string } | null {
    const a = host.stationAnchor('salvage');
    if (!a || !host.nearSalvage()) return null;
    return { pos: a.pos, text: 'Linger to work the salvage bench.' };
  }

export function sceneSeatIdOfActor(host:NativeSceneViewHost, a: Actor):string | null {
    const m = host.party.members.find(x => x.actor === a);
    if (m) return m.seat;
    const s = host.seats.find(x => x.actor === a);
    return s ? (s === host.localSeat ? host.clientSeatId : s.id) : null;
  }

export function sceneSeatStageDef(host:NativeSceneViewHost, seat: Seat):ModeStageDef { return stageOf(seat.meta.modeId, seat.meta.modeStage); }

export function sceneSelfStacksOf(host:NativeSceneViewHost, inst: SkillInstance):{ count: number; max: number } | null {
    const spec = instanceSelfStack(inst);
    if (!spec) return null;
    return { count: Math.min(spec.maxStacks, inst.state?.stackN ?? 0), max: spec.maxStacks };
  }

export function sceneSkillUsable(host:NativeSceneViewHost, a: Actor, inst: SkillInstance):boolean {
    const def = inst.def;
    // Trigger-socketed skills are never hand-castable: the slot greys and
    // the key becomes the arm/disarm latch (the border glow shows state).
    if (instanceTrigger(inst)) return false;
    // THE CAST SEAL greys the slot: the press would refuse, so the bar says so first.
    if (host.castSealed(a, inst)) return false;
    if (def.pool && !a.venting.has(def.pool.id)
      && (a.pools.get(def.pool.id) ?? 0) < (def.pool.min ?? 1)) return false;
    // Unmet PREREQUISITE gates grey the slot ("not ready").
    if (!a.gatesMet(inst)) return false;
    // Any hard charge economy greys until the bank can pay — an innate
    // cost (an empty flask fount, a chargeless Galvanic Reserve) exactly
    // as a socketed SPENDER graft (Embargo). Mirrors canUse: the press
    // would refuse, so the bar must say so first.
    {
      const cc = instanceChargeCost(inst);
      if (cc && !cc.optional) {
        const have = a.charges.get(cc.charge) ?? 0;
        const need = cc.amount === 'all' ? (cc.minimum ?? 1) : Math.max(cc.amount, cc.minimum ?? 0);
        if (have < need) return false;
      }
    }
    // Corpse targeting is excluded: its resolution has side effects
    // (Sacrificial Rites) — never run it from a render poll.
    const tspec = instanceTargeting(inst);
    if (tspec?.requiresStatus && tspec.target !== 'corpse') {
      return host.resolveTargeting(a, inst, a.aimPos ?? a.pos) !== null;
    }
    return true;
  }

export function sceneSlotFaceOf(host:NativeSceneViewHost, caster: Actor, inst: SkillInstance):SkillDef {
    // A mimic slot wears the SELECTED captured art's face (the source
    // monster's chip rides the build flap — engine/mimic.ts).
    if (inst.def.mimic) {
      const sel = mimicSelected(caster, host.time);
      if (sel && SKILLS[sel.sid]) return SKILLS[sel.sid];
    }
    // THE HONEST CHAIN FACE (2026-09-11): while a combo chain's window
    // holds, the slot IS the step the next press will cast — Trisect
    // shows Bisect, One-Two shows the Cross Jab — the convert face's own
    // law. A lapsed window or a repeated step reads as the host itself.
    const step = host.comboQueuedStep(caster, inst);
    if (step) return step.def;
    const conv = instanceConvert(inst); // innate OR a munition graft's reload
    return conv && SKILLS[conv.skillId] && convertRuleHolds(conv.when, caster, inst, host)
      ? SKILLS[conv.skillId]
      : inst.def;
  }

export function sceneSpeechApproachHint(host:NativeSceneViewHost):{ a: Actor; text: string } | null {
    const focus = host.speechFocus.get(host.localSeat);
    if (!focus || focus.ready || host.time < focus.readAt
      || host.time - focus.readAt > SPEECH_ATTENTION_CFG.focus.staleSec) return null;
    const selected = host.speechCandidates(host.localSeat).find(c => c.id === focus.id);
    const text = selected?.approachHint?.trim();
    return selected?.available && selected.text && text ? { a: selected.a, text } : null;
  }

export function sceneSpeechDwellTargetsView(host:NativeSceneViewHost):{ a: Actor; frac: number; selected: boolean }[] {
    const focus = host.speechFocus.get(host.localSeat);
    return host.speechCandidates(host.localSeat).filter(c => c.ambient && c.available).map(c => ({
      a: c.a, selected: focus?.id === c.id,
      frac: focus?.id !== c.id || focus.since === null ? 0 : focus.ready ? 1
        : clamp((host.time - focus.since) / Math.max(0.001, c.dwellSec), 0, 1),
    }));
  }

export function sceneSpeechFocusTarget(host:NativeSceneViewHost, seat: Seat = host.localSeat):Readonly<DwellFocus> | undefined {
    return host.speechFocus.get(seat);
  }

export function sceneStoreyedStructures(host:NativeSceneViewHost):PlacedStructure[] {
    return host.structures.filter(st => !!st.storeys?.length);
  }

export function sceneSurvivalRowVisible(host:NativeSceneViewHost, resource: string):boolean {
    return resource !== 'light' || !host.lightMeterHeld();
  }

export function sceneTraceView(host:NativeSceneViewHost):{
    pts: { x: number; y: number }[]; band: number;
    ink: { x: number; y: number; in: boolean }[];
    frontier: number; progress: number; accuracy: number; slips: number;
    slipCap: number; outside: boolean;
  } | null {
    const localIds = new Set(host.localHumanSeats().map(s => s.id));
    const r = host.traceRuns.find(x => localIds.has(x.seatId));
    if (!r) return null;
    const v = traceVerdict(r.path, r.state);
    return {
      pts: r.path.pts, band: r.path.band, ink: r.state.ink,
      frontier: r.state.frontier, progress: v.progress, accuracy: v.accuracy,
      slips: v.slips, slipCap: r.slipCap, outside: r.state.outside,
    };
  }

export function sceneTrackerHint(host:NativeSceneViewHost):{ pos: Vec2; text: string } | null {
    const a = host.stationAnchor('tracker');
    if (!a || !host.nearTracker()) return null;
    return { pos: a.pos, text: 'Linger to open the bestiary.' };
  }

export function sceneUnleashSealsOf(host:NativeSceneViewHost, caster: Actor, inst: SkillInstance):{ count: number; max: number } | null {
    const max = Math.round(caster.sheet.get('unleashMax',
      skillContextTags(inst), instanceMods(inst)));
    if (max <= 0) return null;
    // Mid-cast the bank FREEZES at the press (the HUD shows exactly what
    // the release will spend — the bar banks nothing).
    const restEnd = host.casterMidCastOf(caster, inst)
      ? (inst.state?.pressAt ?? host.time) : host.time;
    const rested = restEnd - (inst.state?.lastUseAt ?? -999);
    return { count: Math.min(max, Math.max(0, Math.floor(rested / UNLEASH_CFG.interval))), max };
  }

export function sceneCasterMidCastOf(host:NativeSceneViewHost, caster: Actor, inst: SkillInstance):boolean {
    return caster.casting?.inst === inst;
  }

export function sceneVoyageLandingView(host:NativeSceneViewHost):{ pos: Vec2; frac: number; ready: boolean; isle: string | null } | null {
    const run = host.voyage;
    if (!run || host.zone.id !== VOYAGE_ZONE_ID) return null;
    const shore = host.nearestShore();
    if (!shore || shore.gap > VOYAGE_CFG.landingProbe) return null;
    return {
      pos: vec(host.player.pos.x, host.player.pos.y),
      frac: clamp(run.landDwell / (VOYAGE_CFG.landingDwell * run.ship.landingMul), 0, 1),
      ready: run.grace <= 0,
      isle: shore.d.land?.islandId ? (host.zoneMap[shore.d.land.islandId]?.name ?? null) : null,
    };
  }

export function sceneFinishNpcDialogue(host:NativeSceneViewHost, actorId: number):void {
    host.npcDialogues.finish(actorId);
    const memory = host.speechMemory.get(actorId);
    if (memory) host.speechMemory.set(actorId, {
      ...memory, spokeAt: host.time, holdSec: 0, readAt: host.time,
    });
  }

export function sceneNpcDialogueReachable(host:NativeSceneViewHost, speakerId: number):boolean {
    return host.speechCandidates(host.localSeat).some(c => c.id === speakerId);
  }

export function sceneDissolveCrackView(host:NativeSceneViewHost):{ d: Doodad; frac: number; from: Vec2; seed: number }[] {
    if (!host.dissolveCracks.size) return [];
    const out: { d: Doodad; frac: number; from: Vec2; seed: number }[] = [];
    for (const [d, from] of host.dissolveCracks) {
      if (d.gone) { host.dissolveCracks.delete(d); continue; }
      const br = doodadRuleOf(d.kind).brittle;
      const t = host.brittleDwell.get(d) ?? 0;
      if (!br?.dwell || t <= 0) continue;
      out.push({ d, frac: Math.min(1, t / br.dwell), from, seed: dissolveSeedOf(d.pos.x, d.pos.y, d.kind) });
    }
    return out;
  }

export function sceneDissolveFloorCrackView(host:NativeSceneViewHost):{ pos: Vec2; radius: number; frac: number; seed: number }[] {
    if (!host.dissolveFloorCracks.length) return [];
    const out: { pos: Vec2; radius: number; frac: number; seed: number }[] = [];
    for (let i = host.dissolveFloorCracks.length - 1; i >= 0; i--) {
      const row = host.dissolveFloorCracks[i];
      if (host.time >= row.until) { host.dissolveFloorCracks.splice(i, 1); continue; }
      const frac = Math.min(1, Math.max(0, (host.time - row.at) / Math.max(1e-3, row.until - row.at)));
      for (const c of row.cells) {
        out.push({ pos: vec(c.x, c.y), radius: c.r, frac, seed: dissolveSeedOf(c.x, c.y, 'ruin_floor_gap') });
      }
    }
    return out;
  }

export function sceneEmergeOf(host:NativeSceneViewHost, a: Actor):EmergeRecord | undefined {
    for (const r of host.emergences) if (r.actorId === a.id) return r;
    return undefined;
  }

export function sceneGloomDarkness(host:NativeSceneViewHost):number {
    if (host.gloomCur <= 0.001) return 0;
    const gf = host.sim.gloamingField;
    return gf ? host.gloomCur * gf.surge().gloomDark : 0;
  }

export function sceneSailPrompt(host:NativeSceneViewHost):string | null {
    if (host.clientActionHook || !host.zone.port) return null;
    const dock = host.portDock();
    return dock && dist(host.player.pos, dock.pos) <= 110 ? 'Linger at the dock to cast off…' : null;
  }

export function sceneSkyBelowDef(host:NativeSceneViewHost):ZoneDef | null {
    return host.skyBelow ? host.zoneMap[host.skyBelow.zoneId] ?? null : null;
  }
