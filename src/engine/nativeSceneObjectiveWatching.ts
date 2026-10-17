/** Native objective observation and fixture work over the actual retained area.
 * The campaign geographic driver stays at its original World dispatch seam. */
import {dist,rand,randInt,vec,type Vec2} from '../core/math';
import {Actor} from './actor';
import {FACTIONS,MONSTERS} from '../data/monsters';
import {type PackTableEntry,type ZoneDef,type ObjectiveSpec} from '../data/zones';
import {BEACON_CFG} from '../data/beacons';
import {LEYLINE_CFG} from '../data/leyline';
import {RIFT_CFG} from '../data/rifts';
import {PYRE_CFG} from '../data/pyres';
import {DIG_CFG} from '../data/digsites';
import type {ContestSpec} from '../data/objectives';
import {biasTable,composeBias} from '../world/overlay';
import {driveNativeBeacon,nativeBeaconConfig,type NativeBeaconHost,type NativeBeaconReinforceConfig,type NativeBeaconTables} from './beaconObjectives';
import {driveNativeRiftPours,finishNativeDig,driveHoldObjectives,resolveHoldContest,type HoldFixture,type HoldObjectiveHost,type HoldObjectiveOptions} from './holdObjectives';
import {driveNativeProcession,nativeProcessionConfig,nativeProcessionSteering,type NativeProcessionConfig,type NativeProcessionState} from './processionObjectives';
import {OFFERING_CFG,packageAskRow,ventureAskRow} from '../data/objectives';
import {sameStory} from './tiers';
import {sidezoneOf} from '../data/sidezones';
import {DWELL_CFG,transitDwell} from '../data/transit';
import type {DwellReach} from '../data/transit';
import {WAVE_CFG} from '../data/waves';
import {Rng} from '../core/rng';
import {factionAllowed} from '../world/zonePolicy';
import {castRay} from './los';
import {dayCycle} from '../world/daynight';
import type {World} from './world';
import type {ObjectiveReadContext} from '../data/objectives';
import type {OccEnv} from './los';
export interface NativeSceneObjectiveWatchingHost extends ObjectiveReadContext,OccEnv {
 admitBirth?(body:Actor):void;
 /** Retained attendance only; ordinary finite callers retain their original player law. */
 isPresentLocalPlayer?():boolean;
 notice:World['notice'];
 actorById:World['actorById'];
 actors:World['actors'];
 altars:World['altars'];
 baseTable:World['baseTable'];
 caveEntrances:World['caveEntrances'];
 chartNeighborsOf:World['chartNeighborsOf'];
 clampNear:World['clampNear'];
 clampPos:World['clampPos'];
 completeObjective:World['completeObjective'];
 completedObjectives:World['completedObjectives'];
 contestPressers:World['contestPressers'];
 countedEnemies:World['countedEnemies'];
 createMonster:World['createMonster'];
 cull:World['cull'];
 digs:World['digs'];
 driveHoldFixtures:World['driveHoldFixtures'];
 dropGemAt:World['dropGemAt'];
 dropRuleOf:World['dropRuleOf'];
 drops:World['drops'];
 dwellReachable:World['dwellReachable'];
 effectiveSpawn:World['effectiveSpawn'];
 enemiesOf:World['enemiesOf'];
 escapeTimer:World['escapeTimer'];
 farPoint:World['farPoint'];
 findFreeSpot:World['findFreeSpot'];
 flashes:World['flashes'];
 heldFixture:World['heldFixture'];
 kills:World['kills'];
 lairAskView:World['lairAskView'];
 ledger:World['ledger'];
 livingSpawners:World['livingSpawners'];
 lures:World['lures'];
 markDoodadsChanged:World['markDoodadsChanged'];
 massHoldHost:World['massHoldHost'];
 massObjectiveBeaconTables:World['massObjectiveBeaconTables'];
 massObjectiveSpawnTable:World['massObjectiveSpawnTable'];
 massProcessionReachable:World['massProcessionReachable'];
 massRuntime:World['massRuntime'];
 mintVeil:World['mintVeil'];
 moveActor:World['moveActor'];
 nativeBeaconHost:World['nativeBeaconHost'];
 nativeProcessionBodies:World['nativeProcessionBodies'];
 nearestHand:World['nearestHand'];
 objectiveCountable:World['objectiveCountable'];
 objectiveDone:World['objectiveDone'];
 objectiveLatch:World['objectiveLatch'];
 objectiveLost:World['objectiveLost'];
 offering:World['offering'];
 ownSpoils:World['ownSpoils'];
 packageAskEngaged:World['packageAskEngaged'];
 packageAskView:World['packageAskView'];
 pathField:World['pathField'];
 player:World['player'];
 procession:World['procession'];
 puzzles:World['puzzles'];
 pyres:World['pyres'];
 rayElev:World['rayElev'];
 refreshExitLabels:World['refreshExitLabels'];
 resolveContest:World['resolveContest'];
 rifts:World['rifts'];
 roofedStructureAt:World['roofedStructureAt'];
 setLure:World['setLure'];
 sidezoneIdFor:World['sidezoneIdFor'];
 spawnProcessionAmbush:World['spawnProcessionAmbush'];
 spawnWave:World['spawnWave'];
 spireReinforceAt:World['spireReinforceAt'];
 spires:World['spires'];
 storyPair:World['storyPair'];
 surveyAround:World['surveyAround'];
 surveyed:World['surveyed'];
 time:World['time'];
 updateRiftPours:World['updateRiftPours'];
 ventureAskView:World['ventureAskView'];
 visited:World['visited'];
 wave:World['wave'];
 waveActive:World['waveActive'];
 waveTimer:World['waveTimer'];
 waypointPos:World['waypointPos'];
 weightedPick:World['weightedPick'];
 zone:World['zone'];
 zoneEnteredAt:World['zoneEnteredAt'];
 zoneMap:World['zoneMap'];
}

