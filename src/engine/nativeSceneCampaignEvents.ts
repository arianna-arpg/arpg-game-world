/** Exact original42 campaign/interleaved frame CampaignEvents closure.
 * Runtime ownership and native scheduling are separate concrete bindings. */
import type {NativeAreaDirectoryView} from '../worldmass/nativeAreaDirectoryView';
import type {NativeSceneCampaignFrameClosureHost} from "./nativeSceneCampaignFrameClosureHost";
import { settleCosmetics } from '../meta/cosmetics';
import { DEED_CFG } from '../data/classdeeds';
import { vec } from '../core/math';
import { CLASSES } from '../data/classes';
import { START_ZONE, type ZoneDef } from '../data/zones';
import { placeZoneAt, settleWeb, webDisturbance, WEB_CFG } from './worldgen';
import { withSeededRandom } from '../core/rng';
import { patronFaction, biomesForFaction, OCEAN_BIOME } from '../world/biomes';
import { coordDist, type MapCoord } from '../world/coords';
import { FORECHART_CFG, forechartSource, zonesWithin } from '../world/forechart';
import { OMEN_CFG, collectOmens, omenLine, omenReach } from '../world/omens';
import { HARBORHOLD_CFG, holdClassOf } from '../data/harborholds';
import { holdGateDoor, holdStructureIn } from '../world/harborholds';
import { dimensionDef } from '../world/dimensions';
import { bumpLedger, mergeLedger } from '../packages/ledger';
import { theaterKindDef } from './theater';
import { isVaultAvailable } from '../meta/account';
import { settleClassUnlocks } from '../meta/unlocks';
import { CLASS_WEB_CFG } from '../data/classTiers';
import { WORLDSTATE_CFG } from '../meta/worldstate';
import { hashStr } from './nativeSceneConfig';
import { GLACIAL_HEART_LM, FROZEN_LAKE_LM } from './nativeSceneConfig';
export function sceneUpdateHarborholds(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    if (!nativeHost.isCampaignFrameOwner()) return; // THE PRIMARY GATE (shard M1): the lifecycle sweep is the keeper's
    if (nativeHost.gameOver || nativeHost.time < nativeHost.holdSweepAt) return;
    nativeHost.holdSweepAt = nativeHost.time + HARBORHOLD_CFG.sweepSec;
    // THE SPLIT DISPATCH (shard M1-W3): the keeper walks every hold's clocks; a
    // transition's dress, services and in-zone word go to the World standing in
    // the hold's zone (`here` answers whether one did).
    const here = (def: ZoneDef, fn: (w: NativeAreaDirectoryView) => boolean): boolean => nativeHost.atZone(def.id, fn) === true;
    for (const def of Object.values(nativeHost.zoneMap)) {
      const hold = def.harborhold;
      if (!hold) continue;
      const cls = holdClassOf(hold);
      if (hold.state === 'fallen' && hold.rebuildAt !== undefined && nativeHost.time >= hold.rebuildAt) {
        hold.state = HARBORHOLD_CFG.rebuildTo;
        hold.rebuildAt = undefined;
        here(def, w => {
          w.refreshHoldDress(def);
          w.refreshHoldServices(def);
          if (!w.presentationActor) return false;
          w.notice(`${def.name} stands rebuilt — and besieged anew`, '#e8a050', 14, 'war');
          return true;
        });
        continue;
      }
      if (hold.state === 'open') {
        if (hold.siegeAt === undefined) {
          hold.siegeAt = nativeHost.time + HARBORHOLD_CFG.graceAfterOpenSec
            + nativeHost.encRng.range(cls.siegeEverySec[0], cls.siegeEverySec[1]);
        } else if (nativeHost.time >= hold.siegeAt) {
          hold.state = 'besieged';
          hold.siegeAt = undefined;
          if (cls.fallAfterSec > 0) hold.fallAt = nativeHost.time + cls.fallAfterSec;
          const stood = here(def, w => {
            w.refreshHoldDress(def);
            w.refreshHoldServices(def);
            if (!w.presentationActor) return false;
          w.notice(`${def.name} is besieged — sound the horn!`, '#e85050', 16, 'war');
          return true;
          });
          if (!stood && nativeHost.visible(def)) {
            nativeHost.notice(`word comes: ${def.name} is under siege`, '#e8a050', 14, 'war');
          }
        }
        continue;
      }
      if (hold.state === 'besieged' && hold.fallAt !== undefined && nativeHost.time >= hold.fallAt) {
        // The muster paused it (belt): the live defense is the hosting World's own.
        if (nativeHost.holdDefense?.zoneId === def.id || nativeHost.atZone(def.id, w => w.holdDefense?.zoneId === def.id)) continue;
        const stood = nativeHost.fellHold(def, 'the siege overruns the walls — the harbor burns'); // the word floats only where the hold stands
        if (!stood && nativeHost.visible(def)) {
          nativeHost.notice(`${def.name} has fallen to the tide`, '#e85050', 14, 'war');
        }
      }
    }
  }

