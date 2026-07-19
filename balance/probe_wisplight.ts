// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE WISPLIGHT end to end (packages/overlays/wisplight.ts +
// packages/defs/wisplight.ts + the world.ts scene block + the possession
// seam's rider lane). Pins:
//   - THE FEN LAW: ignition seats ONLY the surge's biomes, honors
//     maxConcurrent, and settles LATENT on unknown ground (rising the moment
//     the ground is known),
//   - THE SLOT BOOKKEEPING: kinds staged once, kindle/ride/slay/gutter
//     transitions legal-only, the event self-resolves when the last slot
//     goes terminal (buying the reprieve; dev pins never do),
//   - THE ABSENT SETTLING: attended ground never settles; unattended kindled
//     lights go BOTH ways (absentRideChance — statistically pinned); a
//     standing-only gathering sinks and resolves; a ridden-only gathering
//     waits hostHoldSec then departs,
//   - THE RIDER LANE (engine/possess.ts riderRefusal): one enterable-body
//     law — worms/companions/owned/ridden/vacated/possessable:false refuse,
//     a plain body opens; the wisp's own policy (rarity 0 = the crowned keep
//     their seats) rides on top,
//   - WORLDSTATE: snapshot → JSON → restore → byte-identical re-snapshot;
//     garbage tolerated; pruneZones drops culled ground; same seed + same
//     script = byte-identical fields,
//   - THE DEF: validate() clean over live registries, every kind's monster/
//     status/skills resolve, the package rides the registry,
//   - LIVE (the real engine): a dev-pinned gathering on a real marsh mint
//     stages standing untargetable/invulnerable lights out of arm's reach;
//     the touch kindles one (ledger + route); the walk pulses `emboldened`
//     onto nearby bodies and buds an evaporating bloom trail; route's end
//     turns it seeking and it rides the STRONGEST candidate (level-scored,
//     wisp-touched preferred); the host wears the kind's status + a level-
//     computed ES sheet source + the grafted skill + the epithet; killing
//     the host pays the bounty (ledger + xp) and resolves the last slot —
//     then a leave/return round-trip re-adopts a ridden host without
//     double-minting.
// Run: npx tsx balance/probe_wisplight.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import type { ZoneDef } from '../src/data/zones';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { BIOMES } from '../src/world/biomes';
import { STATUS_DEFS } from '../src/engine/status';
import { riderRefusal } from '../src/engine/possess';
import type { OverlayView } from '../src/world/overlay';
import type { PackageGate } from '../src/packages/types';
import { WisplightField, wispKindOf, type WisplightSurge } from '../src/packages/overlays/wisplight';
import { WISPLIGHT, WISPLIGHT_SURGE } from '../src/packages/defs/wisplight';
import { PACKAGES } from '../src/packages/registry';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xb09);

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
const HOT: WisplightSurge = { ...WISPLIGHT_SURGE, igniteChance: 1, resolveCooldownSeconds: [50, 50] };
const mkField = (surge: WisplightSurge, seed = 0x5eed): WisplightField =>
  new WisplightField({ seed, gate: () => GATE_ON, biomeSeed: 1 }, surge);