export function sceneUpdateObjective(host:NativeSceneObjectiveWatchingHost, dt: number): void {

    const o = host.zone.objective;
    switch (o.kind) {
      case 'safe':
        return; // sanctuaries ask nothing

      case 'none':
        return; // hostile ground with no errand: nothing completes, nothing pays

      case 'clear':
        // THE CULL: the ask is `need` felled (tallied at the kill chokepoint
        // — worldKillRules 'clear_cull_tally'), not an empty floor. The
        // EMPTY FLOOR still completes regardless of the tally: the mercy
        // rule (sparse ground can never ask more than it holds — and a
        // remembered old-save ask can never wedge), and the WHOLE law on
        // `all: true` ground, where cull state never stands.
        if (!host.objectiveDone) {
          if (host.cull && host.cull.kills >= host.cull.need) {
            host.completeObjective(`${host.zone.name} culled!`);
          } else if (host.countedEnemies().length === 0) {
            host.completeObjective(`${host.zone.name} cleared!`);
          }
        }
        return;

      case 'boss':
        if (!host.objectiveDone
          && !host.actors.some(a => !a.dead && a.defId === o.id)) {
          host.completeObjective(`${MONSTERS[o.id].name} slain!`);
        }
        return;

      case 'lair': {
        // THE ADOPTED ASK (THE ADOPTIVE LANE, data/objectives.ts): the zone
        // adopted a feature its own mint stood up. DEN mode watches the den
        // country's own completion through the derived pocket id (the
        // gateway machinery IS the persistence — a settled den completes
        // the parent on the walk back out); HUNT mode is pure population
        // over the claim's kin (any death counts — the bounty's honesty;
        // wounded keepers ride Zone Memory free). A bound feature that no
        // longer stands completes vacuously (the puzzle's no-wedge law).
        if (host.objectiveDone) return;
        const v = host.lairAskView();
        if (!v || v.done) {
          // THE UNTITLED CLAIM (her ruling, 2026-08-07): the floater
          // speaks the deed, never the name — identity lives in the
          // mouth's own visual.
          host.completeObjective(!v || v.mode === 'den'
            ? 'The lair is cleared!'
            : 'The lair is broken!');
        }
        return;
      }

      case 'package': {
        // THE ADOPTED GUEST (THE ADOPTIVE LANE's PACKAGE CLASS,
        // data/objectives.ts registerPackageAsk): the ask is a roving package
        // presence host ground hosts — the fracture is the debut. THE SURVIVE
        // CONTRACT (her law, 2026-08-03): engage the guest and live to the
        // end of its run; success or fail BOTH bank (the run's own verdict is
        // the package's business — a "too slow" collapse still completes the
        // zone), only dying out from under it banks nothing. A guest gone
        // unanswered HANDS THE ASK BACK (the transience doctrine): the bare
        // cull returns mid-visit — host visit completes on the empty-floor
        // law, the next load re-derives the cull stamp — and a later guest
        // may adopt afresh at load on its own coin.
        if (host.objectiveDone) return;
        const v = host.packageAskView();
        if (v?.standing) {
          if (v.engaged) host.packageAskEngaged = true;
          return;
        }
        // The guest is gone (its run ended, it moved on, or its package left
        // host world). An engagement seen through by a LIVING player banks —
        // the frame order (driver before the fracture runtime) means we read
        // the end one tick after it landed, alive-now being the honest read.
        if (host.isPresentLocalPlayer?.() === false) return;
        if (host.packageAskEngaged && !host.player.dead) {
          host.completeObjective(`${o.title} is seen through!`);
        } else {
          host.packageAskEngaged = false;
          host.zone.objective = { kind: 'clear' };
        }
        return;
      }

      case 'venture': {
        // THE ADOPTED VENTURE (THE ADOPTIVE LANE's VENTURE CLASS,
        // data/objectives.ts registerVentureAsk): a standing winnable-or-
        // losable feature took the ask — the sealed holdfast gate is the
        // debut. The ask completes ONLY through the venture's own verbs
        // (verdict 'won' — the toll paid, the gate unbarred, the slaughter
        // gamble BURST it open: the fabric's own resolved state is the one
        // truth, drawn == tested). THE FAIL ARM (her ruling, 2026-08-04):
        // the player's own actions may FAIL it (verdict 'lost' — the
        // wardens murdered, the gate held), and a lost venture hands the
        // ask back to the bare cull IN-VISIT — no completion, no
        // punishment: host visit completes on the empty-floor law, the
        // next load re-derives the cull stamp. Player agency is the point —
        // murdering the wardens is a road, it just isn't THIS road.
        if (host.objectiveDone) return;
        const v = host.ventureAskView();
        if (v?.verdict === 'standing') return;
        if (v?.verdict === 'won') {
          // THE RESOLUTION LATCH (her ruling, 2026-08-07): the win's own
          // prose takes the objective LINE while the linger gates run —
          // the banking itself stays at the resolution instant (chest,
          // seals, XP timing byte-unchanged; only the TEXT lingers).
          const line = v.wonText ?? `${o.title} · Complete`;
          host.objectiveLatch = { text: line, at: host.time, kills: host.kills };
          host.completeObjective(line);
          return;
        }
        // 'lost' — or the row's fabric left host world: THE HAND-BACK.
        if (v) {
          // THE RESOLUTION LATCH replaces the old transient red floater
          // (her reduce-on-screen-text word, 2026-08-07): the forfeit
          // prose holds the objective LINE instead — one seat, no double
          // text. A vanished fabric (v null) stays silent, as it always
          // was: nothing resolved, there is no prose to hold.
          host.objectiveLatch = {
            text: v.lostText ?? `${o.title} · Lost`,
            at: host.time, kills: host.kills,
          };
        }
        host.zone.objective = { kind: 'clear' };
        return;
      }

      case 'spawners':
        if (!host.objectiveDone && host.livingSpawners().length === 0) {
          host.completeObjective('Spawners destroyed!');
        }
        return;

      case 'puzzle': {
        // THE RIDDLE (engine/puzzles.ts): the run itself is driven by the
        // fabric (resolveHit routes, updatePuzzles ticks); host watcher only
        // banks the objective when it resolves. A placer that stood nothing
        // up (unknown preset — already warned) completes vacuously rather
        // than wedge the zone's chest forever.
        if (host.objectiveDone) return;
        const run = host.puzzles.find(r => r.isObjective);
        if (!run || run.done) {
          host.completeObjective(`${run ? (run.spec.label ?? run.kind.label) : 'the riddle'} resolved!`);
        }
        return;
      }

      case 'beacon': {
        // SURVEY SPIRES under THE CONTEST LAW (driveHoldFixtures): presence
        // inside a stone's hold ring builds ITS charge — but only on ground
        // truly held (any counted enemy in the contest ring STALLS the work,
        // a crowd DRAINS banked seconds, attended or not: the lure's own
        // drawn moths smother an abandoned stone back down). Every stone
        // with banked, unfinished charge holds a LURE, so the fight migrates
        // with your work — and while the operation lives the leyline BLEEDS
        // (updateSpireReinforce): reinforcements arrive at the rim and
        // drift in on the standing pull. When the last stone fills, the
        // flare SURVEYS a seeded random assortment of the country (the
        // recon cap), not the whole disc. count 1 = the lone spire; 2+ =
        // the ATTUNEMENT CIRCUIT (same rules, smaller stones).
        if (host.objectiveDone || !host.spires.length) return;
        const circuit = host.spires.length > 1;
        const cfg=nativeBeaconConfig({...o,count:host.spires.length}),state={reinforceAt:host.spireReinforceAt};
        const need=cfg.need;
        driveNativeBeacon(dt,host.spires,cfg,state,host.massHoldHost(false),host.nativeBeaconHost());
        host.spireReinforceAt=state.reinforceAt;
        if (host.spires.every(s => s.charge >= need)) {
          host.surveyAround(host.zone,
            o.revealRadius ?? BEACON_CFG.revealRadius,
            o.revealCount ?? BEACON_CFG.revealCount);
          host.completeObjective(circuit
            ? 'The circuit hums as one — the land is surveyed!'
            : 'The spire flares — the land is surveyed!');
          // The flare and newly charted places carry the local result.
        }
        return;
      }

      case 'leyline': {
        // THE BESIEGED WAYPOINT: pure population state (the bounty's
        // honesty — any death counts, the wounded thief rides Zone Memory
        // free). The moment no siphon stands, the leyline reattaches and
        // the stone hums awake; a rosterless zone that spawned no thief
        // completes vacuously (the puzzle's no-wedge law). The attunement
        // refusal itself lives on waypointBesieged — one predicate for the
        // brush, the HUD, and the drawn face.
        if (host.objectiveDone) return;
        if (!host.actors.some(a => !a.dead && a.tag === 'ley_siphon')) {
          if (host.waypointPos) {
            host.flashes.push({ pos: vec(host.waypointPos.x, host.waypointPos.y), radius: 160, color: LEYLINE_CFG.accent, life: 0.9, maxLife: 0.9 });
          }
          host.completeObjective('The siphon is broken — the waypoint is freed!');
        }
        return;
      }

      case 'rifts': {
        // SEAL THE RIFTS: the contest driver seals, the pour fights back —
        // every OPEN tear births its bounded trickle (updateRiftPours), and
        // those births are counted population, so the tear literally
        // contests its own seal. Sealed tears pour nothing and stay sealed
        // (the charge array rides Zone Memory).
        if (host.objectiveDone || !host.rifts.length) return;
        const need = o.sealSec ?? transitDwell('rift', RIFT_CFG.sealSec);
        host.driveHoldFixtures(dt, {
          fixtures: host.rifts, need,
          transitKind: 'rift', holdFallback: 120,
          contest: host.resolveContest(RIFT_CFG.contest),
          doneKind: RIFT_CFG.kindSealed,
          accent: RIFT_CFG.accent, flareColor: RIFT_CFG.accent, flareR: 150,
          stirText: 'the seal takes — the tear howls against it…',
        });
        host.updateRiftPours(o);
        if (host.rifts.every(s => s.charge >= need)) {
          host.completeObjective('The last rift is sealed — the ground rests!');
        }
        return;
      }

      case 'pyres': {
        // KINDLE THE PYRES: the contest driver kindles; the lit kind is a
        // REGISTERED lightwell (data/pyres.ts), so the payoff is real light
        // the moment the bowl catches — no extra machinery here.
        if (host.objectiveDone || !host.pyres.length) return;
        const need = o.kindleSec ?? transitDwell('pyre', PYRE_CFG.kindleSec);
        host.driveHoldFixtures(dt, {
          fixtures: host.pyres, need,
          transitKind: 'pyre', holdFallback: 110,
          contest: host.resolveContest(PYRE_CFG.contest),
          doneKind: PYRE_CFG.kindLit,
          accent: PYRE_CFG.accent, flareColor: PYRE_CFG.accent, flareR: 130,
          stirText: 'the kindling catches — hold the ground…',
        });
        if (host.pyres.every(s => s.charge >= need)) {
          host.completeObjective('Every pyre burns — the dark gives ground!');
        }
        return;
      }

      case 'unearth': {
        // UNEARTH THE CACHES: the contest driver digs; an opened mound
        // SPILLS through the ordinary drop chokepoint (the spoils law still
        // governs sealed ground) and may SPRING the zone's own kin out of
        // the turned earth.
        if (host.objectiveDone || !host.digs.length) return;
        const need = o.digSec ?? transitDwell('digsite', DIG_CFG.digSec);
        host.driveHoldFixtures(dt, {
          fixtures: host.digs, need,
          transitKind: 'digsite', holdFallback: 100,
          contest: host.resolveContest(DIG_CFG.contest),
          doneKind: DIG_CFG.kindDug,
          accent: DIG_CFG.accent, flareColor: DIG_CFG.accent, flareR: 110,
          stirText: 'the spade bites — stand your ground…',
          onFill: s => {
            finishNativeDig(s,DIG_CFG,{
              hasPacks:!!host.zone.packs,random:{range:rand,int:randInt},
              spillGem:pos=>{
                const d0=host.drops.length;
                host.dropGemAt(pos);
                if(host.dropRuleOf)host.ownSpoils(d0,host.nearestHand([s.pos])); // THE OWNER STAMP (card 27): the digger's
              },
              ambush:(pos,A)=>{
                const {table}=host.effectiveSpawn(host.zone,host.baseTable(host.zone));
                const type=host.weightedPick(table,host.zone.level),n=randInt(A.count[0],A.count[1]);
                for(let i=0;i<n;i++){
                  const m=host.createMonster(type,Math.max(1,host.zone.level+A.levelBonus),'enemy');
                  const ang=rand(0,Math.PI*2),rr=rand(A.radius[0],A.radius[1]);
                  m.pos=host.clampPos(vec(pos.x+Math.cos(ang)*rr,pos.y+Math.sin(ang)*rr),m.radius);host.actors.push(m);host.admitBirth?.(m);
                }
              },text:()=>{}, // Turned earth, native flare and emerging creatures show the ambush.
            });
          },
        });
        if (host.digs.every(s => s.charge >= need)) {
          host.completeObjective('Every cache is unearthed!');
        }
        return;
      }

      case 'bounty': {
        // THE BOUNTY WRIT: pure population state — the hunt is over when no
        // marked quarry stands (any death counts; the per-writ beat rides the
        // kill-handler fabric). An emptied board completes like a cleared zone.
        if (!host.objectiveDone
          && !host.actors.some(a => !a.dead && a.tag === 'bounty_mark')) {
          host.completeObjective('Every writ is claimed!');
        }
        return;
      }

      case 'offering': {
        // THE OFFERING: the feed itself happens at the kill chokepoint
        // (worldKillRules 'offering_altar_feed'); host drives only the
        // completion latch. The STALL is never latched — it is DERIVED from
        // the living population each frame (objectiveText), so any world
        // event that brings new blood revives the hunt by existing.
        const of = host.offering;
        if (host.objectiveDone || !of) return;
        if (of.offered >= of.need) {
          const al = host.altars[of.altarIdx];
          if (al) {
            host.flashes.push({ pos: vec(al.pos.x, al.pos.y), radius: al.def.radius, color: OFFERING_CFG.accent, life: 0.9, maxLife: 0.9 });
          }
          host.completeObjective('The altar is sated!');
        }
        return;
      }

      case 'procession': {
        const pr=host.procession;if(!pr)return;
        const state:NativeProcessionState={...pr,enteredAt:host.zoneEnteredAt,done:host.objectiveDone,lost:host.objectiveLost};
        let justLost=false;
        driveNativeProcession(dt,state,nativeProcessionConfig(o),{
          now:host.time,player:host.player,isPresentPlayer:host.isPresentLocalPlayer,random:{range:rand,int:randInt},actorById:id=>host.actorById(id)??null,
          reachable:(p,c,r)=>host.massProcessionReachable(p,c,r),enemiesOf:a=>host.enemiesOf(a),
          steering:(cart,to)=>nativeProcessionSteering(cart,to,host.pathField()),
          move:(a,dx,dy,step)=>host.moveActor(a,dx,dy,step),
          lure:(a,c)=>host.setLure('procession',a.pos,c.lureRadius,c.lurePace,c.lureStandoff,c.lureLinger,a.tier),
          flash:(pos,radius,color,life)=>host.flashes.push({pos,radius,color,life,maxLife:life}),
          robbersAlive:()=>host.actors.filter(a=>!a.dead&&a.tag==='procession_robber').length,
          spawnAmbush:(a,h,n,c)=>host.spawnProcessionAmbush(a,h,n,c),
          wreck:cart=>host.dropGemAt(cart.pos),lose:()=>{host.objectiveLost=true;justLost=true;},
          win:()=>host.completeObjective('The caravan arrives — the road held!'),
        });
        const {enteredAt:_enteredAt,done,lost,...progress}=state;
        Object.assign(pr,progress);host.objectiveDone=done;host.objectiveLost=lost;
        // The original loss speaks after wreck effects and the cleared cart id.
        if(justLost)host.notice('The caravan is lost — its bounty with it.', '#d05050', 16, 'events');
        return;
      }

      case 'escape': {
        // The zone never empties — pressure until you find the way out.
        // (The bounty pays when you step through a portal.)
        host.escapeTimer -= dt;
        if (host.escapeTimer <= 0) {
          host.escapeTimer = rand(o.interval[0], o.interval[1]);
          if (host.countedEnemies().length < 24 && host.zone.packs && host.isPresentLocalPlayer?.() !== false) {
            const at = host.farPoint(740);
            const { table } = host.effectiveSpawn(host.zone, host.baseTable(host.zone));
            const type = host.weightedPick(table, host.zone.level);
            const n = randInt(2, 4);
            for (let i = 0; i < n; i++) {
              const m = host.createMonster(type, host.zone.level, 'enemy');
              m.pos = host.clampPos(vec(at.x + rand(-70, 70), at.y + rand(-70, 70)), m.radius);
              host.actors.push(m);host.admitBirth?.(m);
            }
            host.flashes.push({ pos: vec(at.x, at.y), radius: 50, color: host.zone.theme.accent, life: 0.4, maxLife: 0.4 });
          }
        }
        return;
      }

      case 'waves': {
        const enemies = host.countedEnemies();
        if (host.waveActive && enemies.length === 0) {
          host.waveActive = false;
          host.waveTimer = WAVE_CFG.intermission;
          if (o.waves > 0 && host.wave >= o.waves) {
            host.completeObjective('The assault is broken!');
          }
        }
        if (!host.waveActive && !host.objectiveDone) {
          host.waveTimer -= dt;
          if (host.waveTimer <= 0) host.spawnWave();
        }
        return;
      }
    }
  }