export function sceneFeedMyceliaActivity(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    const mf = nativeHost.sim.myceliaField;
    if (!mf) return;
    const map = new Map<string, number>();
    for (const zid of mf.interestZones()) map.set(zid, nativeHost.eventActivityAt(zid));
    mf.setEventActivity(map);
  }

export function sceneDrainMyceliaLedger(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    if (nativeHost.sim.myceliaField?.consumePushedBack()) bumpLedger(nativeHost.ledger, 'mycelia_pushed');
  }

export function sceneSweepClassClaims(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    if (nativeHost.time < nativeHost.classClaimNextAt) return;
    nativeHost.classClaimNextAt = nativeHost.time + CLASS_WEB_CFG.sweepSec;
    if (!nativeHost.metaProgressionActive()) return;
    const cosmeticRewards = settleCosmetics(nativeHost.account, nativeHost.ledgerView());
    if (cosmeticRewards.length) {
      nativeHost.accountDirty = true;
      nativeHost.notice('New cosmetics unlocked in your Wardrobe.', '#c4b2f2', 16, 'world');
    }
    const got = settleClassUnlocks(nativeHost.account, nativeHost.ledgerView());
    if (!got.length) return;
    nativeHost.accountDirty = true;
    for (const u of got) {
      if (u.kind !== 'class') continue;
      const name = CLASSES.find(c => c.id === u.payload.classId)?.name ?? u.payload.classId;
      nativeHost.notice(`The ${name} ${isVaultAvailable(nativeHost.account) ? 'is ready in the Vault' : 'has been discovered'}. Its arts can now be found, and a new vessel awaits your next waking.`, '#8fa8d8', 18, 'world');
    }
  }

export function sceneUpdateDeedRecovery(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    nativeHost.bindCombatDeeds();
    const p = nativeHost.player;
    if (!nativeHost.metaProgressionActive() || p.dead || p.downed) { nativeHost.combatDeeds.reset(); return; }
    if (nativeHost.combatDeeds.recovered(p.life, p.maxLife(), DEED_CFG.crisisRecover)) nativeHost.recordDeed({ kind: 'crisis' });
  }

