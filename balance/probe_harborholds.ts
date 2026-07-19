// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE HARBORHOLD FABRIC end to end (data/harborholds.ts +
// world/harborholds.ts + the World runtime; docs/engine/harborholds.md). Pins:
//   - THE ASSIGN LAW: every sea class × tier resolves to a registered hold
//     class (or an honest bare quay); every assigned class names a REGISTERED
//     structure whose plan carries the sealed gate + every service seat char,
//   - the data helpers: mint state, restore pricing, the prosperity gate,
//     and the TOLERANT sanitizer (foreign saves degrade, never crash),
//   - THE MINT LAW (live): ensureSeaPorts stamps harborhold + the town
//     composition on MAINLAND spots only — anything holding a state has a
//     portTier by construction (islands/legacy stay bare quays),
//   - THE LIFECYCLE (live): boot seals the gate + pitches the siege camp +
//     suppresses the board; the MUSTER plants a formula-true ward and wave 1
//     pours fixated besiegers; a lost defense FELLS the hold (fires, penalty,
//     rebuild clock, ports_lost); the RESTORATION charges exact Mortal
//     Essence and re-stands it besieged; a won defense OPENS it (gate door
//     open, prosperity +1, services seated by rung, caches + ledgers);
//     recurring sieges schedule + land + deadline-fall via the sweep; the
//     rebuilt hold returns besieged; omens speak only under a deadline,
//   - PERSISTENCE: hold states ride WorldStateSave.zones byte-faithful; a
//     corrupted state drops to a bare quay on adopt.
// Run: npx tsx balance/probe_harborholds.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SEA_CLASSES } from '../src/data/seas';
import {
  HARBORHOLD_CFG, HOLD_CLASSES, holdActiveServices, holdClassFor, holdRestoreCost,
  mintHoldState, sanitizeHoldState,
} from '../src/data/harborholds';
import { MONSTERS } from '../src/data/monsters';
import { STRUCTURES } from '../src/data/structures';
import { collectMarkers } from '../src/world/mapMarkers';
import { holdGateDoor, holdSeatCell, holdStructureIn } from '../src/world/harborholds';
import { cellKind, continentSeedFrom } from '../src/world/continents';
import { clearSeaMemo, seaOfCell, type Sea } from '../src/world/seas';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const step = (w: World, dt: number, n: number): void => { for (let i = 0; i < n; i++) w.update(dt); };

bootSimEngine();
seedGlobalRandom(0x40b0);

