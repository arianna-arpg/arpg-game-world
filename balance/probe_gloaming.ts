// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE GLOAMING end to end on the real engine
// (docs/engine/gloaming.md). Pins:
//   - the survival rows: breath UNCHANGED byte-for-byte, light wearing the
//     drowning-shaped underflow ramp + its own named doom (no meter may
//     borrow another's death cry),
//   - the generalized underflow: damage ramps with continuous emptiness,
//     clocks + warnings are PER RESOURCE (breath and light panic on their
//     own schedules), refill resets exactly one clock,
//   - the LIGHTWELL fabric: registered rows, spawn + pool state, residence
//     FEED, per-resident pool drain + the monster's wellDrain hunger
//     (defend-the-lamp with zero bespoke AI), the dim curve shrinking the
//     TESTED reach exactly as the drawn one (one resolver), dissipation at
//     zero, and the kindle plant's effectDuration fold,
//   - the FRONT: origin-biome seeds gloom first, coverage monotone by hops,
//     sheltered + sanctuary ground never covered, waxing → holding → waning
//     with the rim fading FIRST both directions (one formula, no steps),
//     cooldown after, snapshot/restore roundtrip + same-seed determinism,
//     affectSpawns injecting the dark's kin at depth,
//   - the in-zone engine half: the meter drains outside light and holds
//     inside it, gloomveiled lands on everyone in the dark EXCEPT the
//     dark's own kin (and never on the lit), the discovery + outlasted
//     ledgers stamp once each,
//   - the queued levers: decayPerSec (abandoned gloomwells gutter; the
//     decay-free wick holds byte-still), the BURST mode (light_spot's
//     run-over gulp byte-parity incl. the touch pad, no-meter no-pop,
//     full-meter waste, never light cover), the pooled-AMBIENT attach
//     (zone-load mint, idempotent TTL revisit, wire ADOPT without twins),
//     the map TERRITORY (tiles + road tendrils + one frontier path), and
//     the surge.pairs three-way-light-war ledger (engine lane + resume).
// Run: npx tsx balance/probe_gloaming.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import type { ZoneDef } from '../src/data/zones';
import type { OverlayView } from '../src/world/overlay';
import type { PackageGate } from '../src/packages/types';
import { SURVIVAL_RESOURCES } from '../src/world/regions';
import { LIGHTWELLS, lightReach, wellDimScale } from '../src/engine/lightwells';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { MONSTERS } from '../src/data/monsters';
import { GloamingField, type GloamingSurge } from '../src/packages/overlays/gloaming';
import { GLOAMING_SURGE } from '../src/packages/defs/gloaming';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x910a);

const step = (w: World, dt: number, n = 1): void => { for (let i = 0; i < n; i++) w.update(dt); };

// ---------------------------------------------------------------- the rows --
{
  const b = SURVIVAL_RESOURCES.breath;
  check('breath row unchanged (max/regen/ramp/text/color)',
    b.max === 12 && b.regen === 5 && b.underflowPctLifePerSec === 0.05
    && b.underflowRampTo === 0.25 && b.underflowRampSecs === 10
    && b.underflowText === 'drowning!' && b.color === '#6ac0f8');
  const l = SURVIVAL_RESOURCES.light;
  check('light row wears the drowning-shaped ramp',
    l.max === 100 && l.regen === 0 && l.underflowPctLifePerSec === 0.05
    && l.underflowRampTo === 0.25 && l.underflowRampSecs === 10);
  check('light names its own doom (never borrows breath\'s cry)',
    !!l.underflowText && l.underflowText !== b.underflowText);
  for (const r of Object.values(SURVIVAL_RESOURCES)) {
    if (r.underflowPctLifePerSec > 0 || r.underflowRampTo !== undefined) {
      check(`survival '${r.id}' with underflow damage names it`, !!r.underflowText);
    }
  }
}