export function sceneLairAskView(host:NativeSceneObjectiveWatchingHost): {
    mode: 'den' | 'hunt'; title: string; pos: Vec2 | null;
    remain: number; entered: boolean; done: boolean; label: string;
  } | null {
    const o = host.zone.objective;
    if (o.kind !== 'lair') return null;
    if (o.mouthKind) {
      const mouths = host.caveEntrances.filter(cm => cm.kind === o.mouthKind);
      const done = !mouths.length || mouths.some(cm => host.completedObjectives.has(
        host.sidezoneIdFor(host.zone.id, cm.kind, cm.seed, cm.underSpan)));
      const sz = sidezoneOf(o.mouthKind);
      const entered = !!(sz?.ledgerOnEnter && (host.ledger[sz.ledgerOnEnter] ?? 0) > 0);
      const m = mouths[0] ?? null; // harvest order — deterministic per layout
      // THE UNTITLED CLAIM (her ruling, 2026-08-07): the chevron label is
      // player-facing objective prose — title-free like the HUD line; the
      // `title` field itself stays on the view as DATA (dev surfaces).
      return {
        mode: 'den', title: o.title, pos: m ? vec(m.pos.x, m.pos.y) : null,
        remain: done ? 0 : 1, entered, done, label: 'brave the lair',
      };
    }
    const kin = new Set(o.kin ?? []);
    const live = host.actors.filter(a => !a.dead && a.team === 'enemy' && a.defId && kin.has(a.defId));
    const m = live[0] ?? null;
    return {
      mode: 'hunt', title: o.title, pos: m ? vec(m.pos.x, m.pos.y) : null,
      remain: live.length, entered: false, done: live.length === 0,
      label: `${live.length} keeper${live.length === 1 ? '' : 's'} left`,
    };
  }