// ------------------------------------------------ A. the assign + data laws
{
  let assignOk = true, structOk = true, gateOk = true, seatOk = true;
  const details: string[] = [];
  for (const sc of SEA_CLASSES) {
    for (const tier of ['haven', 'cove'] as const) {
      const cls = holdClassFor(sc.id, tier);
      if (sc.id === 'pond' && tier === 'cove' && cls?.id !== 'landing') assignOk = false;
      if (sc.id === 'ocean' && tier === 'haven' && cls?.id !== 'freeport') assignOk = false;
      if (!cls) continue;
      const s = STRUCTURES[cls.structure];
      if (!s?.plan) { structOk = false; details.push(`${cls.id}→${cls.structure} missing`); continue; }
      // The sealed gate char stands somewhere in the plan.
      if (!s.plan.some(row => row.includes('g'))) gateOk = false;
      // Every service row's seat char is IN the plan (placement truth).
      for (const svc of cls.services) {
        if (holdSeatCell(s, svc.seat) === null) { seatOk = false; details.push(`${cls.id}:${svc.id}@'${svc.seat}'`); }
      }
    }
  }
  check('A: the assign map resolves every sea class × tier', assignOk);
  check('A: every hold class names a registered plan structure', structOk, details.join(', '));
  check('A: every town plan carries its sealed gate', gateOk);
  check('A: every service seat char stands in its plan', seatOk, details.join(', '));

  const cls = HOLD_CLASSES.harbortown;
  const st = mintHoldState(cls);
  check('A: a minted hold is BESIEGED at zero', st.state === 'besieged' && st.prosperity === 0
    && st.defenses === 0 && st.falls === 0 && st.cls === 'harbortown');
  check('A: restore pricing follows the curve',
    holdRestoreCost(cls, 10) === Math.round(cls.restoreCostBase + cls.restoreCostPerLevel * 10));
  const svc0 = holdActiveServices(cls, 0).map(s => s.id);
  const svc2 = holdActiveServices(cls, 2).map(s => s.id);
  check('A: the prosperity gate opens rungs in order',
    svc0.includes('board') && svc0.includes('harbormaster') && !svc0.includes('chandler')
    && svc2.includes('chandler') && svc2.includes('mercs'));

  // The tolerant sanitizer: valid states clamp, foreign garbage drops.
  const good = sanitizeHoldState({ cls: 'landing', state: 'open', prosperity: 99, defenses: 3, falls: 1, rebuildAt: 12.5 });
  check('A: sanitize clamps a valid state to the ladder',
    !!good && good.prosperity === HOLD_CLASSES.landing.prosperityCap && good.state === 'open' && good.rebuildAt === 12.5);
  check('A: sanitize drops unknown classes + garbage',
    sanitizeHoldState({ cls: 'atlantis', state: 'open' }) === null
    && sanitizeHoldState('nonsense') === null && sanitizeHoldState(null) === null);
  const nan = sanitizeHoldState({ cls: 'landing', state: 'fallen', rebuildAt: Number.NaN });
  check('A: sanitize sheds non-finite clocks', !!nan && nan.rebuildAt === undefined);
}