{
  check('lightwell rows: gloomwell pooled', LIGHTWELLS.gloomwell?.pool === 26 && LIGHTWELLS.gloomwell.feed === 9);
  check('lightwell rows: kindled_wick pooled', LIGHTWELLS.kindled_wick?.pool === 18);
  check('lightwell rows: campfire steady (no pool)', LIGHTWELLS.campfire !== undefined && LIGHTWELLS.campfire.pool === undefined);
  const undressed = Object.values(LIGHTWELLS).filter(r => !DOODAD_VISUALS[r.kind]?.light);
  check('every lightwell kind wears a light spec (drawn==tested exists)',
    undressed.length === 0, undressed.map(r => r.kind).join(','));
  check('snuffwick drinks wells as data', (MONSTERS.snuffwick?.wellDrain ?? 0) > 0);
  check('gloamborn are context-locked bodies', MONSTERS.snuffwick?.faction === 'gloamborn'
    && MONSTERS.murk_prowler?.faction === 'gloamborn'
    && MONSTERS.wick_keeper?.faction === 'gloamborn'
    && MONSTERS.hollow_shepherd?.faction === 'gloamborn');
}

// ----------------------------------------------- the generalized underflow --
{
  const w = makeSimWorld('warrior', 0xbeef);
  const hero = w.player;
  hero.sheet.setSource('probe', [{ stat: 'life', kind: 'flat', value: 99999 }]);
  hero.life = hero.maxLife();
  const drain = (res: string, amt: number, dt: number): void => {
    // The ramp reads WORLD TIME since the clock stamped — advance it as the
    // drain ticks (a raw drain call outside update() would otherwise freeze
    // the clock at one instant and read the floor forever).
    (w as unknown as { time: number }).time += dt;
    (w as unknown as { drainSurvival(a: Actor, r: string, d: number, t: number): void })
      .drainSurvival(hero, res, amt, dt);
  };

  // Empty the light meter and hold it empty: damage per tick RAMPS.
  hero.survival = new Map([['light', 0.01]]);
  drain('light', 100, 0.1); // empties this tick → the clock stamps
  const life0 = hero.life;
  drain('light', 100, 0.1);
  const early = life0 - hero.life;
  for (let t = 0; t < 9.4; t += 0.1) drain('light', 100, 0.1);
  const lifeLate = hero.life;
  drain('light', 100, 0.1);
  const late = lifeLate - hero.life;
  check('underflow damage ramps with continuous emptiness', late > early * 3.5,
    `early ${early.toFixed(2)}/tick → late ${late.toFixed(2)}/tick`);

  // Per-resource clocks: breath empties NOW, light has been empty ~10s —
  // breath's damage restarts at the floor while light's rides the peak.
  hero.survival.set('breath', 0.01);
  drain('breath', 100, 0.1);
  const lifeB = hero.life;
  drain('breath', 100, 0.1);
  const breathTick = lifeB - hero.life;
  check('clocks are per resource (fresh breath panics at the floor)',
    breathTick < late * 0.5, `breath ${breathTick.toFixed(2)} vs light ${late.toFixed(2)}`);
  const us = (hero as unknown as { underflowSince?: Record<string, number> }).underflowSince;
  check('both clocks stamped independently',
    !!us && us.light !== undefined && us.breath !== undefined && us.light !== us.breath);

  // Refill ONE meter: only ITS clock clears.
  hero.survival.set('light', 50);
  drain('light', 1, 0.1); // v > 0 → light's ramp resets
  check('refill resets exactly one clock', us!.light === undefined && us!.breath !== undefined);
}