export function scenePackageAskView(host:NativeSceneObjectiveWatchingHost): {
    pkg: string; title: string; standing: boolean; engaged: boolean;
    pos: Vec2 | null; label: string;
  } | null {
    const o = host.zone.objective;
    if (o.kind !== 'package') return null;
    const row = packageAskRow(o.pkg);
    if (!row) return null;
    const s = row.view(host, host.zone, o.key);
    return {
      pkg: o.pkg, title: o.title, standing: s.standing, engaged: s.engaged,
      pos: s.pos ? vec(s.pos.x, s.pos.y) : null, label: s.label,
    };
  }

export function sceneVentureAskView(host:NativeSceneObjectiveWatchingHost): {
    ventureId: string; title: string; verdict: 'standing' | 'won' | 'lost';
    pos: Vec2 | null; label: string; wonText?: string; lostText?: string;
  } | null {
    const o = host.zone.objective;
    if (o.kind !== 'venture') return null;
    const row = ventureAskRow(o.venture);
    if (!row) return null;
    const s = row.view(host, host.zone, o.key);
    return {
      ventureId: o.venture, title: o.title, verdict: s.verdict,
      pos: s.pos ? vec(s.pos.x, s.pos.y) : null, label: s.label,
      ...(s.wonText !== undefined ? { wonText: s.wonText } : {}),
      ...(s.lostText !== undefined ? { lostText: s.lostText } : {}),
    };
  }

