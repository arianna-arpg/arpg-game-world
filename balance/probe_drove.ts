// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE DROVE end to end (packages/overlays/drove.ts +
// packages/defs/drove.ts + the world.ts scene block). Pins:
//   - THE BELT LAW: ignition seats ONLY the surge's biomes at/below levelMax,
//     honors maxConcurrent, and settles LATENT on unknown ground (rising the
//     moment the ground is known),
//   - THE GATHERING'S BOOKKEEPING: staged-once heads AND the pen seat
//     remembered forever after, penned/lost decrement, the last head
//     accounted flips 'gathered' (one penned head is enough) or 'scattered'
//     (every head lost), the scattered hold biases the beasts and expires on
//     its own, resolve buys the reprieve and the reprieve blocks fresh
//     collapses (dev pins never do),
//   - THE ABSENT CLOCK: frozen while the player stands the zone; unattended
//     it resolves BOTH ways (reeveWinChance — statistically pinned),
//   - WORLDSTATE: snapshot → JSON → restore → byte-identical (pen seat
//     included); garbage restores tolerated; pruneZones drops culled ground;
//     same seed + same script = byte-identical fields (determinism),
//   - THE DEF: validate() clean over the live registries — including the
//     purse chain (loot tables minted, register families registered: the
//     net against a silently empty payout),
//   - LIVE (the real engine): a dev-pinned collapse on a real farmland mint
//     stages the scene (the collapsed-pen dress under its eventDress tag,
//     the posted reeve, loose heads wearing the critter contract), THE DRIVE
//     WHEEL walks a pressed head away from the presser (herd it from the far
//     side and it runs at the pen), a head standing the pen ground is PENNED
//     and paid, a flawless gathering pays the purse + the register bonus at
//     the pen (real ground drops), the dress dries away on resolve, an
//     all-heads-dead collapse SCATTERS (ledger + the beast hold), and a
//     leave/return round-trip re-stages the SAME pen (remembered seat, one
//     reeve, no doubled rails).
// Run: npx tsx balance/probe_drove.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import type { Doodad } from '../src/engine/levelgen';
import type { ZoneDef } from '../src/data/zones';
import { MONSTERS } from '../src/data/monsters';
import { BIOMES } from '../src/world/biomes';
import { LOOT_TABLES } from '../src/data/loottables';
import { ITEM_AFFIXES } from '../src/data/itemaffixes';
import type { OverlayView } from '../src/world/overlay';
import type { PackageGate } from '../src/packages/types';
import { DroveField, type DroveSurge } from '../src/packages/overlays/drove';
import { DROVE, DROVE_SURGE } from '../src/packages/defs/drove';
import { PACKAGES } from '../src/packages/registry';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xd20e);

// ============================================================ the fake web
const mkZone = (id: string, biome: string, level: number, x: number, y: number, veiled = false): ZoneDef =>
  ({ id, biome, level, veiled, map: { x, y }, exits: [], objective: { kind: 'clear' } } as unknown as ZoneDef);

const GATE_ON: PackageGate = { active: true, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 };

interface FakeWeb { view: OverlayView; visited: Set<string>; surveyed: Set<string>; setZone(id: string): void }
const mkWeb = (zones: ZoneDef[], at: string, known: string[]): FakeWeb => {
  const visited = new Set(known);
  const surveyed = new Set<string>();
  const byId = Object.fromEntries(zones.map(z => [z.id, z]));
  const view = {
    nodes: zones, byId, allNodes: zones,
    terrain: () => 'land',
    currentZoneId: at,
    time: 0, census: {}, charLevel: 10,
    gates: new Map(),
    visited, surveyed,
  } as unknown as OverlayView;
  return { view, visited, surveyed, setZone: (id: string) => { (view as { currentZoneId: string }).currentZoneId = id; } };
};