export function sceneUpdateForechart(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    if (!FORECHART_CFG.enabled || nativeHost.gameOver) return;
    if (nativeHost.time < nativeHost.forechartNextAt) return;
    nativeHost.forechartNextAt = nativeHost.time + FORECHART_CFG.sweepSec;
    // Fresh far requests from the overlays (the mint-request drain pattern),
    // tagged by each instance's own dimension in the sim collector.
    for (const req of nativeHost.sim.drainSoundings()) {
      nativeHost.forechartSounding(req.at, req.radius, req.dimension);
    }
    const all = Object.values(nativeHost.zoneMap);
    // BACKPRESSURE: the halo must never crowd the worldstate save cap — the
    // player's own ground always has headroom to mint.
    if (all.length >= WORLDSTATE_CFG.zoneCap - FORECHART_CFG.capHeadroom) return;
    let veiled = 0;
    for (const z of all) if (z.veiled) veiled++;
    // maxVeiled is SOFT backpressure on the AMBIENT halo alone — an atomic
    // sea-system mint (the foreordained law: a whole pair set at one touch)
    // may overshoot it by a batch, and SOUNDINGS keep breathing regardless:
    // they are REQUESTED ground (an event's need for a far seat), bounded
    // by their own cluster size + per-sweep budget, and a saturated halo
    // must never starve them (the zoneCap headroom above still rules all).
    const haloBlocked = veiled >= FORECHART_CFG.maxVeiled;
    // The halo centers on the STANDING zone (a cave sweeps around its surface
    // anchor coordinate — def.map carries the parent's). Same-dimension only.
    // THE OCCUPIED LAW's many origins (shard M1-W3): a hosted world's halo
    // round-robins over every occupied zone, one origin a sweep (solo: the one).
    const posts = nativeHost.presentWorlds();
    const stand = posts.length > 1 ? posts[nativeHost.forechartTurn++ % posts.length].zone : nativeHost.zone;
    const dim = stand.dimension ?? 'surface';
    const origin = stand.map;
    let budget = FORECHART_CFG.perSweep
      * (veiled < FORECHART_CFG.hustleBelow ? FORECHART_CFG.hustleMul : 1);
    const cands: { z: ZoneDef; d: number }[] = [];
    if (!haloBlocked) {
      for (const z of all) {
        if (!forechartSource(z, dim) || z.id === stand.id) continue;
        const d = coordDist(z.map, origin);
        if (d <= FORECHART_CFG.ring) cands.push({ z, d });
      }
      cands.sort((a, b) => a.d - b.d); // grow evenly outward: close gaps first
    }
    // THE TIME GOVERNOR (FORECHART_CFG.beatBudgetMs): the deadline is
    // checked before each unit — an expensive charting era (big-chart O(N)
    // scans, foreordained first-touches) degrades the beat to ONE unit
    // instead of stacking several 60ms+ mints into a single frame; cheap
    // eras still fill the halo at the full count budget.
    const beatDeadline = performance.now() + FORECHART_CFG.beatBudgetMs;
    nativeHost.mintVeil = true;
    try {
      // SOUNDINGS FIRST (the reserved lane): a sounding is REQUESTED ground —
      // an event's need for a far seat — and the colossal halo's fill would
      // otherwise monopolize the unit budget for its whole young-world era,
      // starving every far request minutes deep. One unit off the top serves
      // the queue (sounding.perSweep caps the requests honored); the halo
      // spends the rest.
      const afterSoundings = nativeHost.growSoundings(Math.min(budget, 1), all, beatDeadline);
      budget = budget - (Math.min(budget, 1) - afterSoundings);
      for (const { z } of cands) {
        if (budget <= 0 || performance.now() > beatDeadline) break;
        nativeHost.chartNeighborsOf(z);
        budget--;
      }
      budget = nativeHost.growSoundings(budget, all, beatDeadline);
    } finally {
      nativeHost.mintVeil = false;
    }
    // THE VEIL INVARIANT: a zone adjacent to VISITED ground is the classic
    // one-ring map preview — never veiled. Entry lifts its own ring at once
    // (loadZone); this pass backstops late weaves and wrap-around links.
    for (const z of all) {
      if (!z.veiled) continue;
      if (z.exits.some(e => e.to !== '?' && nativeHost.visited.has(e.to))) z.veiled = false;
    }
  }