export function sceneMassHoldHost(host:NativeSceneObjectiveWatchingHost, scoped = true): HoldObjectiveHost {
    return {
      player: host.player,
      isPresentPlayer: host.isPresentLocalPlayer,
      reachable: (s, reach) => host.dwellReachable(host.player.pos, s.pos, reach, host.storyPair(host.player, s.doodad)),
      pressers: (s, contest) => host.contestPressers(s, contest),
      held: s => { if (!scoped || s) host.heldFixture = s; },
      // Native charge rings, flashes and changing fixture faces show the work.
      text: () => {},
      flash: (pos, radius, color, life) => host.flashes.push({ pos, radius, color, life, maxLife: life }),
      changed: () => host.markDoodadsChanged(),
    };
  }

export function sceneMassProcessionReachable(host:NativeSceneObjectiveWatchingHost, player:Actor, cart:Actor, reach:DwellReach): boolean {
    return host.dwellReachable(player.pos,cart.pos,reach,host.storyPair(player,cart));
  }

export function sceneNativeBeaconHost(host:NativeSceneObjectiveWatchingHost): NativeBeaconHost {
    return {now:host.time,level:host.zone.level,player:host.player.pos,isPresentPlayer:host.isPresentLocalPlayer,random:{range:rand,int:randInt},
      born:()=>host.actors.filter(a=>!a.dead&&a.tag==='spire_drawn').length,
      tables:(at,cfg)=>host.massObjectiveBeaconTables(host.zone,at,cfg),
      spawn:(fixture,count,cfg,tables)=>{
        for(let i=0;i<count;i++){
          const table=tables.mix.length&&(!tables.native.length||rand(0,1)<cfg.mixChance)?tables.mix:tables.native;
          const type=host.weightedPick([...table],host.zone.level);
          const m=host.createMonster(type,Math.max(1,host.zone.level+cfg.levelBonus),'enemy');
          const angle=rand(0,Math.PI*2),radius=rand(cfg.radius[0],cfg.radius[1]);
          m.pos=host.clampPos(vec(fixture.pos.x+Math.cos(angle)*radius,fixture.pos.y+Math.sin(angle)*radius),m.radius);
          m.tag='spire_drawn';host.actors.push(m);host.admitBirth?.(m);
        }
        return count;
      },
      lure:(fixture,slot,cfg)=>host.setLure('survey_spire_'+slot,fixture.pos,cfg.lureRadius,cfg.lurePace,cfg.lureStandoff,undefined,0),
      flash:(pos,radius,color,life)=>host.flashes.push({pos,radius,color,life,maxLife:life})};
  }