// ------------------------------------------------------ lightwell mechanics --
{
  const w = makeSimWorld('warrior', 0xcafe);
  const hero = w.player;
  hero.sheet.setSource('probe', [{ stat: 'life', kind: 'flat', value: 99999 }]);
  hero.life = hero.maxLife();
  const at = vec(hero.pos.x + 160, hero.pos.y);
  const d = w.spawnLightwell('gloomwell', at, { radius: 16 })!;
  check('spawnLightwell attaches the pool', !!d.well && d.well.power === 26 && d.well.max === 26);
  const reach0 = lightReach(d)!;
  check('reach = spec grammar × dim (full power)', Math.abs(reach0 - 6.5 * 16) < 1e-9, `${reach0}`);

  // Drawn == tested at the rim.
  hero.pos.x = at.x - (reach0 - 4); hero.pos.y = at.y;
  check('inside the drawn glow = covered', w.lightCoverAt(hero.pos));
  hero.pos.x = at.x - (reach0 + 8);
  check('outside the drawn glow = not covered', !w.lightCoverAt(hero.pos));

  // Residence FEED + per-resident pool drain (1 resident ≈ 1 power/sec).
  // On CLEAR (un-gloomed) ground the recovery lane composes with the feed —
  // 9 (well) + 18 (recoverPerSec) — the meter races home either way; the
  // gloomed-ground feed-only rate is pinned in the engine-half section.
  hero.pos.x = at.x - 20;
  hero.survival = new Map([['light', 40]]);
  step(w, 0.1, 10);
  const fed = hero.survival.get('light')!;
  check('residence feeds the meter (feed + clear-ground recovery ≈ 27/s)', fed > 64 && fed < 70, `${fed.toFixed(1)}`);
  check('one resident drains ~1.35/s (per-resident + the row\'s decay)',
    d.well!.power > 24.4 && d.well!.power < 24.9, `${d.well!.power.toFixed(2)}`);

  // The dark drinks too: a snuffwick inside the reach adds its wellDrain.
  const wick = w.createMonster('snuffwick', 5, 'enemy');
  wick.pos = vec(at.x + 20, at.y);
  w.actors.push(wick);
  const p0 = d.well!.power;
  step(w, 0.1, 10);
  const perSec = p0 - d.well!.power;
  check('hero + snuffwick drain ~2.75/s (per-resident + hunger + decay)',
    perSec > 2.45 && perSec < 3.05, `${perSec.toFixed(2)}/s`);
  wick.dead = true;

  // The DIM CURVE shrinks the TESTED reach exactly as the drawn one.
  d.well!.power = d.well!.max * 0.25;
  const dim = wellDimScale(d);
  check('quarter power → half reach (dimExp 0.5)', Math.abs(dim - 0.5) < 1e-9, `${dim}`);
  hero.pos.x = at.x - (reach0 * 0.6); // inside the FULL glow, outside the dimmed one
  check('a dimmed pool no longer covers the old rim', !w.lightCoverAt(hero.pos));
  hero.pos.x = at.x - (reach0 * 0.4);
  check('…but still covers its dimmed heart', w.lightCoverAt(hero.pos));

  // Guttering out: the last sip dissipates the well.
  d.well!.power = 0.05;
  hero.pos.x = at.x - 20;
  step(w, 0.1, 3);
  check('a spent well dissipates', !w.doodads.includes(d));

  // The kindle plant folds the caster's investment into the pool.
  const k = (w as unknown as { plantKindle(a: Actor, kind: string, p: { x: number; y: number }, aoe: number, dur: number): void });
  const before = w.doodads.length;
  k.plantKindle(hero, 'kindled_wick', vec(at.x, at.y + 300), 1, 1.5);
  const wickWell = w.doodads[w.doodads.length - 1];
  check('kindle plants a wick', w.doodads.length === before + 1 && wickWell.kind === 'kindled_wick');
  check('effectDuration deepens the pool (18 × 1.5)', wickWell.well?.max === 27, `${wickWell.well?.max}`);
}