export function sceneUpdateOmens(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    if (nativeHost.gameOver || nativeHost.time < nativeHost.omenNextAt) return;
    nativeHost.omenNextAt = nativeHost.time + OMEN_CFG.checkSec;
    // THE OCCUPIED LAW (shard M1-W3): the world murmurs to every occupied
    // zone; an omen reads from the nearest one of its plane (solo: the one).
    const posts = nativeHost.presentWorlds();
    for (const o of collectOmens(nativeHost)) {
      const odim = o.dimension ?? 'surface';
      let near: NativeAreaDirectoryView | null = null, d = Infinity;
      for (const w of posts) {
        if ((w.zone.dimension ?? 'surface') !== odim) continue;
        const dw = coordDist(o.at, w.zone.map);
        if (!near || dw < d) { near = w; d = dw; }
      }
      if (!near) continue;
      const here = near.zone.map;
      const reach = omenReach(o);
      // THE REVEAL: near enough (or the omen has aged loud enough) — the seat
      // is surveyed onto the map, once per instance.
      if (reach.reveal > 0 && d <= reach.reveal && o.zoneId && !nativeHost.omenRevealed.has(o.id)) {
        const z = nativeHost.zoneMap[o.zoneId];
        if (z) {
          nativeHost.omenRevealed.add(o.id);
          // Fresh knowledge? (The reveal re-stamps already-known ground
          // idempotently — only a genuinely new name re-speaks the doors.)
          const news = z.veiled || (!nativeHost.visited.has(z.id) && !nativeHost.surveyed.has(z.id));
          z.veiled = false;
          z.concealed = false;
          nativeHost.surveyed.add(z.id);
          // The standing portals answer the reveal at once (the entry law —
          // surveyAround's own refresh; no waiting for the next zone load).
          if (news) nativeHost.refreshExitLabels();
          const line = o.lines.length ? omenLine(o, o.lines[0], here) : 'something waits out there';
          nativeHost.notice(`${line} — it is marked on your map.`, o.color ?? OMEN_CFG.color, OMEN_CFG.size + 1, 'world');
        }
        continue;
      }
      // THE WHISPER: a murmured bearing, cooled per omen so it never nags.
      if (d <= reach.whisper && o.lines.length) {
        const last = nativeHost.omenWhisperedAt.get(o.id);
        if (last !== undefined && nativeHost.time - last < OMEN_CFG.whisperCooldownSec) continue;
        nativeHost.omenWhisperedAt.set(o.id, nativeHost.time);
        // The line pick AND the toast's own position jitter are keyed on
        // (omen id, whisper ordinal) — an always-on geographic source must
        // never move the global stream, or every seeded rig near its
        // geography re-rolls its stream lottery (THE OFF-STREAM LAW;
        // probe_straying H8 was the casualty).
        const n = nativeHost.omenWhisperN.get(o.id) ?? 0;
        nativeHost.omenWhisperN.set(o.id, n + 1);
        const key = hashStr(`${o.id}:${n}`);
        // THE SPLIT DISPATCH (shard M1-W3): one whisper an omen, heard in every
        // occupied zone within its reach, each with its own bearing, floated
        // over that World's own player.
        for (const w of posts) {
          if ((w.zone.dimension ?? 'surface') !== odim) continue;
          if (w !== near && coordDist(o.at, w.zone.map) > reach.whisper) continue;
          const line = omenLine(o, o.lines[key % o.lines.length], w.zone.map);
          nativeHost.atZone(w.zone.id, x => {
            const actor = x.presentationActor;
            if (!actor) return;
            withSeededRandom(key, () => x.text(
              vec(actor.pos.x, actor.pos.y - 110),
              line, o.color ?? OMEN_CFG.color, OMEN_CFG.size));
          });
        }
      }
    }
  }