// ------------------------------------------------ B. the live world rig
{
  // Hunt a world keeping a MULTI-PORT sea in reach (the probe_seas idiom).
  let w = makeSimWorld('warrior', 0x40b701);
  let sea: Sea | null = null;
  for (const ws of [0x40b701, 0x40b702, 0x40b703, 0x40b704, 0x40b705]) {
    const cand = makeSimWorld('warrior', ws);
    clearSeaMemo();
    const s = firstSeaWithPorts(cand.sim.biomeField.fieldSeed, 2);
    if (s) { w = cand; sea = s; break; }
  }
  check('B: a multi-port sea stands for the rig', !!sea, sea ? `${sea.ports.length} ports (${sea.cls.id})` : 'none');
  if (sea) {
    const info = w.devEnsureSea(sea.ports[0].shore)!;
    const zones = info.ports.map(p => w.zoneMap[p.id]);
    // THE MINT LAW: every mainland spot wears its assigned state + the baked
    // town composition; the discriminator holds world-wide.
    const stampOk = zones.every(z => {
      const cls = holdClassFor(info.cls, (z.portTier ?? 'cove') as 'haven' | 'cove');
      if (!cls) return z.harborhold === undefined;
      return z.harborhold?.state === 'besieged' && z.harborhold.cls === cls.id
        && (z.compositions ?? []).some(c => c.composition === `harborhold_${cls.id}` && c.chance === 1);
    });
    check('B: mainland spots mint besieged with the town composition baked', stampOk,
      zones.map(z => `${z.portTier}:${z.harborhold?.cls ?? 'quay'}`).join(' '));
    check('B: only portTier ground ever holds a state (islands/legacy exempt by construction)',
      Object.values(w.zoneMap).every(z => !z.harborhold || !!z.portTier));

    // Choose a hold port that actually seated its town (a tight arena may
    // honestly degrade — but a 2+-port sea must seat at least one).
    let hz = null as (typeof zones)[number] | null;
    for (const z of zones) {
      if (!z.harborhold) continue;
      w.loadZone(z.id);
      if (holdStructureIn(w.structures, HOLD_CLASSES[z.harborhold.cls].structure)) { hz = z; break; }
    }
    check('B: at least one spot seats its walled town', !!hz);
    if (hz) {
      const hold = hz.harborhold!;
      const cls = HOLD_CLASSES[hold.cls];
      const ps = holdStructureIn(w.structures, cls.structure)!;
      const gate = holdGateDoor(ps);
      check('B: the town gate stands SEALED while besieged', !!gate && !gate.door.open && !gate.door.broken);
      check('B: the muster horn stands on the apron', w.doodads.some(d => d.kind === 'muster_horn'));
      check('B: the harbor board is NOT planted while shut', !w.doodads.some(d => d.kind === 'harbor_board'));
      check('B: the siege camp dresses the gate', w.doodads.some(d => d.holdDress));

      // THE MUSTER: the ward plants formula-true; wave 1 pours fixated.
      w.beginHoldMuster();
      const ward = w.actors.find(a => a.tag === 'hold_ward' && !a.dead);
      const lvl = Math.max(1, hz.level);
      const wantLife = Math.round(cls.siege.wardLife + cls.siege.wardLifePerLevel * lvl);
      check('B: the ward plants at the gate, formula-true', !!ward
        && ward.team === 'player' && Math.abs(ward.maxLife() - wantLife) <= 1,
        ward ? `life ${ward.maxLife()} vs ${wantLife}` : 'no ward');
      step(w, 0.1, Math.ceil((cls.siege.armSec + 3) / 0.1));
      const besiegers = w.actors.filter(a => a.tag === 'hold_siege' && !a.dead);
      check('B: wave 1 pours', besiegers.length > 0, `${besiegers.length} besiegers`);
      check('B: the tide fixates on the ward (aim + threat graft)', !!ward
        && besiegers.every(b => b.aiTargetId === ward!.id || b.threat.size > 0));

      // A LOST defense fells the hold.
      const p0 = hold.prosperity;
      w.devResolveHoldDefense(false);
      check('B: a lost defense FELLS the hold', hold.state === 'fallen' && hold.falls === 1
        && hold.rebuildAt !== undefined && hold.rebuildAt > w.time
        && hold.prosperity === Math.max(0, p0 - HARBORHOLD_CFG.fallPenalty));
      check('B: ports_lost stamps', (w.ledger.ports_lost ?? 0) === 1);
      const gate2 = holdGateDoor(holdStructureIn(w.structures, cls.structure)!);
      check('B: the gate re-seals on the fall', !!gate2 && !gate2.door.open);
      check('B: the wreckage burns (ruin dress)', w.doodads.some(d => d.holdDress));

      // THE RESTORATION: exact price, back to besieged.
      const price = holdRestoreCost(cls, Math.max(1, hz.level));
      w.account.credits = price + 37;
      w.buyHoldRestore();
      check('B: the restoration charges EXACT Mortal Essence and re-stands it besieged',
        hold.state === 'besieged' && w.account.credits === 37 && hold.rebuildAt === undefined);

      // A WON defense opens the town.
      w.beginHoldMuster();
      step(w, 0.1, 5);
      w.devResolveHoldDefense(true);
      check('B: a won defense OPENS the hold', hold.state === 'open' && hold.prosperity === 1
        && hold.defenses === 1 && hold.siegeAt !== undefined);
      const gate3 = holdGateDoor(holdStructureIn(w.structures, cls.structure)!);
      check('B: the gate door swings open', !!gate3 && gate3.door.open === true);
      check('B: rung-0 services seat (harbormaster), rung-1 seats at prosperity 1 (chandler), rung-2 waits',
        w.actors.some(a => a.tag === 'hold_svc:harbormaster' && !a.dead)
        && (cls.services.some(s => s.id === 'chandler') === w.actors.some(a => a.tag === 'hold_svc:chandler' && !a.dead))
        && !w.actors.some(a => a.tag === 'hold_svc:mercs' && !a.dead));
      check('B: the board seats INSIDE the walls', w.doodads.some(d => d.kind === 'harbor_board'));
      check('B: the spoils stack (caches)', w.actors.filter(a => a.defId === 'harbor_cache' && !a.dead).length === cls.reward.caches);
      check('B: ports_defended + first_hold_opened stamp',
        (w.ledger.ports_defended ?? 0) === 1 && (w.ledger.first_hold_opened ?? 0) === 1);

      // THE PORT MERC MARKET at rung 2: template-only, no retirement.
      hold.prosperity = Math.min(cls.prosperityCap, Math.max(2, hold.prosperity));
      w.devSetHoldState(hz.id, 'open');
      if (cls.services.some(s => s.id === 'mercs')) {
        check('B: the captain arms a TEMPLATE-ONLY sheet', !!w.mercOutpost?.port
          && w.mercOutpost.offers.length > 0 && w.mercOutpost.offers.every(o => o.kind === 'template'),
          `${w.mercOutpost?.offers.length ?? 0} offers`);
        check('B: no retirement at a port', w.canRetireHere() === false);
      } else {
        check('B: a landing fields no captain (class law)', !w.mercOutpost?.port);
        check('B: no retirement at a port (vacuous on a landing)', w.canRetireHere() === false);
      }

      // THE RECURRING SIEGE: schedule → land (deadline armed) → omen speaks.
      hold.siegeAt = w.time - 1;
      step(w, 0.5, Math.ceil((HARBORHOLD_CFG.sweepSec + 1) / 0.5));
      check('B: the siege returns through the sweep', hold.state === 'besieged'
        && (cls.fallAfterSec <= 0 || hold.fallAt !== undefined));
      check('B: a deadline siege murmurs (the omen source)',
        cls.fallAfterSec <= 0 || w.harborholdOmens().some(o => o.zoneId === hz!.id));

      // THE DEADLINE FALL — unattended, the hold burns on its own.
      if (hold.fallAt !== undefined) {
        hold.fallAt = w.time - 1;
        step(w, 0.5, Math.ceil((HARBORHOLD_CFG.sweepSec + 1) / 0.5));
        check('B: an unbroken deadline fells the hold', hold.state === 'fallen' && hold.falls === 2);
      } else {
        check('B: an unbroken deadline fells the hold (class runs no deadline)', true, 'fallAfterSec 0');
      }

      // THE REBUILD: the clock expires into a fresh siege.
      hold.rebuildAt = w.time - 1;
      step(w, 0.5, Math.ceil((HARBORHOLD_CFG.sweepSec + 1) / 0.5));
      check('B: the rebuilt hold returns besieged', hold.state === HARBORHOLD_CFG.rebuildTo);

      // PERSISTENCE: byte-faithful ride + the corrupted-state degrade.
      const save = w.serializeWorldState();
      const w2 = makeSimWorld('warrior', 0x40b790);
      check('B: the save adopts', w2.adoptWorldState(save) === true);
      check('B: hold states ride the save byte-faithful',
        JSON.stringify(w2.zoneMap[hz.id]?.harborhold) === JSON.stringify(hold));
      const save2 = JSON.parse(JSON.stringify(save));
      const zz = save2.zones.find((z: { id: string }) => z.id === hz!.id);
      zz.harborhold = { cls: 'atlantis', state: 'open' };
      const w3 = makeSimWorld('warrior', 0x40b791);
      check('B: a corrupted state degrades to a bare quay on adopt',
        w3.adoptWorldState(save2) === true && w3.zoneMap[hz.id]?.harborhold === undefined);
    }
  }
}