export function sceneContestPressers(host:NativeSceneObjectiveWatchingHost, s: HoldFixture, contest: ContestSpec): number {
    let n = 0;
    const contestReach = contest.reach ?? DWELL_CFG.reach;
    for (const a of host.actors) {
      if (!a.dead && sameStory(a, s.doodad) && dist(a.pos, s.pos) <= contest.radius && host.objectiveCountable(a)
        && host.dwellReachable(a.pos, s.pos, contestReach, host.storyPair(a, s.doodad))) n++;
    }
    return n;
  }

export function sceneResolveContest(host:NativeSceneObjectiveWatchingHost, base: ContestSpec): ContestSpec | null {
    return resolveHoldContest(base, host.zone.objective.contest);
  }

export function sceneSetLure(host:NativeSceneObjectiveWatchingHost, id: string, pos: Vec2, radius: number, pace: number, standoff: number, linger = 0.6, tier?: number): void {
    // `tier`: the story the lure lies on (the investigation-crosses law) —
    // a drawn body on another story walks the crossing before it can mill
    // at the standoff; undefined keeps the flat read.
    host.lures.set(id, { pos: vec(pos.x, pos.y), radius, pace, standoff, until: host.time + linger, tier });
  }

export function sceneSpawnProcessionAmbush(host:NativeSceneObjectiveWatchingHost, cart:Actor, heading:number, count:number, cfg:NativeProcessionConfig): number {
    const bodies=host.nativeProcessionBodies(cart,heading,count,host.zone,cfg,host.zone.id);
    for(const m of bodies){
      host.actors.push(m);host.admitBirth?.(m);host.flashes.push({pos:{...m.pos},radius:cfg.ambushFlare.radius,color:cfg.smoke,life:cfg.ambushFlare.life,maxLife:cfg.ambushFlare.life});
    }
    return bodies.length;
  }