export function sceneUpdateWebSettle(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    if (nativeHost.time < nativeHost.webSettleNextAt) return;
    nativeHost.webSettleNextAt = nativeHost.time + WEB_CFG.settle.sweepSec;
    const seen = webDisturbance();
    if (seen === nativeHost.webSettleSeenSeq) return;
    settleWeb(nativeHost.zoneMap, null, {
      maxClusters: WEB_CFG.settle.sweepClusters,
      canStand: (z, pt) => (z.dimension ? true : nativeHost.biomeFor(pt) !== OCEAN_BIOME),
    });
    // A pass that moved/left/deferred anything bumped the seq past `seen` —
    // the next beat runs again; only an END-CLEAN pass parks the gate.
    if (webDisturbance() === seen) nativeHost.webSettleSeenSeq = seen;
  }

export function sceneReconcileDeepwinter(nativeHost:NativeSceneCampaignFrameClosureHost): void {
    const bf = nativeHost.sim.biomeField;
    const df = nativeHost.sim.deepwinterField;
    if (!df) return;
    for (const line of df.consumeNews()) {
      nativeHost.notice(line, df.surge().color, 16, 'events');
    }
    const want = new Set<string>(df.convertedZones());
    const wcfg = df.surge();
    for (const zid of want) {
      if (nativeHost.deepwinterWarped.has(zid)) continue;
      const z = nativeHost.zoneMap[zid];
      if (!z) continue;
      bf.setWarp(`deepwinter:${zid}`, {
        id: `deepwinter:${zid}`, center: { x: z.map.x, y: z.map.y },
        radius: wcfg.warp.radius, biome: wcfg.warpBiome, strength: wcfg.warp.strength,
        label: 'Deepwinter — the frost holds this land',
      });
      nativeHost.deepwinterWarped.add(zid);
    }
    for (const zid of [...nativeHost.deepwinterWarped]) {
      if (want.has(zid)) continue;
      bf.unwarp(`deepwinter:${zid}`);
      nativeHost.deepwinterWarped.delete(zid);
    }
    // THE EYE's own warp — setWarp is replace-by-id, so re-pushing the same
    // disc is idempotent; the flag exists for the unwarp on the winter's end.
    const eye = df.eyeWarp();
    if (eye) {
      bf.setWarp('deepwinter:eye', {
        id: 'deepwinter:eye', center: { x: eye.x, y: eye.y },
        radius: eye.radius, biome: wcfg.warpBiome, strength: wcfg.warp.strength,
        label: 'Deepwinter — the eye of winter',
      });
      nativeHost.deepwinterEyeWarped = true;
    } else if (nativeHost.deepwinterEyeWarped) {
      bf.unwarp('deepwinter:eye');
      nativeHost.deepwinterEyeWarped = false;
    }
    const heartId = df.consumeHeartMark();
    if (heartId) {
      const def = nativeHost.zoneMap[heartId];
      // The heart now grafts the GLACIAL HEART — the frozen-lake boss ARENA
      // (chasm moat, causeways, carved hazard lanes, bumpers) — instead of
      // the plain lake. Old saves whose heart already wears a chance-1
      // frozen_lake keep it (the scar stands; no double lake).
      if (def && !def.landmarks?.some(l =>
        (l.landmark === GLACIAL_HEART_LM || l.landmark === FROZEN_LAKE_LM) && l.chance >= 1)) {
        (def.landmarks ??= []).push({ landmark: GLACIAL_HEART_LM, chance: 1 });
      }
    }
  }