// -------------------------------------- the queued levers (decay/burst/ambient) --
{
  seedGlobalRandom(0xfade); // pin this section's stream (worlds share the global rng)
  const w = makeSimWorld('warrior', 0xfade);
  const hero = w.player;
  hero.sheet.setSource('probe', [{ stat: 'life', kind: 'flat', value: 99999 }]);
  hero.life = hero.maxLife();

  // DECAY: an abandoned gloomwell gutters on its own clock; a decay-free
  // kindled wick abandoned beside it holds byte-still.
  const far = vec(hero.pos.x + 900, hero.pos.y);
  const gw = w.spawnLightwell('gloomwell', far, { radius: 16 })!;
  const kw = w.spawnLightwell('kindled_wick', vec(far.x, far.y + 400), { radius: 12 })!;
  const kw0 = kw.well!.power;
  step(w, 0.25, 40); // 10s, nobody near either light
  const lost = 26 - gw.well!.power;
  check('an abandoned gloomwell decays ~0.35/s', lost > 3.1 && lost < 3.9, `${lost.toFixed(2)} in 10s`);
  check('a decay-free wick abandoned holds byte-still', kw.well!.power === kw0, `${kw.well!.power}`);

  // BURST (the light-spot grammar): rows pin the descent dials.
  check('light_spot wears the burst row (grant = the surge\'s 45, on touch)',
    LIGHTWELLS.light_spot?.burst?.grant === 45 && LIGHTWELLS.light_spot.burst.on === 'touch'
    && LIGHTWELLS.light_spot.feed === undefined && LIGHTWELLS.light_spot.pool === undefined);
  check('the gourd is the pooled-ambient debut', LIGHTWELLS.jack_o_lantern?.pool === 40);

  // A spot pops on TOUCH for a meter-carrying body: one gulp, consumed.
  const spotAt = vec(hero.pos.x + 300, hero.pos.y);
  w.doodads.push({ pos: vec(spotAt.x, spotAt.y), radius: 18, kind: 'light_spot' as never });
  const spot = w.doodads[w.doodads.length - 1];
  hero.survival = new Map([['light', 40]]);
  hero.pos = vec(spotAt.x - (18 + hero.radius + 4) - 6, spotAt.y); // just OUTSIDE the pad
  step(w, 0.1, 2);
  check('outside the touch pad the spot keeps', w.doodads.includes(spot));
  hero.pos = vec(spotAt.x - (18 + hero.radius + 2), spotAt.y);     // inside the pad
  const m0 = hero.survival.get('light')!; // clear-ground recovery also runs (~1.8/tick)
  step(w, 0.1, 1);
  const gained = (hero.survival.get('light') ?? 0) - m0;
  check('run-over pops the spot for one 45-gulp',
    !w.doodads.includes(spot) && gained > 44.9 && gained < 47, `+${gained.toFixed(1)}`);

  // No meter = no pop (no flare wasted in peacetime)…
  w.doodads.push({ pos: vec(spotAt.x, spotAt.y + 200), radius: 18, kind: 'light_spot' as never });
  const spot2 = w.doodads[w.doodads.length - 1];
  hero.survival = undefined as never;
  hero.pos = vec(spotAt.x, spotAt.y + 200);
  step(w, 0.1, 2);
  check('a meterless body never pops a flare', w.doodads.includes(spot2));
  // …but a FULL meter still consumes it (sloppy routing pays — descent
  // economy). The clear-ground recovery lane retires a full meter the same
  // tick, so the meter reads full-or-retired — never over.
  hero.survival = new Map([['light', 100]]);
  step(w, 0.1, 1);
  check('a full meter still consumes the spot (the gulp is wasted)',
    !w.doodads.includes(spot2) && (hero.survival?.get('light') ?? 100) === 100);

  // Bursts are pickups, never shelter: no light cover at a spot's heart.
  w.doodads.push({ pos: vec(spotAt.x, spotAt.y - 300), radius: 18, kind: 'light_spot' as never });
  check('a flare never shelters (burst rows are not light cover)',
    !w.lightCoverAt(vec(spotAt.x, spotAt.y - 300)));
  check('…while a pooled well does', w.lightCoverAt(vec(gw.pos.x, gw.pos.y)));

  // AMBIENT ATTACH (zone load, host/solo): a pooled-row authored doodad gets
  // its well minted; idempotent across re-attach (the TTL revisit contract).
  w.doodads.push({ pos: vec(hero.pos.x + 500, hero.pos.y + 500), radius: 14, kind: 'jack_o_lantern' as never });
  const gourd = w.doodads[w.doodads.length - 1];
  const attach = (w as unknown as { attachZoneWells(): void });
  attach.attachZoneWells();
  check('zone-load attach mints the gourd\'s pool', gourd.well?.power === 40 && gourd.well.max === 40);
  const id0 = gourd.well!.id;
  gourd.well!.power = 17;
  attach.attachZoneWells();
  check('attach is idempotent (a drained gourd stays drained)', gourd.well!.power === 17 && gourd.well!.id === id0);

  // WIRE ADOPT (client side): an incoming well row lands ON the authored
  // doodad (matched kind+pos) instead of minting a twin; absent = gone.
  const w2 = makeSimWorld('warrior', 0xfeed);
  w2.doodads.push({ pos: vec(100, 100), radius: 14, kind: 'jack_o_lantern' as never });
  const cg = w2.doodads[w2.doodads.length - 1];
  const nDood = w2.doodads.length;
  w2.applyNetWells([{ i: 7001, k: 'jack_o_lantern', x: 100, y: 100, r: 14, pf: 0.5 }]);
  check('the wire ADOPTS the authored doodad (no twin minted)',
    w2.doodads.length === nDood && cg.well?.id === 7001 && cg.well.power === 0.5 && cg.well.max === 1);
  w2.applyNetWells([]);
  check('absent from the wire = guttered on the client too', !w2.doodads.includes(cg));
}