// ------------------------------------------------ C. the haven rig (mercs)
// The template-only market is the user contract ("surefire lower-tier
// hires, no retirement") — pin it on a HAVEN sea where the class fields a
// captain, across a wider seed hunt (an honest skip only if no haven sea
// stands anywhere in the budget).
{
  let w: World | null = null;
  let sea: Sea | null = null;
  for (const ws of [0x40b711, 0x40b712, 0x40b713, 0x40b714, 0x40b715, 0x40b716, 0x40b717, 0x40b718]) {
    const cand = makeSimWorld('warrior', ws);
    clearSeaMemo();
    const s = firstSeaWhere(cand.sim.biomeField.fieldSeed, x => x.cls.haven && x.ports.length >= 1);
    if (s) { w = cand; sea = s; break; }
  }
  check('C: a haven sea stands for the merc rig', !!sea, sea ? `${sea.cls.id}, ${sea.ports.length} ports` : 'none in budget');
  if (w && sea) {
    const info = w.devEnsureSea(sea.ports[0].shore)!;
    const havenId = info.ports.find(p => p.tier === 'haven')?.id;
    const hz = havenId ? w.zoneMap[havenId] : undefined;
    check('C: the haven wears a captained class', !!hz?.harborhold
      && HOLD_CLASSES[hz.harborhold.cls].services.some(s => s.id === 'mercs'),
      hz?.harborhold?.cls);
    if (hz?.harborhold) {
      const cls = HOLD_CLASSES[hz.harborhold.cls];
      w.loadZone(hz.id);
      if (!holdStructureIn(w.structures, cls.structure)) {
        check('C: the haven seats its town', false, 'no structure — arena too tight');
      } else {
        hz.harborhold.prosperity = cls.prosperityCap;
        w.devSetHoldState(hz.id, 'open');
        check('C: the captain arms a TEMPLATE-ONLY sheet within the class band',
          !!w.mercOutpost?.port
          && w.mercOutpost.offers.length >= cls.mercOffers[0]
          && w.mercOutpost.offers.length <= cls.mercOffers[1]
          && w.mercOutpost.offers.every(o => o.kind === 'template'),
          `${w.mercOutpost?.offers.length ?? 0} offers`);
        check('C: no retirement at the port captain', w.canRetireHere() === false);
        // The hire itself rides the ordinary path + charges credits.
        const cost = w.mercOutpost ? w.mercHireCost(w.mercOutpost.offers[0]) : 0;
        w.account.credits = cost + 11;
        const hired = w.hireMercenary(0);
        check('C: a port hire lands through the one pipeline (exact charge, seat filled)',
          hired === true && w.account.credits === 11 && w.hiredMercs.length === 1);

        // --- D. the plaza services + the camp + the local tide + the badge ---
        const wAny = w as unknown as {
          postHoldWrits(): void;
          spawnHoldBesieger(cls: unknown, ward: unknown): void;
          kill(a: unknown, silent?: boolean, killer?: unknown): void;
        };
        // THE WRIT BOARD: planted at rung 1+, posts named promoted marks,
        // then rests on its persisted clock.
        check('D: the writ board stands in the open town', w.doodads.some(d => d.kind === 'bounty_board'));
        const foesBefore = w.actors.filter(a => a.tag === 'bounty_mark' && !a.dead).length;
        wAny.postHoldWrits();
        const marks = w.actors.filter(a => a.tag === 'bounty_mark' && !a.dead);
        const hold2 = hz.harborhold!;
        check('D: writs post onto living foes (named, promoted, tagged)',
          marks.length > foesBefore && marks.every(m => (m.rarity ?? 'normal') !== 'normal' && !!m.name),
          `${marks.length} marks`);
        check('D: the board rests (writsAt persisted on the state)', hold2.writsAt !== undefined && hold2.writsAt > w.time);
        const markCount = marks.length;
        wAny.postHoldWrits();
        check('D: a resting board refuses a second posting',
          w.actors.filter(a => a.tag === 'bounty_mark' && !a.dead).length === markCount);
        if (marks[0]) {
          const before = w.ledger.bounty_writs_claimed ?? 0;
          wAny.kill(marks[0], false, w.player);
          check('D: a claimed writ pays the standard ledger row',
            (w.ledger.bounty_writs_claimed ?? 0) === before + 1);
        }
        // THE CAMP WATCH: besieged plants the dormant watch at its posts;
        // reopening retires it quietly.
        w.devSetHoldState(hz.id, 'besieged');
        const cls2 = HOLD_CLASSES[hold2.cls];
        const camp = w.actors.filter(a => a.tag === 'hold_camp' && !a.dead);
        check('D: the camp watch plants dormant at its posts',
          camp.length === cls2.siege.campWatch
          && camp.every(a => !a.aiAwakened && !!a.postSpec && a.aiPost !== undefined),
          `${camp.length}/${cls2.siege.campWatch}`);
        // THE DRAFT: the muster wakes the watch into wave 1's tide.
        w.beginHoldMuster();
        step(w, 0.1, Math.ceil((cls2.siege.armSec + 2) / 0.1));
        const drafted = w.actors.filter(a => a.tag === 'hold_siege' && !a.dead && a.aiAwakened);
        check('D: the muster DRAFTS the watch (dormant → wave 1, grafted)',
          drafted.length >= camp.length && !w.actors.some(a => a.tag === 'hold_camp' && !a.dead));
        w.devResolveHoldDefense(true);
        check('D: reopening retires the camp', !w.actors.some(a => a.tag === 'hold_camp' && !a.dead));
        // THE LOCAL TIDE: a desert coast seasons the siege table (the fold is
        // read per spawn — poke the biome, pour a wave's worth, census kinds).
        const oldBiome = hz.biome;
        hz.biome = 'desert';
        w.devSetHoldState(hz.id, 'besieged');
        w.beginHoldMuster();
        const ward2 = w.actors.find(a => a.tag === 'hold_ward' && !a.dead);
        const desertIds = new Set(HARBORHOLD_CFG.tideBiomes.desert.map(r => r.id));
        let seasoned = 0;
        for (let i = 0; i < 60 && ward2; i++) {
          wAny.spawnHoldBesieger(cls2, ward2);
        }
        for (const a of w.actors) {
          if (a.tag === 'hold_siege' && !a.dead && a.defId && desertIds.has(a.defId)) seasoned++;
        }
        check('D: the LOCAL TIDE seasons the siege (desert kin in the pour)', seasoned > 0, `${seasoned}/60+`);
        check('D: every tideBiomes id resolves', Object.values(HARBORHOLD_CFG.tideBiomes)
          .every(rows => rows.every(r => !!MONSTERS[r.id])));
        hz.biome = oldBiome;
        w.devResolveHoldDefense(false);
        // THE MAP BADGE: the marker registry wears the standing.
        const badges = collectMarkers(w).filter(m => m.id.startsWith('hold:'));
        check('D: every known hold wears a map badge', badges.length >= 1
          && badges.some(m => m.id === `hold:${hz.id}` && m.glyph === '🔥'),
          `${badges.length} badges`);
      }
    }
  }
}

function firstSeaWhere(fs: number, pred: (s: Sea) => boolean): Sea | null {
  const contSeed = continentSeedFrom(fs);
  for (let r = 0; r <= 12; r++) {
    for (let gy = -r; gy <= r; gy++) {
      for (let gx = -r; gx <= r; gx++) {
        if (Math.max(Math.abs(gx), Math.abs(gy)) !== r) continue;
        if (cellKind(gx, gy, contSeed) !== 'ocean') continue;
        const s = seaOfCell(gx, gy, contSeed);
        if (pred(s)) return s;
      }
    }
  }
  return null;
}

function firstSeaWithPorts(fs: number, min = 1): Sea | null {
  const contSeed = continentSeedFrom(fs);
  for (let r = 0; r <= 12; r++) {
    for (let gy = -r; gy <= r; gy++) {
      for (let gx = -r; gx <= r; gx++) {
        if (Math.max(Math.abs(gx), Math.abs(gy)) !== r) continue;
        if (cellKind(gx, gy, contSeed) !== 'ocean') continue;
        const s = seaOfCell(gx, gy, contSeed);
        if (s.ports.length >= min) return s;
      }
    }
  }
  return null;
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 2 : 0);