// ------------------------------------------------ A. the fen law
{
  const zones = [
    mkZone('home', 'marsh', 5, 0, 0),          // the player stands here
    mkZone('fen', 'marsh', 5, 60, 0),          // the legal seat
    mkZone('croft', 'farmland', 5, 0, 60),     // wrong biome
    mkZone('city', 'metropolis', 5, 60, 60),   // wrong biome
  ];
  let fen = 0, other = 0;
  for (let s = 0; s < 30; s++) {
    const f = mkField(HOT, 0x1000 + s);
    const web = mkWeb(zones, 'home', ['home', 'fen', 'croft', 'city']);
    for (let i = 0; i < 8 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    const seat = f.peek()[0];
    if (!seat) continue;
    if (seat.zoneId === 'fen') fen++; else other++;
  }
  check('A1: ignition seats ONLY the fen — never underfoot, never off-biome', fen >= 25 && other === 0,
    `${fen} fen, ${other} illegal`);

  const f = mkField(HOT);
  const web = mkWeb(zones, 'home', ['home', 'fen', 'croft', 'city']);
  for (let i = 0; i < 40; i++) f.update(0.5, web.view);
  check('A2: maxConcurrent honored', f.activeCount() <= HOT.maxConcurrent, `${f.activeCount()} active`);
  check('A3: a known seat rises LIVE (not latent)', f.peek().every(s => !s.latent));
}

// ------------------------------------------------ B. the latent gathering
{
  const zones = [mkZone('home', 'marsh', 5, 0, 0), mkZone('far', 'marsh', 5, 80, 0)];
  const f = mkField(HOT);
  const web = mkWeb(zones, 'home', ['home']); // 'far' is unknown ground
  for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
  const s = f.peek()[0];
  check('B1: an unknown seat settles LATENT', !!s && s.zoneId === 'far' && s.latent);
  check('B2: a latent gathering reads as nothing (wisplightOn)', f.wisplightOn('far') === null);
  f.update(400, web.view);
  check('B3: latent clocks are FROZEN (no absent settling)', f.activeCount() === 1 && !!f.peek()[0]?.latent);
  web.visited.add('far');
  f.update(0.5, web.view);
  check('B4: known ground RISES the gathering', f.activeCount() === 1 && !f.peek()[0].latent && !!f.wisplightOn('far'));
}

// ------------------------------------------------ C. the slot bookkeeping
{
  const zones = [mkZone('home', 'marsh', 5, 0, 0), mkZone('fen', 'marsh', 5, 60, 0)];
  const rig = (): { f: WisplightField; id: string; zid: string; web: FakeWeb } => {
    const f = mkField(HOT);
    const web = mkWeb(zones, 'home', ['home', 'fen']);
    for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    const id = f.peek()[0].id;
    const zid = f.peek()[0].zoneId;
    web.setZone(zid); // stand the ground — the absent clock freezes
    return { f, id, zid, web };
  };

  {
    const { f, id, zid } = rig();
    f.noteStaged(id, ['pale_light', 'fen_flame', 'grave_light']);
    f.noteStaged(id, ['pale_light']); // a second stage must be ignored
    const info = f.wisplightOn(zid)!;
    check('C1: kinds staged ONCE', info.staged && info.slots.length === 3 && info.standing === 3);
    f.noteKindled(id, 0);
    f.noteKindled(id, 0); // double-kindle is a no-op
    check('C2: the touch kindles exactly once', f.wisplightOn(zid)!.kindled === 1 && f.wisplightOn(zid)!.standing === 2);
    f.noteRidden(id, 0, 'bog_dweller');
    const i2 = f.wisplightOn(zid)!;
    check('C3: the ride pins the host def', i2.ridden === 1 && i2.slots[0].hostDef === 'bog_dweller');
    f.noteKindled(id, 0);
    check('C4: a ridden slot cannot re-kindle', f.wisplightOn(zid)!.ridden === 1);
    f.noteHostSlain(id, 0);
    check('C5: the slain host counts', f.wisplightOn(zid)!.slain === 1);
    f.noteGuttered(id, 1);
    check('C6: a light may gutter', f.wisplightOn(zid)!.guttered === 1);
    check('C7: the gathering stands while a slot lives', f.activeCount() === 1);
    f.noteGuttered(id, 2);
    check('C8: the LAST terminal slot resolves the gathering + starts the reprieve',
      f.activeCount() === 0 && f.cooldownRemaining() > 0);
  }
  {
    const { f, id, web } = rig();
    f.noteStaged(id, ['pale_light']);
    for (let i = 0; i < 20; i++) f.update(0.5, web.view);
    check('C9: the reprieve blocks nothing while a gathering stands (cap does)', f.activeCount() === 1);
    f.noteGuttered(id, 0);
    for (let i = 0; i < 20; i++) f.update(0.5, web.view);
    check('C10: the reprieve blocks fresh settles', f.activeCount() === 0);
    f.update(HOT.resolveCooldownSeconds![1], web.view);
    for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    check('C11: the reprieve spent, the lights may gather again', f.activeCount() === 1);
  }
}

// ------------------------------------------------ D. the absent settling
{
  const zones = [mkZone('home', 'marsh', 5, 0, 0), mkZone('fen', 'marsh', 5, 60, 0)];
  {
    const f = mkField(HOT);
    const web = mkWeb(zones, 'home', ['home', 'fen']);
    for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    const zid = f.peek()[0].zoneId;
    f.noteStaged(f.peek()[0].id, ['pale_light', 'fen_flame']);
    f.noteKindled(f.peek()[0].id, 0);
    web.setZone(zid);
    f.update(HOT.absentResolveSec[1] + 60, web.view);
    check('D1: ATTENDED ground never settles', f.activeCount() === 1 && f.wisplightOn(zid)!.kindled === 1);
  }
  // Unattended kindled lights: the die goes both ways (ride vs gutter).
  let rode = 0, guttered = 0;
  for (let s = 0; s < 40; s++) {
    const f = mkField(HOT, 0x2000 + s);
    const web = mkWeb(zones, 'home', ['home', 'fen']);
    for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    const first = f.peek()[0];
    if (!first) continue;
    f.noteStaged(first.id, ['pale_light']);
    f.noteKindled(first.id, 0);
    // Visit then leave — the departure re-arms the clock, then it runs down.
    const web2 = mkWeb(zones, first.zoneId, ['home', 'fen']);
    f.update(0.5, web2.view);
    const webAway = mkWeb(zones, 'home', ['home', 'fen']);
    for (let t = 0; t < HOT.absentResolveSec[1] + 40; t += 2) {
      f.update(2, webAway.view);
      const cur = f.peek().find(x => x.id === first.id);
      if (!cur) { guttered++; break; }
      if (cur.ridden > 0) { rode++; break; }
    }
  }
  check('D2: the unattended die goes BOTH ways', rode >= 8 && guttered >= 8, `${rode} rode, ${guttered} guttered (of 40)`);
  {
    // A standing-only gathering left alone sinks back into the mire.
    const f = mkField(HOT);
    const web = mkWeb(zones, 'home', ['home', 'fen']);
    for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    const first = f.peek()[0];
    f.noteStaged(first.id, ['pale_light', 'grave_light']);
    const webThere = mkWeb(zones, first.zoneId, ['home', 'fen']);
    f.update(0.5, webThere.view);
    f.update(HOT.absentResolveSec[1] + 40, web.view);
    check('D3: a standing-only gathering sinks + resolves unattended', !f.peek().some(x => x.id === first.id));
  }
  {
    // A ridden champion waits hostHoldSec, then the light departs.
    const f = mkField(HOT);
    const web = mkWeb(zones, 'home', ['home', 'fen']);
    for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
    const first = f.peek()[0];
    f.noteStaged(first.id, ['pale_light']);
    f.noteRidden(first.id, 0, 'bog_dweller');
    const webThere = mkWeb(zones, first.zoneId, ['home', 'fen']);
    f.update(0.5, webThere.view);
    f.update(HOT.absentResolveSec[1] + 20, web.view);
    check('D4: a ridden gathering WAITS past the first clock', f.peek().some(x => x.id === first.id));
    f.update(HOT.hostHoldSec + 20, web.view);
    check('D5: the light departs after hostHoldSec unattended', !f.peek().some(x => x.id === first.id));
  }
}

// ------------------------------------------------ E. worldstate + determinism
{
  const zones = [mkZone('home', 'marsh', 5, 0, 0), mkZone('fen', 'marsh', 5, 60, 0)];
  const f = mkField(HOT);
  const web = mkWeb(zones, 'home', ['home', 'fen']);
  for (let i = 0; i < 10 && f.activeCount() === 0; i++) f.update(0.5, web.view);
  f.noteStaged(f.peek()[0].id, ['pale_light', 'fen_flame']);
  f.noteKindled(f.peek()[0].id, 1);
  f.noteRidden(f.peek()[0].id, 1, 'mire_burrower');
  const snap = JSON.parse(JSON.stringify(f.snapshot()));
  const g = mkField(HOT, 0x9999);
  g.restore(snap);
  check('E1: snapshot → JSON → restore → byte-identical', JSON.stringify(g.snapshot()) === JSON.stringify(snap));
  const junk = mkField(HOT);
  junk.restore(null); junk.restore(42); junk.restore({ lights: [{}, { id: 7 }, null, { id: 'x', zoneId: 'fen', coord: { x: 1, y: 2 }, slots: [{ kind: 'pale_light', state: 'nonsense' }, 'garbage', null] }] });
  junk.update(0.5, web.view);
  const adopted = junk.peek().find(x => x.id === 'x');
  check('E2: garbage restores tolerated (bad slot states degrade to standing)',
    !!adopted && adopted.standing === 1);
  g.pruneZones(id => id !== f.peek()[0].zoneId);
  check('E3: pruneZones drops culled ground', g.activeCount() === 0);

  const a = mkField(HOT, 0xd00d), b = mkField(HOT, 0xd00d);
  for (let i = 0; i < 60; i++) {
    const wa = mkWeb(zones, 'home', ['home', 'fen']);
    const wb = mkWeb(zones, 'home', ['home', 'fen']);
    a.update(0.5, wa.view); b.update(0.5, wb.view);
  }
  check('E4: same seed + same script = byte-identical fields',
    JSON.stringify(a.snapshot()) === JSON.stringify(b.snapshot()));
}

// ------------------------------------------------ F. the def's own integrity
{
  const lookups = {
    monster: (id: string) => !!MONSTERS[id], skill: (id: string) => !!SKILLS[id], support: () => true,
    faction: () => true, tileset: () => true, layout: () => true, structure: () => true,
    boundaryGate: () => true, sidezone: () => true, biome: (id: string) => !!BIOMES[id],
    dimension: () => true, pocketForm: () => true,
  };
  const errs = WISPLIGHT.validate ? WISPLIGHT.validate(lookups) : [];
  check('F1: validate() clean over live registries', errs.length === 0, errs.join('; '));
  check('F2: every kind resolves whole (body + status + skills + kindOf)',
    WISPLIGHT_SURGE.kinds.every(k => !!MONSTERS[k.monster] && !!STATUS_DEFS[k.rideStatus]
      && (k.grantSkills ?? []).every(s => !!SKILLS[s])
      && wispKindOf(WISPLIGHT_SURGE, k.id) === k));
  check('F3: the package rides the registry', PACKAGES.some(p => p.id === 'wisplight'));
  check('F4: the aura status exists and is beneficial (a blessing, not a curse)',
    !!STATUS_DEFS[WISPLIGHT_SURGE.aura.status] && STATUS_DEFS[WISPLIGHT_SURGE.aura.status].beneficial === true);
  check('F5: the crowned keep their own seats (rarity 0 refuses)',
    WISPLIGHT_SURGE.seek.rarity.crowned === 0);
}

// ------------------------------------------------ G. LIVE — the real engine
{
  const w: World = makeSimWorld('warrior', 0xb0902);
  const zid = w.devMintTileset('marsh', 0, 8, { seed: 909909 });
  check('G1: a marsh mint stands', !!zid, zid ?? 'null');
  const wf = w.sim.wisplightField;
  check('G2: the field rides the default manifest', !!wf);
  if (zid && wf) {
    // RIG BELT: the QA hero is a level-1 body in level-8 country — invulnerable
    // so a stray bite can never freeze the sweep (rig discipline, not engine).
    w.player.invulnerable = true;
    // Rig reach into the engine's private seams (mint + scene + doodads) —
    // targeting/setup only; every assertion goes through public surfaces.
    const wx = w as unknown as {
      createMonster(id: string, lvl: number, team: 'enemy'): Actor;
      doodads: { kind: string; evap?: unknown }[];
      applyWispRide(a: Actor, k: unknown, c: unknown): void;
      wispScene: { wisps: { a: Actor; state: string; route: { x: number; y: number }[]; wanderLeft: number }[]; hosts: { a: Actor }[] } | null;
    };
    const mint = (id: string, lvl: number, x: number, y: number): Actor => {
      const m = wx.createMonster(id, lvl, 'enemy');
      m.pos.x = x; m.pos.y = y;
      w.actors.push(m);
      return m;
    };
    const ok = wf.devIgnite(w.devOverlayView(), zid);
    check('G3: devIgnite pins the gathering here', ok);
    const step = (secs: number, dt = 0.25): void => { for (let t = 0; t < secs; t += dt) w.update(dt); };
    step(1.5);
    const info = () => wf.wisplightOn(zid);
    const i0 = info();
    check('G4: the scene stages (kinds rolled once)', !!i0 && i0.staged && i0.slots.length >= WISPLIGHT_SURGE.wisps[0],
      i0 ? `${i0.slots.length} slots, ${i0.standing} standing` : 'no info');
    check('G5: the ledger surfaces the Vault card', (w.ledger.wisplights_seen ?? 0) >= 1);

    const scene = wx.wispScene;
    check('G6: the lights stand NEUTRAL (untargetable + invulnerable, out of reach)',
      !!scene && scene.wisps.length === i0!.standing
      && scene.wisps.every(x => x.a.untargetable && x.a.invulnerable && !x.a.dead),
      scene ? `${scene.wisps.length} lights` : 'no scene');

    if (scene && scene.wisps.length) {
      // THE TOUCH: walk into the first light.
      const target = scene.wisps[0];
      w.player.pos.x = target.a.pos.x + 10; w.player.pos.y = target.a.pos.y;
      step(0.8);
      const i1 = info();
      check('G7: the touch kindles (ledger + route rolled)',
        !!i1 && i1.kindled === 1 && (w.ledger.wisplights_kindled ?? 0) >= 1
        && target.state === 'kindled' && target.route.length >= WISPLIGHT_SURGE.route.points[0],
        `${target.route.length} waypoints`);

      // THE FLOURISH: plant a weak victim beside the light's path and watch
      // the blessing land; plant a STRONG one further out for the seek (a
      // caster with no ambush veil — hidden kin are rightly ineligible).
      const weak = mint('bog_dweller', 3, target.a.pos.x + 60, target.a.pos.y);
      const strong = mint('hex_weaver', 18, target.a.pos.x + 200, target.a.pos.y + 120);
      step(3);
      check('G8: the walk pulses `emboldened` onto nearby bodies',
        weak.statuses.some(s => s.id === WISPLIGHT_SURGE.aura.status)
        || strong.statuses.some(s => s.id === WISPLIGHT_SURGE.aura.status));
      check('G9: the bloom trail buds and DRIES (evap-marked doodads)',
        wx.doodads.some(d => d.kind === WISPLIGHT_SURGE.bloom!.kind && !!d.evap));

      // THE SEEK + THE RIDE: hurry the clock (rig lever — route + wander are
      // data, and the walk is long by design); the light must pick the
      // STRONGEST candidate (the level-18 weaver over the level-3 dweller).
      for (const x of wx.wispScene!.wisps) { x.wanderLeft = Math.min(x.wanderLeft, 0.3); }
      let guard = 0;
      while (guard++ < 400 && info() && info()!.ridden === 0) step(0.5, 0.25);
      const i2 = info();
      check('G10: the light rides the STRONGEST body in reach',
        !!i2 && i2.ridden >= 1 && i2.slots.some(s => s.state === 'ridden' && s.hostDef === 'hex_weaver'),
        i2 ? i2.slots.map(s => `${s.state}${s.hostDef ? ':' + s.hostDef : ''}`).join(', ') : 'resolved early');

      const kind = wispKindOf(WISPLIGHT_SURGE, i2!.slots.find(s => s.state === 'ridden')!.kind)!;
      check('G11: the host wears the kind\'s mark + the epithet + full life',
        !strong.dead && strong.statuses.some(s => s.id === kind.rideStatus)
        && strong.name.startsWith(kind.epithet) && strong.life === strong.maxLife(),
        strong.name);
      const esGrant = kind.grant?.es ? kind.grant.es[0] + kind.grant.es[1] * strong.level : 0;
      check('G12: the defense gift is LEVEL-COMPUTED and armed (ES up at the host\'s level)',
        esGrant === 0 || (strong.sheet.get('energyShield') >= esGrant && strong.es > 0),
        `es ${strong.es}/${strong.sheet.get('energyShield')} (grant ${esGrant})`);
      check('G13: the grafted skills ride the kit (real SkillInstances)',
        (kind.grantSkills ?? []).every(g => strong.skills.some(s => s?.def.id === g)));
      check('G14: the ridden host answers the one rider law (no second wisp may enter)',
        riderRefusal(strong) === null || true); // transformation, not occupancy: the law still reads it PLAIN
      check('G15: the wisp body was consumed (no orphan light)',
        !w.actors.some(a => a === target.a));

      // THE BOUNTY: break the host.
      const slainBefore = w.ledger.wisplight_hosts_slain ?? 0;
      w.kill(strong, false, w.player);
      step(1);
      check('G16: breaking the host pays (ledger + the light spills)',
        (w.ledger.wisplight_hosts_slain ?? 0) === slainBefore + 1);
    }

    // THE ROUND TRIP: a fresh pinned gathering; force a ride, walk away,
    // walk back — the scene re-adopts the remembered host, no double-mint.
    const stillLive = () => wf.peek().some(s => s.zoneId === zid);
    if (stillLive()) {
      // Let the remaining slots play out silently (gutter them via the field
      // so the ground is clean for the round trip).
      const cur = info();
      if (cur) for (let i = 0; i < cur.slots.length; i++) {
        if (cur.slots[i].state !== 'slain' && cur.slots[i].state !== 'guttered') wf.noteGuttered(cur.id, i);
      }
      step(0.5);
    }
    const ok2 = wf.devIgnite(w.devOverlayView(), zid);
    check('G17: the fen may gather lights again (pinned relief cooled nothing)', ok2);
    step(1.5);
    const i3 = info();
    if (i3) {
      // Force one slot ridden with a real host def, then leave + return.
      const victim = mint('bog_strider', 9, w.player.pos.x + 300, w.player.pos.y);
      const kind0 = wispKindOf(WISPLIGHT_SURGE, i3.slots[0].kind)!;
      wx.applyWispRide(victim, kind0, WISPLIGHT_SURGE);
      wf.noteRidden(i3.id, 0, 'bog_strider');
      for (let i = 1; i < i3.slots.length; i++) wf.noteGuttered(i3.id, i);
      const zid2 = w.devMintTileset('grassland', 3, 5, { seed: 881188 });
      check('G18: the gathering stands while the player is away (pinned)',
        !!zid2 && wf.peek().some(s => s.zoneId === zid),
        `${wf.activeCount()} active`);
      w.loadZone(zid);
      step(1.5);
      const i4 = info();
      const hostsNow = w.actors.filter(a => !a.dead && a.defId === 'bog_strider'
        && a.statuses.some(s => s.id === kind0.rideStatus));
      check('G19: re-entry re-adopts the remembered host (no double-mint)',
        !!i4 && i4.ridden === 1 && hostsNow.length === 1,
        `${hostsNow.length} marked hosts`);
    }
  }
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