// ------------------------------------------------------------- the front ----
{
  const FAST: GloamingSurge = {
    ...GLOAMING_SURGE,
    advanceEverySec: 2, holdSec: 3, recedeEverySec: 1.5, cooldownSec: [5, 5],
  };
  const gate = (): PackageGate => ({
    active: true, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1,
  });
  const mkZone = (id: string, x: number, biome: string, exits: string[], extra?: Record<string, unknown>): ZoneDef =>
    ({ id, name: id, level: 5, biome, sky: 'open', map: { x, y: 0 },
      exits: exits.map(to => ({ to, side: 'e' })), objective: { kind: 'hunt' }, ...extra }) as unknown as ZoneDef;
  const nodes = [
    mkZone('gw1', 0, 'gloamwood', ['a']),
    mkZone('a', 86, 'grove', ['gw1', 'b', 'shel', 'town']),
    mkZone('b', 172, 'grove', ['a', 'c']),
    mkZone('c', 258, 'grove', ['b']),
    mkZone('shel', 86, 'grove', ['a'], { sky: 'sheltered' }),
    mkZone('town', 86, 'grove', ['a'], { objective: { kind: 'safe' } }),
  ];
  const byId = Object.fromEntries(nodes.map(z => [z.id, z]));
  const view: OverlayView = {
    nodes, byId, allNodes: nodes,
    terrain: () => 'land',
    currentZoneId: 'a', time: 150, census: {}, charLevel: 10,
    gates: new Map(), visited: new Set(nodes.map(z => z.id)), surveyed: new Set<string>(),
  };
  const mk = (): GloamingField => new GloamingField({ seed: 0x910a, gate, biomeSeed: 7 }, FAST);

  const f = mk();
  f.devIgnite();
  f.update(0.5, view);
  check('front: ignites (waxing)', f.phaseNow() === 'waxing');
  check('front: news announces the rising', f.drainNews().length > 0);
  f.update(2, view); // ringF ≈ 0.25
  const seedG = f.gloomOn('gw1');
  check('front: the wood glooms FIRST', seedG > 0 && f.gloomOn('b') === 0, `seed ${seedG.toFixed(2)}`);
  // While the ground is rim-fresh (< 0.45) the zone-precision breathing ring
  // marks it — captured HERE; at full hold nothing is rim-fresh any more.
  check('territory: rim-fresh nodes wear the breathing ring',
    f.renderMap(nodes).over.includes('<circle'));
  for (let i = 0; i < 16; i++) f.update(0.5, view); // → ring cap
  check('front: holds at full reach', f.phaseNow() === 'holding');
  const g = ['gw1', 'a', 'b', 'c'].map(id => f.gloomOn(id));
  check('front: coverage monotone by hops', g[0] >= g[1] && g[1] >= g[2] && g[2] >= g[3] && g[3] > 0,
    g.map(x => x.toFixed(2)).join(' ≥ '));
  check('front: the wood stands in FULL dark', g[0] === 1);
  check('front: sheltered ground never covered', f.gloomOn('shel') === 0);
  check('front: sanctuaries never covered', f.gloomOn('town') === 0);

  // THE TERRITORY: at full reach the map reads as ONE dark country — tiles
  // (never alpha-stacking), a road TENDRIL between covered neighbours, and
  // a single breathing frontier path. The pinned cell (x=126,y=0) lies on
  // the a→b road MIDPOINT, outside both node discs: only the tendril
  // stamps it — the contiguity is real, not two blobs near each other.
  const layer = f.renderMap(nodes);
  const rects = (layer.under.match(/<rect /g) ?? []).length;
  check('territory: the covered web rasterizes to tiles', rects > 100, `${rects} cells`);
  check('territory: road tendrils bridge covered neighbours',
    layer.under.includes('<rect x="126.0" y="0.0"'));
  check('territory: one breathing frontier path', layer.over.includes('<path d="M'));

  // Pair ledger: once per front, resume-safe.
  check('pairs: first sighting announces', f.markPairTold('longcandle') === true
    && f.drainNews().some(n => n.text.includes('Candle-war')));
  check('pairs: …exactly once per front', f.markPairTold('longcandle') === false);
  const fPair = mk();
  fPair.restore(JSON.parse(JSON.stringify(f.snapshot())));
  check('pairs: the told set survives resume', fPair.markPairTold('longcandle') === false);

  // Roundtrip + determinism.
  const snapHold = JSON.stringify(f.snapshot());
  const f2 = mk();
  f2.restore(JSON.parse(snapHold));
  f2.update(0, view); // rebuild coverage from the restored graph
  const same = ['gw1', 'a', 'b', 'c', 'shel', 'town'].every(id => Math.abs(f2.gloomOn(id) - f.gloomOn(id)) < 1e-9);
  check('front: restore reproduces coverage exactly', same);
  const d1 = mk(), d2 = mk();
  d1.devIgnite(); d2.devIgnite();
  for (let i = 0; i < 30; i++) { d1.update(0.5, view); d2.update(0.5, view); }
  check('front: same seed, same ticks ⇒ identical snapshots',
    JSON.stringify(d1.snapshot()) === JSON.stringify(d2.snapshot()));

  // The dark's kin arrive at depth.
  const bias = f.affectSpawns(byId.gw1);
  check('front: deep gloom injects the gloamborn', bias.injectFactions.includes('gloamborn')
    && (bias.factionMul.nightkin ?? 1) > 1.5);

  // Waning: the rim clears FIRST, then the wood; then cooldown.
  f.update(3.2, view); // holdSec spent → waning
  check('front: wanes after the hold', f.phaseNow() === 'waning');
  for (let i = 0; i < 7; i++) f.update(0.5, view); // ringF 4 → ~1.7
  check('front: the rim clears before the wood', f.gloomOn('c') === 0 && f.gloomOn('gw1') > 0.5,
    `c ${f.gloomOn('c')} gw1 ${f.gloomOn('gw1').toFixed(2)}`);
  for (let i = 0; i < 12; i++) f.update(0.5, view);
  check('front: recedes home (idle + cooldown)', f.phaseNow() === 'idle' && f.gloomOn('gw1') === 0);
}