export function sceneRelocateToFactionBiome(nativeHost:NativeSceneCampaignFrameClosureHost, coord: { x: number; y: number }, faction: string): { coord: { x: number; y: number }; warpBiome: string | null } {
    // Ashore FIRST: an event epicenter drained onto open ocean would raise its
    // realm mid-sea (the biome field is seeded independently of the landmass
    // field, so "grove" exists over water).
    coord = nativeHost.pullToLand(coord);
    const wanted = new Set(biomesForFaction(faction));
    if (!wanted.size) return { coord, warpBiome: null }; // no biome breeds this faction → leave as-is
    if (patronFaction(nativeHost.biomeFor(coord)) === faction) return { coord, warpBiome: null }; // already right
    // Spiral outward (rings × directions) for a coord whose field biome matches —
    // candidates must ALSO be on land.
    for (let ring = 1; ring <= 4; ring++) {
      const r = ring * 150; // ~ a couple node-steps per ring
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        const c = { x: coord.x + Math.cos(ang) * r, y: coord.y + Math.sin(ang) * r };
        if (nativeHost.continentFor(c).kind === 'ocean') continue;
        if (patronFaction(nativeHost.biomeFor(c)) === faction) return { coord: c, warpBiome: null };
      }
    }
    return { coord, warpBiome: biomesForFaction(faction)[0] }; // none near → warp the ground here
  }

export function sceneSurfaceAnchor(nativeHost:NativeSceneCampaignFrameClosureHost): ZoneDef {
    return !nativeHost.zone.dimension ? nativeHost.zone : (nativeHost.zoneMap[START_ZONE] ?? nativeHost.zone);
  }

export function sceneVisible(nativeHost:NativeSceneCampaignFrameClosureHost, z: ZoneDef): boolean {
    // Concealed ground (an Incursion landing) is hidden from the map AND its
    // auto-fit until the player approaches/enters it — so a far blight stays
    // obscured and never zooms the map out.
    // THE KNOWLEDGE LAW (docs/engine/atlas.md): the chart is the player's
    // knowledge alone. EVERY graph mint is born VEILED (worldgen placeZoneAt,
    // ZoneSpec.veiled) and lifts only by a knowledge act — entry, the one-ring
    // preview off WALKED ground (structural here, so a mint beside you is
    // seen the moment it exists; the forechart's invariant pass clears the
    // flag for good), a survey pulse, an omen reveal, explicit cartography, a
    // won siege, a sighted port. A distant event's mint stays unknown until
    // the world tells you of it.
    if (z.concealed) return false;
    if (!z.veiled) return true;
    for (const e of z.exits) if (e.to !== '?' && nativeHost.visited.has(e.to)) return true;
    return false;
  }

export function sceneFellHold(nativeHost:NativeSceneCampaignFrameClosureHost, def: ZoneDef, msg: string | null): boolean {
    const hold = def.harborhold;
    if (!hold) return false;
    const cls = holdClassOf(hold);
    hold.state = 'fallen';
    hold.falls++;
    hold.prosperity = Math.max(0, hold.prosperity - HARBORHOLD_CFG.fallPenalty);
    hold.fallAt = undefined;
    hold.siegeAt = undefined;
    hold.rebuildAt = nativeHost.time + cls.rebuildSec;
    // THE SPLIT DISPATCH (shard M1-W3): the gate reseal, the dress, the services
    // and the overrun text belong to the World standing in the hold's zone (the
    // answer: whether one did).
    return nativeHost.atZone(def.id, w => {
      const ps = holdStructureIn(w.structures, cls.structure);
      const gate = ps ? holdGateDoor(ps) : null;
      if (gate) w.resealDoor(gate.door.id);
      w.refreshHoldDress(def);
      w.refreshHoldServices(def);
      const actor = w.presentationActor;
      if (msg && actor) w.text(vec(actor.pos.x, actor.pos.y - 84), msg, '#e85050', 16);
      return actor !== null;
    }) === true;
  }

export function sceneEventActivityAt(nativeHost:NativeSceneCampaignFrameClosureHost, zid: string): number {
    let a = nativeHost.sim.activityAt(zid);
    // THE SPLIT DISPATCH (shard M1-W3): the keeper builds the map once; the
    // engine-local term is the World standing in the zone (solo: this one).
    nativeHost.atZone(zid, w => {
      // OFFSTAGE runs are bodiless leans (a night-long watch change) — no
      // turmoil for the bloom to feed on (the concurrency fold's own filter).
      a += w.theaterRuns.filter(r => !r.done && !theaterKindDef(r.kind)?.offstage).length;
      a += w.encounters.length;
    });
    return a;
  }