export function sceneNativeProcessionBodies(host:NativeSceneObjectiveWatchingHost, cart:Actor, heading:number, count:number, zone:Readonly<ZoneDef>, cfg:NativeProcessionConfig, owner:string, origin:Vec2=cart.pos): Actor[] {
    const lvl=Math.max(1,zone.level),base=vec(origin.x+Math.cos(heading)*cfg.puffLead,origin.y+Math.sin(heading)*cfg.puffLead),out:Actor[]=[];
    for(let i=0;i<count;i++){
      const type=host.weightedPick(cfg.robbers as PackTableEntry[],lvl);if(!MONSTERS[type])continue;
      const m=host.createMonster(type,lvl,'enemy');
      const at=vec(base.x+rand(-cfg.puffJitter,cfg.puffJitter),base.y+rand(-cfg.puffJitter,cfg.puffJitter));
      m.pos=host.clampPos(host.findFreeSpot(at,m.radius+2)??host.clampNear(cart.pos,150),m.radius);
      m.tag='procession_robber';m.eventKey='procession:'+owner;
      const ag=m.defId?MONSTERS[m.defId]?.aggro:undefined;
      m.aiTuning={target:{prefer:'highestThreat',relentless:true,stickiness:cfg.fixation.stickiness,
        threat:{damage:ag?.fury??1,decay:cfg.fixation.decay*(ag?.waver??1)}}};
      m.addThreat(cart.id,cfg.fixation.seedThreat*(ag?.fixation??1));m.aiTargetId=cart.id;m.aggroed=true;m.aiAwakened=true;out.push(m);
    }
    return out;
  }

export function sceneSurveyAround(host:NativeSceneObjectiveWatchingHost, origin: ZoneDef, radius: number, cap?: number): number {
    const dim = origin.dimension ?? 'surface';
    const inPulse = (z: ZoneDef): boolean =>
      (z.dimension ?? 'surface') === dim && z.caveDepth == null && !z.pocket
      && Math.hypot(z.map.x - origin.map.x, z.map.y - origin.map.y) <= radius;
    const chartable = (z: ZoneDef): boolean =>
      z.objective.kind !== 'safe' && !z.floating && !z.eventOwned;
    if (cap !== undefined) {
      // THE RECON CAP — the spire's bounded flare.
      const news = Math.max(0, Math.floor(cap));
      const picked: ZoneDef[] = [];
      host.mintVeil = true; // structural mints stay forechart-veiled
      try {
        // Your own doors always answer the flare (a no-op on halo-charted
        // ground — the horizon already resolved them).
        host.chartNeighborsOf(origin);
        const cands = Object.values(host.zoneMap).filter(z =>
          z.id !== origin.id && inPulse(z) && chartable(z)
          && !host.visited.has(z.id) && !host.surveyed.has(z.id));
        const rng = new Rng(((origin.seed ?? 0) ^ BEACON_CFG.revealSalt) >>> 0);
        for (let i = 0; i < news && cands.length; i++) {
          picked.push(cands.splice(rng.int(0, cands.length - 1), 1)[0]);
        }
        for (const z of picked) {
          host.chartNeighborsOf(z);   // a surveyed node is a REAL node — roads and all
          z.concealed = false;        // recon out-scries concealment
          z.veiled = false;           // …and pierces the forechart's veil
          host.surveyed.add(z.id);
        }
      } finally {
        host.mintVeil = false;
      }
      host.refreshExitLabels();
      return picked.length;
    }
    // THE WHOLE-DISC PULSE (the harbor chart's paid promise) — unchanged.
    const charted = new Set<string>();
    for (;;) {
      const batch = Object.values(host.zoneMap).filter(z =>
        !charted.has(z.id) && inPulse(z) && chartable(z));
      if (!batch.length) break;
      for (const z of batch) {
        charted.add(z.id);
        host.chartNeighborsOf(z);
      }
    }
    let news = 0;
    for (const z of Object.values(host.zoneMap)) {
      if (!inPulse(z)) continue;
      if (z.concealed) z.concealed = false; // recon out-scries concealment
      if (z.veiled) z.veiled = false;       // …and pierces the forechart's veil
      if (!host.surveyed.has(z.id) && !host.visited.has(z.id)) news++;
      host.surveyed.add(z.id);
    }
    // The doors answer the pulse at once: a survey that just named host
    // zone's neighbours renames the standing portals too (the entry law) —
    // the flare buys the name AND the door admits it.
    host.refreshExitLabels();
    return news;
  }