// ------------------------------------------- the in-zone engine half --------
{
  seedGlobalRandom(0xd00d); // pin this section's stream (insert-order-proof)
  const w = makeSimWorld('warrior', 0xd00d);
  const hero = w.player;
  hero.sheet.setSource('probe', [{ stat: 'life', kind: 'flat', value: 99999 }]);
  hero.life = hero.maxLife();
  const gf = w.sim.gloamingField;
  check('quiet manifest still constructs the field (gates carry the off)', !!gf);
  if (gf) {
    const raw = gf as unknown as { gloomOn(z: string): number; phaseNow(): string };
    raw.gloomOn = () => 1;          // the front stands over the arena
    raw.phaseNow = () => 'holding';

    // Outside any light: the meter drains at the surge rate.
    step(w, 0.1, 1); // zone-change branch snaps gloomCur to 1
    check('gloom is honest on arrival (no polite fade-in)', w.gloom() === 1);
    step(w, 0.1, 20);
    const lit = hero.survival?.get('light');
    check('the dark drinks the unlit (~6/s)', lit !== undefined && lit > 86 && lit < 89.5, `${lit?.toFixed(1)}`);

    // Discovery stamped once.
    check('discovery ledger stamped in the deep dark', (w.ledger.gloaming_seen ?? 0) === 1);

    // The veil: hero wears it; the dark's kin never do; the lit never do.
    const wolf = w.createMonster('zombie', 5, 'enemy');
    wolf.pos = vec(hero.pos.x + 400, hero.pos.y);
    w.actors.push(wolf);
    const wick = w.createMonster('snuffwick', 5, 'enemy');
    wick.pos = vec(hero.pos.x + 440, hero.pos.y);
    w.actors.push(wick);
    step(w, 0.1, 3);
    const worn = (a: Actor): boolean => a.statuses.some(s => s.id === 'gloomveiled');
    check('gloomveiled lands on bodies in the dark', worn(hero) && worn(wolf));
    check('the dark\'s own kin hunt unveiled', !worn(wick));

    // Light lifts both the drain AND the veil.
    const d = w.spawnLightwell('gloomwell', vec(hero.pos.x, hero.pos.y))!;
    const before = hero.survival!.get('light')!;
    step(w, 0.1, 15);
    const after = hero.survival!.get('light')!;
    check('inside the light the meter REFILLS', after > before + 8, `${before.toFixed(1)} → ${after.toFixed(1)}`);
    step(w, 0.1, 12); // the 1.2s veil expires unrefreshed inside the glow
    check('the veil lifts in the light', !worn(hero));
    check('…while the unlit wolf stays veiled', worn(wolf));
    d.well!.power = d.well!.max; // keep it burning for the recede beat

    // THE THREE-WAY LIGHT WAR (surge.pairs, generic by overlay id): another
    // event live in this zone under deep gloom → told once, engine-side.
    const lc = w.sim.overlayFor('longcandle');
    check('the quiet sim constructs the candle field too', !!lc);
    if (lc) {
      (lc as unknown as { activityAt(z: string): number }).activityAt = () => 1;
      step(w, 0.1, 2);
      check('deep gloom + a live candle-war = the pairing told (engine lane)',
        gf.markPairTold('longcandle') === false);
    }

    // Outlasting a witnessed front stamps the survival ledger ONCE.
    raw.phaseNow = () => 'idle';
    raw.gloomOn = () => 0;
    step(w, 0.1, 2);
    check('outlasted ledger stamps on the observed recession', (w.ledger.gloaming_survived ?? 0) === 1);
    step(w, 0.1, 5);
    check('…exactly once', (w.ledger.gloaming_survived ?? 0) === 1);

    // Clear ground: the meter recovers and the HUD row retires at full.
    for (let i = 0; i < 40 && hero.survival?.has('light'); i++) step(w, 0.25);
    check('clear ground refills then retires the meter', !hero.survival?.has('light'));
  }
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