/** A hot surge for the unit rigs: ignition certain, mechanics untouched. */
const HOT: DroveSurge = { ...DROVE_SURGE, igniteChance: 1, resolveCooldownSeconds: [50, 50] };
const mkField = (surge: DroveSurge, seed = 0x5eed): DroveField =>
  new DroveField({ seed, gate: () => GATE_ON, biomeSeed: 1 }, surge);

// ------------------------------------------------ A. the belt law
{
  const zones = [
    mkZone('home', 'farmland', 5, 0, 0),        // the player stands here
    mkZone('croft', 'farmland', 5, 60, 0),      // the legal seat
    mkZone('deep', 'farmland', DROVE_SURGE.levelMax + 9, 120, 0), // too hard
    mkZone('meadow', 'field', 5, 0, 60),        // wrong biome
    mkZone('city', 'metropolis', 5, 60, 60),    // wrong biome
  ];
  let croft = 0, other = 0;
  for (let s = 0; s < 30; s++) {
    const f = mkField(HOT, 0x1000 + s);
    const web = mkWeb(zones, 'home', ['home', 'croft', 'deep', 'meadow', 'city']);
    for (let i = 0; i < 8 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    const seat = f.peek()[0];
    if (!seat) continue;
    if (seat.zoneId === 'croft') croft++; else other++;
  }
  check('A1: ignition seats ONLY the belt at/below levelMax — never underfoot', croft >= 25 && other === 0,
    `${croft} croft, ${other} illegal`);

  const f = mkField(HOT);
  const web = mkWeb(zones, 'home', ['home', 'croft', 'deep', 'meadow', 'city']);
  for (let i = 0; i < 40; i++) f.update(0.5, web.view);
  check('A2: maxConcurrent honored', f.activeCount() <= HOT.maxConcurrent, `${f.activeCount()} active`);
  check('A3: a known seat rises LIVE (not latent)', f.peek().every(d => !d.latent));
}

// ------------------------------------------------ B. the latent collapse
{
  const zones = [mkZone('home', 'farmland', 5, 0, 0), mkZone('far', 'farmland', 5, 80, 0)];
  const f = mkField(HOT);
  const web = mkWeb(zones, 'home', ['home']); // 'far' is unknown ground
  for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
  const d = f.peek()[0];
  check('B1: an unknown seat settles LATENT', !!d && d.zoneId === 'far' && d.latent);
  check('B2: a latent collapse reads as nothing (droveOn)', f.droveOn('far') === null);
  f.update(200, web.view);
  check('B3: latent clocks are FROZEN (no absent resolution)', f.activeCount() === 1 && !!f.peek()[0]?.latent);
  web.visited.add('far');
  f.update(0.5, web.view);
  check('B4: known ground RISES the collapse', f.activeCount() === 1 && !f.peek()[0].latent && !!f.droveOn('far'));
}

// ------------------------------------------------ C. the gathering's bookkeeping
{
  const zones = [mkZone('home', 'farmland', 5, 0, 0), mkZone('croft', 'farmland', 5, 60, 0)];
  const rig = (): { f: DroveField; id: string; web: FakeWeb; zid: string } => {
    const f = mkField(HOT);
    const web = mkWeb(zones, 'home', ['home', 'croft']);
    for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    const id = f.peek()[0].id;
    const zid = f.peek()[0].zoneId;
    web.setZone(zid); // stand the ground — the absent clock freezes
    return { f, id, web, zid };
  };

  {
    const { f, id, zid } = rig();
    f.noteStaged(id, 6, 420, 330);
    f.noteStaged(id, 99, 1, 1); // a second stage must be ignored — heads AND pen
    const info = f.droveOn(zid)!;
    check('C1: heads staged ONCE, pen seat remembered', info.staged && info.loose === 6
      && !!info.penAt && info.penAt.x === 420 && info.penAt.y === 330);
    f.notePenned(id); f.noteLost(id);
    const i2 = f.droveOn(zid)!;
    check('C2: penned + lost decrement', i2.loose === 4 && i2.penned === 1 && i2.lost === 1);
    f.notePenned(id); f.notePenned(id); f.notePenned(id);
    check('C3: heads still loose keep the gathering open', f.droveOn(zid)!.phase === 'loose');
    f.notePenned(id);
    const i3 = f.droveOn(zid)!;
    check('C4: the last head accounted flips GATHERED (one penned is enough)',
      i3.phase === 'gathered' && i3.penned === 5 && i3.loose === 0);
    f.resolve(id);
    check('C5: resolve removes the collapse + starts the reprieve', f.activeCount() === 0 && f.cooldownRemaining() > 0);
  }
  {
    const { f, id, zid, web } = rig();
    f.noteStaged(id, 3, 100, 100);
    f.noteLost(id); f.noteLost(id); f.noteLost(id);
    const info = f.droveOn(zid)!;
    check('C6: every head lost SCATTERS the fold', info.phase === 'scattered' && info.lost === 3);
    const bias = f.affectSpawns(zones.find(z => z.id === zid)!);
    check('C7: a scattered fold wears the beast hold', bias.factionMul.beast === HOT.scatterFactionMul
      && bias.injectFactions.includes('beast'));
    check('C8: standing ground stirs by phase', f.activityAt(zid) === 0.5);
    const scatteredId = f.peek()[0].id;
    f.update(HOT.scatterHoldSec + 1, web.view);
    check('C9: the hold expires and the land settles', !f.peek().some(x => x.id === scatteredId));
  }
  {
    const { f, id, web } = rig();
    f.noteStaged(id, 2, 50, 50);
    f.notePenned(id); f.notePenned(id);
    f.resolve(id);
    for (let i = 0; i < 20; i++) f.update(0.5, web.view);
    check('C10: the reprieve blocks fresh collapses', f.activeCount() === 0);
    f.update(HOT.resolveCooldownSeconds![1], web.view);
    for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    check('C11: the reprieve spent, a pen may give way again', f.activeCount() === 1);
  }
}

// ------------------------------------------------ D. the absent clock
{
  const zones = [mkZone('home', 'farmland', 5, 0, 0), mkZone('croft', 'farmland', 5, 60, 0)];
  {
    const f = mkField(HOT);
    const web = mkWeb(zones, 'home', ['home', 'croft']);
    for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    web.setZone(f.peek()[0].zoneId);
    f.update(HOT.absentResolveSec[1] + 30, web.view);
    check('D1: ATTENDED ground never absent-resolves', f.activeCount() === 1 && f.peek()[0].phase === 'loose');
  }
  let held = 0, lost = 0;
  for (let s = 0; s < 40; s++) {
    const f = mkField(HOT, 0x2000 + s);
    const web = mkWeb(zones, 'home', ['home', 'croft']);
    for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    const first = f.peek()[0];
    if (!first) continue;
    let outcome: 'held' | 'lost' | null = null;
    for (let t = 0; t < HOT.absentResolveSec[1] + 30 && !outcome; t += 2) {
      f.update(2, web.view);
      const cur = f.peek().find(x => x.id === first.id);
      if (!cur) outcome = 'held';
      else if (cur.phase === 'scattered') outcome = 'lost';
    }
    if (outcome === 'held') held++;
    else if (outcome === 'lost') lost++;
  }
  check('D2: the unattended gathering goes BOTH ways', held >= 8 && lost >= 8, `${held} held, ${lost} lost (of 40)`);
}

// ------------------------------------------------ E. worldstate + determinism
{
  const zones = [mkZone('home', 'farmland', 5, 0, 0), mkZone('croft', 'farmland', 5, 60, 0)];
  const f = mkField(HOT);
  const web = mkWeb(zones, 'home', ['home', 'croft']);
  for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
  f.noteStaged(f.peek()[0].id, 5, 777, 888);
  f.notePenned(f.peek()[0].id);
  const snap = JSON.parse(JSON.stringify(f.snapshot()));
  const g = mkField(HOT, 0x9999);
  g.restore(snap);
  check('E1: snapshot → JSON → restore → byte-identical (pen seat included)',
    JSON.stringify(g.snapshot()) === JSON.stringify(snap)
    && g.droveOn(f.peek()[0].zoneId)?.penAt?.x === 777);
  const junk = mkField(HOT);
  junk.restore(null); junk.restore(42); junk.restore({ droves: [{}, { id: 7 }, null] });
  junk.update(0.5, web.view);
  check('E2: garbage restores tolerated (still functional)', true);
  g.pruneZones(id => id !== f.peek()[0].zoneId);
  check('E3: pruneZones drops culled ground', g.activeCount() === 0);

  const a = mkField(HOT, 0xd00d), b = mkField(HOT, 0xd00d);
  for (let i = 0; i < 60; i++) {
    const wa = mkWeb(zones, 'home', ['home', 'croft']);
    const wb = mkWeb(zones, 'home', ['home', 'croft']);
    a.update(0.5, wa.view); b.update(0.5, wb.view);
  }
  check('E4: same seed + same script = byte-identical fields',
    JSON.stringify(a.snapshot()) === JSON.stringify(b.snapshot()));
}

// ------------------------------------------------ F. the def's own integrity
{
  const lookups = {
    monster: (id: string) => !!MONSTERS[id], skill: () => true, support: () => true,
    faction: () => true, tileset: () => true, layout: () => true, structure: () => true,
    boundaryGate: () => true, sidezone: () => true, biome: (id: string) => !!BIOMES[id],
    dimension: () => true, pocketForm: () => true,
  };
  const errs = DROVE.validate ? DROVE.validate(lookups) : [];
  check('F1: validate() clean over live registries', errs.length === 0, errs.join('; '));
  check('F2: the package rides the registry', PACKAGES.some(p => p.id === 'drove'));
  check('F3: the reeve stands ready (freehold, folk law)',
    !!MONSTERS.drove_reeve && MONSTERS.drove_reeve.faction === 'freehold'
    && MONSTERS.drove_reeve.xp === 0 && !!MONSTERS.drove_reeve.noNemesis);
  check('F4: every head kind is a posted critter (the wolf-drama contract)',
    DROVE_SURGE.headTable.every(e => MONSTERS[e.id]?.tag === 'critter'));
  check('F5: the purse chain stands (tables + register families)',
    !!LOOT_TABLES[DROVE_SURGE.reward.purseTable] && !!LOOT_TABLES[DROVE_SURGE.reward.flawlessTable]
    && !!ITEM_AFFIXES.oxdrawn && !!ITEM_AFFIXES.fleecebound && !!ITEM_AFFIXES.foldkept);
}

// ------------------------------------------------ G. LIVE — the real engine
{
  const w: World = makeSimWorld('warrior', 0xd20e02);
  const zid = w.devMintTileset('farmland', 0, 5, { seed: 771177 });
  check('G1: a farmland mint stands', !!zid, zid ?? 'null');
  const df = w.sim.droveField;
  check('G2: the field rides the default manifest', !!df);
  if (zid && df) {
    // Rig hygiene: the observer must survive the shires (the parked-L1 law),
    // and the ARITHMETIC must be ours alone — the predators and the Carven
    // would happily do the losing for us (that emergent clock is the design;
    // this rig isolates the bookkeeping).
    w.player.untargetable = true;
    for (const a of w.actors) {
      if (!a.dead && (a.tag === 'predator' || a.faction === 'chattel' || a.faction === 'carven'
        || a.faction === 'bandit')) w.kill(a, true);
    }
    const ok = df.devIgnite(w.devOverlayView(), zid);
    check('G3: devIgnite spills the pen here', ok);
    const step = (secs: number, dt = 0.25): void => {
      for (let t = 0; t < secs; t += dt) { w.player.life = w.player.maxLife(); w.update(dt); }
    };
    step(1.5);
    const info = () => df.droveOn(zid);
    const dress = () => (w as unknown as { doodads: Doodad[] }).doodads
      .filter(d => d.eventDress === 'drove' && !d.gone);
    const i0 = info();
    check('G4: the scene stages (heads rolled once, pen seated)',
      !!i0 && i0.staged && i0.loose > 0 && !!i0.penAt,
      i0 ? `${i0.loose} loose at pen ${i0.penAt ? `${i0.penAt.x | 0},${i0.penAt.y | 0}` : '—'}` : 'no info');
    check('G5: the ledger surfaces the Vault card', (w.ledger.drove_seen ?? 0) >= 1);
    const d0 = dress();
    check('G6: the collapsed pen stands (rails under the eventDress tag)',
      d0.length >= 6 && d0.some(d => d.kind === 'rail_fence'), `${d0.length} pieces`);
    const reeves = () => w.actors.filter(a => !a.dead && a.defId === 'drove_reeve');
    check('G7: ONE reeve keeps the wreck (posted)', reeves().length === 1 && !!reeves()[0].aiPost);

    type DScene = { penAt: { x: number; y: number }; heads: { a: Actor }[] } | null;
    const scene = (w as unknown as { droveScene: DScene }).droveScene;
    const before = info()!;
    check('G8: loose heads wear the critter contract (no scene tag)',
      !!scene && scene.heads.length === before.loose
      && scene.heads.every(h => h.a.tag === 'critter' && !h.a.dead),
      scene ? `${scene.heads.length} tracked for ${before.loose} loose` : 'no scene');

    // THE DRIVE: press a head from its pen-far side — the wheel must walk it
    // AWAY from the presser (toward the pen), and standing the pen ground
    // must PEN it. The loop re-shepherds each beat (real herding: position,
    // press, re-position); the rails funnel, the gap admits.
    if (scene && scene.heads.length) {
      const pen = scene.penAt;
      const pick = (): Actor | null => {
        const sc2 = (w as unknown as { droveScene: DScene }).droveScene;
        if (!sc2 || !sc2.heads.length) return null;
        let best: Actor | null = null;
        let bd = Infinity;
        for (const h of sc2.heads) {
          if (h.a.dead || h.a.heldBy) continue;
          const d = Math.hypot(h.a.pos.x - pen.x, h.a.pos.y - pen.y);
          if (d < bd) { bd = d; best = h.a; }
        }
        return best;
      };
      let fled = false;
      let pennedByDrive = false;
      const pennedBefore = before.penned;
      {
        for (let it = 0; it < 700; it++) {
          const cur = info();
          if (!cur) break;
          if (cur.penned > pennedBefore) { pennedByDrive = true; break; }
          const t = pick();
          if (!t) break;
          const dx = t.pos.x - pen.x, dy = t.pos.y - pen.y;
          const n = Math.max(1e-3, Math.hypot(dx, dy));
          // Stand BEHIND the head on the pen-far axis, inside driveRadius.
          w.player.pos.x = t.pos.x + (dx / n) * 46;
          w.player.pos.y = t.pos.y + (dy / n) * 46;
          const px = w.player.pos.x, py = w.player.pos.y;
          step(0.3);
          // THE FLIGHT READ: placed 46 off, a driven head opens the gap —
          // any beat where it ends the step clearly farther than placed is
          // the wheel working (penning first is equally proof).
          if (!t.dead && Math.hypot(t.pos.x - px, t.pos.y - py) > 58) fled = true;
        }
      }
      check('G9: a pressed head runs FROM the presser (the drive wheel)', fled || pennedByDrive);
      check('G10: a head standing the pen ground is PENNED and paid',
        pennedByDrive && (w.ledger.drove_heads_penned ?? 0) >= 1,
        `ledger ${w.ledger.drove_heads_penned ?? 0}`);

      // THE FLAWLESS GATHERING: set the rest down inside the rail (the carry
      // lane's public contract — a head standing the ground pens, however it
      // got there) and the reeve settles up: purse drops at the pen, the
      // register bonus for zero losses, the dress handed to the drying.
      type GearDrop = { item: { kind: string; item?: { affixes?: { id: string }[] } } };
      const dropsOf = () => (w as unknown as { drops: GearDrop[] }).drops;
      const dropsBefore = dropsOf().length;
      let guard = 0;
      while (info()?.phase === 'loose' && guard++ < 40) {
        const t = pick();
        if (!t) break;
        t.pos.x = pen.x + 10; t.pos.y = pen.y;
        step(0.4);
      }
      step(1);
      const gathered = (w.ledger.droves_gathered ?? 0) >= 1;
      check('G11: the last head accounted GATHERS the fold (ledger + resolve)',
        gathered && info() === null, `ledger ${w.ledger.droves_gathered ?? 0}`);
      const paid = dropsOf().slice(dropsBefore);
      const REGISTER = new Set(['oxdrawn', 'fleecebound', 'foldkept']);
      const registerPieces = paid.filter(d => d.item.kind === 'gear'
        && (d.item.item?.affixes ?? []).some(a => REGISTER.has(ITEM_AFFIXES[a.id]?.family ?? ''))).length;
      check('G12: the reeve pays at the pen — and the pay WEARS the register',
        paid.length >= 2 && registerPieces >= 1,
        `${paid.length} drops, ${registerPieces} register piece(s)`);
      check('G13: the mended pen dries away (dress handed to evap)',
        dress().every(d => !!d.evap) && dress().length > 0);
    }

    // COLLAPSE 2 — EVERY HEAD LOST: the fold scatters (ledger + the hold).
    const ok2 = df.devIgnite(w.devOverlayView(), zid);
    check('G14: the ground may spill again at once (pinned relief cooled nothing)', ok2);
    step(1.5);
    type DScene2 = { heads: { a: Actor }[] } | null;
    const sc2 = (w as unknown as { droveScene: DScene2 }).droveScene;
    if (sc2) {
      for (const h of [...sc2.heads]) w.kill(h.a, false, w.player);
      step(1);
    }
    check('G15: every head dead SCATTERS the fold (witnessed ledger)',
      (w.ledger.droves_scattered ?? 0) >= 1 && info()?.phase === 'scattered',
      `ledger ${w.ledger.droves_scattered ?? 0}, phase ${info()?.phase ?? 'gone'}`);

    // COLLAPSE 3 — THE ROUND TRIP: a fresh collapse (new ground — the
    // scattered one still holds its zone), walk away, walk back: the pen
    // re-stages at its REMEMBERED seat, one reeve, no doubled rails.
    const zid2 = w.devMintTileset('farmland', 3, 5, { seed: 881188 });
    check('G16: a second farmland stands', !!zid2);
    if (zid2) {
      for (const a of w.actors) {
        if (!a.dead && (a.tag === 'predator' || a.faction === 'chattel' || a.faction === 'carven'
          || a.faction === 'bandit')) w.kill(a, true);
      }
      const ok3 = df.devIgnite(w.devOverlayView(), zid2);
      check('G17: the far pen spills', ok3);
      step(1.5);
      const staged = df.droveOn(zid2);
      const railsBefore = dress().length;
      w.loadZone(zid);
      step(0.5);
      w.loadZone(zid2);
      step(1.5);
      const back = df.droveOn(zid2);
      check('G18: re-entry re-stages the SAME pen (remembered seat, one reeve, no doubled rails)',
        !!staged && !!back && !!staged.penAt && !!back.penAt
        && staged.penAt.x === back.penAt.x && staged.penAt.y === back.penAt.y
        && w.actors.filter(a => !a.dead && a.defId === 'drove_reeve').length === 1
        && dress().length <= railsBefore + 1,
        back ? `pen ${back.penAt ? 'held' : 'LOST'} · ${dress().length} rails (was ${railsBefore})` : 'gone');
    }
  }
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