export function sceneUpdateRiftPours(host:NativeSceneObjectiveWatchingHost, o: Extract<ObjectiveSpec, { kind: 'rifts' }>): void {
    driveNativeRiftPours(host.rifts,o.sealSec??transitDwell('rift',RIFT_CFG.sealSec),RIFT_CFG.pour,RIFT_CFG.accent,{
      now:host.time,level:host.zone.level,hasPacks:!!host.zone.packs,
      born:()=>host.actors.filter(a=>!a.dead&&a.tag==='rift_born').length,random:{range:rand,int:randInt},
      spawn:(fixture,count,P)=>{
        const {table}=host.effectiveSpawn(host.zone,host.baseTable(host.zone));
        for(let i=0;i<count;i++){
          const type=host.weightedPick(table,host.zone.level);
          const m=host.createMonster(type,Math.max(1,host.zone.level+P.levelBonus),'enemy');
          const ang=rand(0,Math.PI*2),rr=rand(P.radius[0],P.radius[1]);
          m.pos=host.clampPos(vec(fixture.pos.x+Math.cos(ang)*rr,fixture.pos.y+Math.sin(ang)*rr),m.radius);
          m.tag='rift_born';host.actors.push(m);host.admitBirth?.(m);
        }
        return count;
      },
      flash:(pos,radius,color,life)=>host.flashes.push({pos,radius,color,life,maxLife:life}),
    });
  }

export function sceneDriveHoldFixtures(host:NativeSceneObjectiveWatchingHost, dt: number, opts: HoldObjectiveOptions): ReturnType<typeof driveHoldObjectives> {
    return driveHoldObjectives(dt, opts, host.massHoldHost(false));
  }

export function sceneDwellReachable(host:Pick<NativeSceneObjectiveWatchingHost,'roofedStructureAt'|'rayElev'> & OccEnv, from: Vec2, target: Vec2, reach: DwellReach = DWELL_CFG.reach, story?: { from?: number; to?: number }): boolean {
    // THE SAME-STORY LAW (the tier fabric, 2026-09-06): a dwell never
    // crosses a story — the inn's door does not swing from the rooms above
    // it, a ground-floor counter serves no one standing over it upstairs.
    if (story && story.from !== undefined && story.to !== undefined && story.from !== story.to) return false;
    if (reach === 'radius') return true;
    if (reach === 'roof') {
      const home = host.roofedStructureAt(target);
      if (home) return host.roofedStructureAt(from) === home;
    }
    const hit = castRay(host, from, target, DWELL_CFG.sightChannel,
      host.rayElev(from, target, story?.from, story?.to));
    return !hit || hit.d >= dist(from, target) - DWELL_CFG.sightSlack;
  }

export function sceneStoryPair(host:object, from: { tier?: number }, to?: { tier?: number } | null): { from: number; to: number } {
    return { from: from.tier ?? 0, to: to?.tier ?? 0 };
  }

export function sceneMassObjectiveBeaconTables(host:NativeSceneObjectiveWatchingHost, zone:Readonly<ZoneDef>, at:Vec2, config:NativeBeaconReinforceConfig): NativeBeaconTables {
    const native=zone.packs?host.massObjectiveSpawnTable(zone,at).filter(row=>!!MONSTERS[row.id]).map(row=>({id:row.id,weight:row.weight,...(row.presence===undefined?{}:{presence:row.presence})})):[];
    const mix:PackTableEntry[]=[];
    for(const id of config.mixFactions)for(const row of FACTIONS[id]?.table??[])
      if(MONSTERS[row.id])mix.push({id:row.id,weight:row.weight,...(row.presence===undefined?{}:{presence:row.presence})});
    return {native,mix};
  }

export function sceneMassObjectiveSpawnTable(host:NativeSceneObjectiveWatchingHost, zone:Readonly<ZoneDef>, at:Vec2): PackTableEntry[] {
    const mass=host.massRuntime;
    if(!mass)return host.effectiveSpawn(zone,host.baseTable(zone)).table;
    const parts=[dayCycle(host.time).bias];
    if(mass.weather)parts.push(mass.weather.affectSpawns(mass.walk.at(at.x,at.y),zone));
    const resolved=biasTable(zone.packs?.table??[],composeBias(parts));
    const allowed=resolved.filter(e=>factionAllowed(MONSTERS[e.id]?.faction??'',zone));
    return (allowed.length?allowed:resolved).map(row=>({...row}));
  }
