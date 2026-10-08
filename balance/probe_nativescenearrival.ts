/** Retained original-method oracle, complete native layouts, and real factory bodies. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import ts from 'typescript';
import { makeSimWorld } from '../src/sim/arena';
import { NAV_CFG } from '../src/engine/world';
import { resetActorIdCounter } from '../src/engine/actor';
import { MONSTERS } from '../src/data/monsters';
import { START_ZONE } from '../src/data/zones';
import { TRAINING_YARD } from '../src/data/trainingYard';
import { dist, rand, vec } from '../src/core/math';
import { Rng, withSeededRandom } from '../src/core/rng';
import { GridWalkField } from '../src/world/gridWalk';
import { hullOf } from '../src/world/shape';
import { clearSeaMemo } from '../src/world/seas';
import { MIN_PORTAL_SEP } from '../src/engine/worldgen';
import { generateLayout } from '../src/engine/levelgen';
import { adoptNativeAreaLayout } from '../src/engine/nativeAreaLayout';
import { captureNativeGeneration } from '../src/worldmass/nativeGeneration';
import { NativeAreaSceneGeometry } from '../src/worldmass/nativeAreaSceneGeometry';
import { NativeAreaSceneArrival } from '../src/worldmass/nativeAreaSceneArrival';
import * as native from '../src/engine/nativeSceneArrival';

// Original methods/config pinned to 80d896af; two complete archived native layouts.
// Lastlight below is a fresh complete generation, not a replacement archived fixture.
const archiveBytes=gunzipSync(Buffer.from('H4sIAAAAAAAACqVW/W7bNhD/v09xNYZGSlVV/opjp25QtGlmDG2KJBiwdUV7Ik+2GpkUSMqJ4wTYQ+wJ9yQDRcuW7bQr0H8k8o73u0/ecfEIoHEtVcZ/RT1pDKDB8PCw3TukNlLM4y5j3U7cZdhLDroRHh70Whg3W70Otfs86WGcdHqHdNBKmt1+N2FJ0mkEFjJPhQU7jPhh/wCTXhujTqfPm51O037iftLifYr6nVaUHERNJ8SScWmBFNrAh7PXv51cfn799hSGsIAc2dUrRfg2k1INIArbAaBS6QyzU4WMBtCOIrg/ckhTMhPJdWMAHx8BACzKL0BD4JSsDhKJVIxe1RBKyfJQlgp7qBl129GKeJUKbiXfldBviGWo0KRSrOW0LBQr4XMLawgeUOP5A5jJlMPiL2Glnj+Hi7PfT85PRqfvL/8YgCY08O/f/1TelYRUjMFLUsHfKqKLXBpglk0azIRAG6nmPnh2zUmlM+LASOhCB5ArGdNnk5LScD46hUs/dHpdlMfWJBjWoh3Wo3rkziZSgecEEGQCZpLqEJmRSvuVHwBpAh6GhnAKj4dD2CNB0/ke3N0BhpyQuxWTIkkFuU0hDKoxGYwz8q1JJhVFpbWyccphWEIkIw7H8O7s/cXlyfnFxyXpEwygEJwsKj+qGzPlx2GOWqezUp3dipydy+/osqp4qo2HYS514Dy9lYJOhFFzfwOew8uhC+A34VCMLSC8hGbFAOsCmkmIBkXL6Qnn8GxLVTgPwPFudnk3/hptAAoF96LAoX4YwT60/C07ZGFgCDNi3jYSPHVyTGoPxdiHffBcUTyFTuQHa0Xb9lWSOhUPSa5NyMiAkTB0CCzDaf5BamdJvaY9WRjrtEKeFtqH42PYpGxG32bJyJ0UwYsqJ4u17S4KCarKigSVmZA2F8YGr9KwBNNGFcwUinSYkRibCbyEaK3d6U9QbaiolHxNjSFFfMdfG/0EVRnyMmXPDqIADiI/sIaV8dwg+w95XnUMhlYLTAttQEhjL4B0vQAT2xBQcLgm+Gr5iSwED2EkAEGgUvJ6C42hmhGUhtpGY2GcF8BQQF5kGSDEks8hRnYFUhinK5fKYBbW0co8l6mp4rCboOrW1OUAnjwB7/E3wn93B451jdnVcagI2cS2jE0EsOdWx9antmo+WKXI9+F4na+BTUMt0PfVcrUo72N1j2R4E4CR4aoplMfu19NAEdYmUElyLXN1BKCxsqpOrEqmTqtflA16vZDrjHUU61QbmcZy+6n83wcPT8giJvWGEkJDfGc0dvudZu/nRmMd35MDOIu/EjPpjC5yYgHYwIz4ALRRqRj7A4ilzAhFdeXsFZSh1eyGTSy1LmfNYxlaaB8UmUIJSDDTVVt2QpYdaiZzgqEVRcZkIcxe7TovZb3loCv5YUZ8TOrjEuCK5rZDfbGbwS8LGab8/ssnS4rKEm/Wy2KF6FqCnOYZGeIrn3U4Qe05n109/V8hlSZtFM0u6I8lWhAq0uZPKegs2cl0p99vtn8u0xsKPJ5O13kNAM0AFnAzAFFMY1JHMK+WcB8A3bCs4DTix7VKcAu4A2E70zJndsjEpM02e1j+AohtQx7Zp0dq5rvPmlv7rHGRC2eYFaTXXeMd5v7WM8e7DXk6JaFTKWzK93ShEmS055fVWPpoi/E21DmxFDO3SXlZcSuvvvsM8W7DKebl+EcT3viwvw8teFrR544+d/Sth8kLiLkPC+c1PyojA8PSgqOqIjcL0574gcJbxmOrsh7Z1f1/s/dVNkwMAAA=','base64'));
const fixtureBytes=gunzipSync(Buffer.from('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','base64'));
const hash = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
assert.equal(hash(archiveBytes), '054d268f2d4a3d653dac5dafe9b9da32a481aa2ae5b8f8be292ad2acf0b86c7c');
assert.equal(hash(fixtureBytes), '65e9e83cf176e490f61ee51b27df4cc71106bb7d6c54237882decdccf3a6e70b');
const archive = JSON.parse(archiveBytes.toString('utf8'));
assert(fs.readFileSync(new URL('../src/engine/world.ts', import.meta.url), 'utf8').includes(archive.cfg), 'original arrival policy stays authoritative');
const fixtures = JSON.parse(fixtureBytes.toString('utf8'));
const exports: any = {};
Function('exports', 'MONSTERS', 'dist', 'rand', 'vec', ts.transpileModule(
  archive.cfg + ';export class Original {' + archive.methods.map((r: any) => r.source).join('\n') + '}',
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
)(exports, MONSTERS, dist, rand, vec);
const original = exports.Original.prototype;
const policy = Function(archive.cfg + ';return POCKET_CFG;')();
const mappings: Record<string, keyof typeof native> = {
  enforceArrivalGrace: 'enforceNativeArrivalGrace', uberDefeated: 'nativeUberDefeated', nearestZoneOf: 'nativeNearestZoneOf',
};
const norm = (s: string) => ts.transpileModule(s, { compilerOptions: { target: 99, module: 0, removeComments: true } }).outputText;
const source = ts.createSourceFile('core.ts', fs.readFileSync(new URL('../src/engine/nativeSceneArrival.ts', import.meta.url), 'utf8'), 99, true);
for (const m of archive.methods) {
  const old = ts.createSourceFile('old.ts', 'class Old {' + m.source + '}', 99, true);
  const method = (old.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration;
  const fn = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === mappings[m.name]) as ts.FunctionDeclaration;
  assert.equal(norm(fn.body!.getText(source)), norm(method.body!.getText(old).replaceAll('this.', 'host.').replaceAll('POCKET_CFG.', 'policy.')));
  assert.equal(norm(fn.parameters.slice(m.name === 'enforceArrivalGrace' ? 2 : 1).map(p => p.getText(source)).join(',')), norm(method.parameters.map(p => p.getText(old)).join(',')));
}
function snap(v: any, seen = new Map<any, number>()): any {
  if (v === undefined) return { $undefined: true };
  if (typeof v === 'number' && !Number.isFinite(v)) return { $number: String(v) };
  if (typeof v === 'function') return { $function: true };
  if (v === null || typeof v !== 'object') return v;
  if (seen.has(v)) return { $ref: seen.get(v) };
  seen.set(v, seen.size);
  if (v instanceof Set) return { $set: [...v].map(x => snap(x, seen)) };
  if (v instanceof Map) return { $map: [...v].map(([k, x]) => [snap(k, seen), snap(x, seen)]) };
  if (Array.isArray(v)) return v.map(x => snap(x, seen));
  return Object.fromEntries(Object.keys(v).map(k => [k, snap(v[k], seen)]));
}
const lane = process.argv.find(a => a.startsWith('--arrival-lane='))?.slice('--arrival-lane='.length);
withSeededRandom(713, () => {
  const w: any = makeSimWorld('warrior', 713);
  w.account.features.delete(TRAINING_YARD.feature); w.loadZone(START_ZONE);
  const layout = captureNativeGeneration(w.zone, () => generateLayout(w.zone, w.arena, new Rng(w.currentZoneSeed), w.zoneEntry, w.exits.map((e: any) => e.pos), [])).value;
  fixtures.push({ generated: { zone: w.zone, arena: w.arena, entry: w.zoneEntry, exits: w.exits.map((e: any) => e.pos), layout: { ...layout, walk: undefined }, grid: layout.walk instanceof GridWalkField ? layout.walk.pack() : undefined } });
});
const unavailable = () => { throw Error('unused campaign service reached'); };
function run(f: any, test: string, mode: string) {
  clearSeaMemo();
  return withSeededRandom(991, () => {
    const w: any = makeSimWorld('warrior', 991), g = structuredClone(f.generated), zone = g.zone, entry = g.entry, layout = g.layout;
    for (const k of ['exitBoundaries', 'exitRoads', 'exitMelds']) if (zone[k]) zone[k] = zone[k].map((v: any) => v ?? undefined);
    w.zoneMap[zone.id] = zone; w.zone = zone; w.arena = g.arena; w.arenaHull = hullOf(g.arena); w.zoneEntry = entry; w.time = 79;
    w.player.pos = { ...entry }; w.player.level = 19; w.actors = [w.player];
    const scene = { zone, actors: w.actors, player: w.player };
    const campaign = { account: w.account, completedObjectives: w.completedObjectives, zoneMap: w.zoneMap };
    const geometry: any = mode === 'local' ? new NativeAreaSceneGeometry(scene, g.arena,
      { ledger: w.ledger, seasSeen: w.seasSeen, oceanBearing: unavailable, seaNameOf: unavailable, notice: unavailable, text: unavailable,
        time: 79, seats: w.seats, seatOf: unavailable, drainSurvival: unavailable, radianceCondHeld: unavailable, createMonster: unavailable },
      { navigationPad: NAV_CFG.pad, eventSpacing: 240, minPortalSeparation: MIN_PORTAL_SEP }) : w;
    layout.walk = g.grid ? GridWalkField.unpack(g.grid) : undefined;
    geometry.currentZoneSeed = zone.seed; geometry.zoneEntry = entry;
    geometry.exits = g.exits.map((pos: any, i: number) => ({ pos, def: zone.exits[i] }));
    if (mode === 'local') geometry.adopt(layout, entry);
    else adoptNativeAreaLayout(w.nativeAreaLayoutHost(), zone, layout, entry, zone.id);
    resetActorIdCounter(880000);
    const passive = Object.values(MONSTERS).find(d => d.passive && !d.npcRole)!.id;
    const specs = [
      ['skeleton_warrior', 'enemy', 0, ''], ['skeleton_warrior', 'enemy', 25, ''],
      ['skeleton_warrior', 'enemy', policy.arrivalGrace, ''], ['skeleton_warrior', 'enemy', 500, ''],
      ['skeleton_warrior', 'enemy', 0, 'dead'], ['skeleton_warrior', 'enemy', 0, 'untargetable'],
      ['skeleton_warrior', 'enemy', 0, 'confine'], ['skeleton_warrior', 'player', 0, ''],
      ['townsfolk_smith', 'enemy', 0, ''], [passive, 'enemy', 0, ''],
    ];
    for (const [id, team, offset, flag] of specs) {
      const a = w.createMonster(id, 19, team); a.pos = { x: entry.x + Number(offset), y: entry.y };
      if (flag) a[flag] = flag === 'confine' ? { center: { ...entry }, radius: 100 } : true;
      scene.actors.push(a);
    }
    const owner = mode === 'local' ? new NativeAreaSceneArrival({ scene, geometry, campaign, policy }) : null;
    if (test === 'replacement') {
      scene.actors = scene.actors.slice(); campaign.zoneMap = { ...campaign.zoneMap };
      campaign.completedObjectives = new Set(campaign.completedObjectives);
      if (!owner) { w.actors = scene.actors; w.zoneMap = campaign.zoneMap; w.completedObjectives = campaign.completedObjectives; }
    }
    if (owner) for (const key of ['zone', 'actors', 'player', 'walk', 'structures', 'zoneEntry', 'clampPos', 'findFreeSpot', 'farthestStand', 'account', 'completedObjectives', 'zoneMap'])
      Object.defineProperty(w, key, { configurable: true, get() { throw Error('foreign arrival ' + key); } });
    const target = owner ?? w;
    const calls: any[] = [], draws: any[] = [], next = Rng.prototype.next;
    for (const name of ['clampPos', 'findFreeSpot', 'farthestStand']) {
      const fn = geometry[name]; let count = 0;
      geometry[name] = function (...args: any[]) {
        const result = fn.apply(this, args); calls.push([name, snap(args), snap(result)]);
        if (test === name + '-failure' && ++count === 2) throw Error('second real ' + name);
        return result;
      };
    }
    Rng.prototype.next = function () { const before = this.snapshot(), value = next.call(this); draws.push([before, value, this.snapshot()]); return value; };
    const state = () => snap({ actors: scene.actors, entry: geometry.zoneEntry, structures: geometry.structures, doodads: geometry.doodads, grounds: geometry.grounds, walk: geometry.walk instanceof GridWalkField ? geometry.walk.pack() : geometry.walk });
    const before = state(); let error: string | undefined;
    try { if (mode === 'archive') original.enforceArrivalGrace.call(w); else target.enforceArrivalGrace(); }
    catch (e) { error = (e as Error).message; }
    finally { Rng.prototype.next = next; }
    const after = state();
    if (test.endsWith('-failure')) assert.equal(error, 'second real ' + test.slice(0, -8)); else assert.equal(error, undefined);
    for (let i = 3; i < scene.actors.length; i++) assert.deepEqual(after.actors[i], before.actors[i], 'out-of-range or protected native body stays exact');
    if (!error) assert.notDeepEqual(after.actors[1].pos, before.actors[1].pos);
    else if (calls.filter(c => c[0] === 'findFreeSpot').length === 1) assert.deepEqual(after.actors[1].pos, before.actors[1].pos, 'failure in first fallback precedes its position publication');
    else assert.notDeepEqual(after.actors[1].pos, before.actors[1].pos, 'earlier relocation survives native partial failure');
    campaign.completedObjectives.add(zone.id); campaign.account.ledger['uber:bound'] = 1; campaign.account.ledger['actual-uber'] = 0;
    const reads: any[] = [];
    for (const o of [{ kind: 'cull' }, { kind: 'boss' }, { kind: 'boss', id: 'bound', uber: { scope: 'run' } }, { kind: 'boss', id: 'bound', uber: { scope: 'account' } }, { kind: 'boss', id: 'bound', uber: { scope: 'account', key: 'actual-uber' } }])
      for (const id of [zone.id, 'never-completed']) reads.push(['uber', o, id, mode === 'archive' ? original.uberDefeated.call(w, o, id) : target.uberDefeated(o, id)]);
    for (const [dimension, exclude] of [['surface', undefined], ['missing-dimension', undefined], ['surface', zone.id]])
      reads.push(['nearest', dimension, exclude, mode === 'archive' ? original.nearestZoneOf.call(w, dimension, zone.map, exclude) : target.nearestZoneOf(dimension!, zone.map, exclude)]);
    return { id: zone.id, test, before, after, calls, draws, reads, error, continuation: Math.random() };
  });
}
// Separate mechanism controls exercise the native cramped-entry fallbacks and read order.
function mechanisms() {
  const results: any[] = [];
  for (const mode of ['no-far', 'outside-jitter', 'inside-jitter', 'unreachable-jitter', 'no-structures', 'no-reachability']) {
    const outputs = [];
    for (const old of [true, false]) outputs.push(withSeededRandom(77, () => {
      const calls: any[] = []; let clamps = 0;
      const host: any = { actors: [{ team: 'enemy', pos: vec(0, 0), radius: 15 }], zoneEntry: vec(0, 0),
        structures: mode === 'no-structures' ? [] : [{}],
        walk: mode === 'no-reachability' ? null : { reachable(a: any, b: any) { calls.push(['reachable', a, b, this === host.walk]); return mode !== 'unreachable-jitter'; } },
        findFreeSpot(p: any, r: number) { calls.push(['free', p, r]); return null; },
        clampPos(p: any, r: number) { calls.push(['clamp', p, r]); return ++clamps === 1 || mode === 'inside-jitter' ? vec(0, 0) : p; },
        farthestStand(r: number, connected: boolean) { calls.push(['far', r, connected]); return mode === 'no-far' ? null : vec(600, 600); },
      };
      if (old) original.enforceArrivalGrace.call(host); else native.enforceNativeArrivalGrace(host, policy);
      if (['inside-jitter', 'unreachable-jitter'].includes(mode)) assert.deepEqual(host.actors[0].pos, vec(600, 600));
      if (mode === 'no-far') assert.deepEqual(host.actors[0].pos, vec(0, 0));
      return { mode, actors: host.actors, calls, continuation: Math.random() };
    }));
    assert.deepEqual(outputs[1], outputs[0]); results.push(outputs[0]);
  }
  const graph: any = { first: { id: 'first', map: vec(-10, 0) }, second: { id: 'second', map: vec(10, 0), dimension: 'surface' }, special: { id: 'special', map: vec(0, 0), special: true }, other: { id: 'other', map: vec(0, 0), dimension: 'abyss' } };
  assert.equal(native.nativeNearestZoneOf({ zoneMap: graph }, 'surface', vec(0, 0)), 'first');
  assert.equal(native.nativeNearestZoneOf({ zoneMap: graph }, 'surface', vec(0, 0), 'first'), 'second');
  assert.equal(native.nativeNearestZoneOf({ zoneMap: graph }, 'abyss', vec(0, 0)), 'other');
  assert.equal(native.nativeNearestZoneOf({ zoneMap: graph }, 'absent', vec(0, 0)), null);
  return results;
}
function bindings() {
  return withSeededRandom(85, () => {
    const w: any = makeSimWorld('warrior', 85), before = Object.keys(w), host = w.nativeSceneArrivalHost();
    assert.equal(w.nativeSceneArrivalHost(), host); assert(Object.isFrozen(host)); assert.deepEqual(Object.keys(w), before);
    assert.equal(Object.getOwnPropertyDescriptor(w, 'nativeSceneArrivalView')?.enumerable, false);
    const scene = { zone: w.zone, actors: w.actors, player: w.player };
    const geometry = new NativeAreaSceneGeometry(scene, w.arena, { ledger: w.ledger, seasSeen: w.seasSeen, oceanBearing: unavailable, seaNameOf: unavailable, notice: unavailable, text: unavailable, time: 0, seats: w.seats, seatOf: unavailable, drainSurvival: unavailable, radianceCondHeld: unavailable, createMonster: unavailable }, { navigationPad: NAV_CFG.pad, eventSpacing: 240, minPortalSeparation: MIN_PORTAL_SEP });
    const campaign = { account: w.account, completedObjectives: w.completedObjectives, zoneMap: w.zoneMap };
    const input = { scene, geometry, campaign, policy }, owner = new NativeAreaSceneArrival(input);
    assert.equal(owner.host.actors, scene.actors); assert(Object.isFrozen(owner.host)); assert(Object.isFrozen(owner.input)); assert.deepEqual(Object.keys(owner), []);
    let read = 0;
    for (const key of ['scene', 'geometry', 'campaign', 'policy']) {
      const bad = { ...input }; Object.defineProperty(bad, key, { get() { read++; throw Error('binding read'); } });
      assert.throws(() => new NativeAreaSceneArrival(bad), /own object binding/);
    }
    assert.equal(read, 0); assert.throws(() => new NativeAreaSceneArrival({ ...input, scene: { ...scene } }), /identical/);
    assert.throws(() => new NativeAreaSceneArrival({ ...input, policy: Object.create(policy) }), /explicit arrival policy/);
    for (const key of ['account', 'completedObjectives', 'zoneMap']) {
      const bad: any = { ...campaign }; delete bad[key]; Object.setPrototypeOf(bad, campaign);
      assert.throws(() => new NativeAreaSceneArrival({ ...input, campaign: bad }), /explicit campaign field/);
    }
    for (const [provider, view] of [[w, host], [geometry, owner.host]] as any[]) for (const key of ['clampPos', 'findFreeSpot', 'farthestStand']) {
      const d = Object.getOwnPropertyDescriptor(provider, key), tape: any[] = [];
      try {
        Object.defineProperty(provider, key, { configurable: true, value: function (...args: any[]) { tape.push([this === provider, args]); return 71; } });
        const selected = view[key]; Object.defineProperty(provider, key, { configurable: true, value: unavailable });
        assert.equal(selected('receipt', undefined), 71); assert.deepEqual(tape, [[true, ['receipt', undefined]]]);
      } finally { if (d) Object.defineProperty(provider, key, d); else delete provider[key]; }
    }
    for (const key of ['actors', 'zoneEntry', 'structures', 'walk', 'account', 'completedObjectives', 'zoneMap']) {
      const d = Object.getOwnPropertyDescriptor(w, key), marker = { key };
      try { Object.defineProperty(w, key, { configurable: true, value: marker }); assert.equal(host[key], marker); }
      finally { if (d) Object.defineProperty(w, key, d); else delete w[key]; }
    }
    scene.actors = []; geometry.zoneEntry = vec(3, 4); geometry.structures = []; geometry.walk = null;
    campaign.account = { ...campaign.account }; campaign.completedObjectives = new Set(); campaign.zoneMap = {};
    for (const [key, expected] of Object.entries({ actors: scene.actors, zoneEntry: geometry.zoneEntry, structures: geometry.structures, walk: geometry.walk, ...campaign })) assert.equal((owner.host as any)[key], expected);
    for (const m of archive.methods) assert.equal(w[m.name].length, original[m.name].length);
  });
}
if (lane) {
  assert(['archive', 'current', 'local'].includes(lane));
  const rows = fixtures.flatMap((f: any) => ['normal', 'replacement', 'findFreeSpot-failure', 'clampPos-failure'].map(test => run(f, test, lane)));
  console.log('NATIVE_ARRIVAL_COLD=' + gzipSync(JSON.stringify(rows)).toString('base64'));
} else {
  bindings(); const controls = mechanisms(), outputs: string[] = [];
  for (const mode of ['archive', 'current', 'local']) {
    const child = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', fileURLToPath(import.meta.url), '--arrival-lane=' + mode], { encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
    assert.equal(child.status, 0, mode + ' ' + String(child.error ?? '') + child.stderr.slice(-3000));
    const line = child.stdout.split(/\r?\n/).find(s => s.startsWith('NATIVE_ARRIVAL_COLD=')); assert(line);
    outputs.push(gunzipSync(Buffer.from(line.slice('NATIVE_ARRIVAL_COLD='.length), 'base64')).toString('utf8'));
  }
  for (let i = 1; i < outputs.length; i++) assert.equal(hash(outputs[i]), hash(outputs[0]), 'complete native arrival output and random continuation');
  assert.equal(hash(outputs[0]), 'b7aca130a981d05c86e24333ee2ebdf54c0e61a6b16faa03265638fe29eacdaf');
  const rows = JSON.parse(outputs[0]);
  console.log('PASS native arrival', { triples: rows.length, bodies: rows.length * 10, draws: rows.reduce((n: number, r: any) => n + r.draws.length, 0), partialErrors: rows.filter((r: any) => r.error).length, fallbackControls: controls.length, sha256: hash(outputs[0]) });
}