export function sceneLedgerView(nativeHost:NativeSceneCampaignFrameClosureHost): Record<string, number> {
    const view: Record<string, number> = { ...nativeHost.account.ledger };
    mergeLedger(view, nativeHost.ledger);
    return view;
  }

export function sceneForechartSounding(nativeHost:NativeSceneCampaignFrameClosureHost, at: MapCoord, radius?: number, dimension?: string): void {
    const r = radius ?? FORECHART_CFG.sounding.radius;
    const dim = dimension ?? 'surface';
    if (nativeHost.soundings.some(s => s.dimension === dim && coordDist(s.at, at) < r)) return;
    nativeHost.soundings.push({ at: { x: at.x, y: at.y }, radius: r, dimension: dim });
  }

export function sceneGrowSoundings(nativeHost:NativeSceneCampaignFrameClosureHost, budget: number, all: ZoneDef[], deadlineAt?: number): number {
    let worked = 0;
    for (let i = nativeHost.soundings.length - 1; i >= 0 && budget > 0; i--) {
      if (worked >= FORECHART_CFG.sounding.perSweep) break;
      if (deadlineAt !== undefined && performance.now() > deadlineAt) break;
      const s = nativeHost.soundings[i];
      const near = zonesWithin(all, s.at, s.radius, s.dimension)
        .filter(z => !z.pocket && !z.eventOwned);
      if (near.length >= FORECHART_CFG.sounding.maxNodes) {
        nativeHost.soundings.splice(i, 1); // grown — the cluster stands
        continue;
      }
      if (near.length === 0) {
        // Nothing out there yet: seed the ANCHOR — floating (disconnected
        // until approached, the fog-of-war law) + veiled, its frontiers the
        // cluster's growth buds. Ocean-refusing: pull ashore like every mint.
        const dry = s.dimension === 'surface' && nativeHost.continentFor(s.at).kind === 'ocean'
          ? nativeHost.pullToLand(s.at) : s.at;
        if (s.dimension === 'surface' && nativeHost.continentFor(dry).kind === 'ocean') {
          nativeHost.soundings.splice(i, 1); // open ocean through and through — refuse
          continue;
        }
        const biomeFor = s.dimension !== 'surface' ? nativeHost.dimensionBiomeFor(s.dimension) : nativeHost.biomeFor;
        const depthFor = s.dimension !== 'surface' ? nativeHost.dimensionBiomeDepthFor(s.dimension) : nativeHost.biomeDepthFor;
        const gen = placeZoneAt(dry, null, nativeHost.zoneMap, nativeHost.nextGenId++, {
          biomeFor, levelFor: nativeHost.levelFor, biomeDepthFor: depthFor,
          climateFor: nativeHost.climateFor, fieldBiome: true, floating: true,
          ...(s.dimension !== 'surface' ? { dimension: s.dimension } : {}),
        });
        gen.veiled = true;
        if (s.dimension !== 'surface') gen.level += dimensionDef(s.dimension).levelBonus ?? 0;
        nativeHost.zoneMap[gen.id] = gen;
        nativeHost.sim.onNodeCharted(gen, nativeHost.simView());
        budget--; worked++;
        continue;
      }
      // Grow: resolve the cluster member nearest the heart that still has buds
      // (the floating anchor itself is the first bud — the sounding exception).
      const src = near
        .filter(z => forechartSource(z, s.dimension, true))
        .sort((a, b) => coordDist(a.map, s.at) - coordDist(b.map, s.at))[0];
      if (!src) { nativeHost.soundings.splice(i, 1); continue; } // no buds left — done growing
      nativeHost.chartNeighborsOf(src);
      budget--; worked++;
    }
    return budget;
  }

