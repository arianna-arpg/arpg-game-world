import { strict as assert } from 'node:assert';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { mod } from '../src/engine/stats';
import { STATUS_DEFS, type ActiveStatus } from '../src/engine/status';
import { applyDot } from '../src/engine/damage';
import { afflictionPressureOf, statusDamageOver } from '../src/engine/afflictionPressure';
import { collectActiveFx, collectFalterK } from '../src/render/screenFx';
import { composeAfflictionEdge } from '../src/render/vis/afflictionEdge';
import { collectStatusBodyParts } from '../src/render/vis/defenseCueLayer';
import { AFFLICTION_CUE_CFG as C, afflictionMotif } from '../src/data/afflictionCues';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { makeSettings, serializeSettings, deserializeSettings } from '../src/meta/settings';
import { CLASSES } from '../src/data/classes';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';
import { NullInput } from '../src/net/intent';

seedGlobalRandom(0xaff1);
let count = 0;
const check = (name: string, ok: boolean) => { assert.ok(ok, name); console.log('PASS ' + name); count++; };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-7;
const status = (id: string, dps = 10, remaining = 6, stacks = 1): ActiveStatus => ({ id, dps, remaining, stacks, sourceName: 'probe' });
function fixture() {
  const w = makeSimWorld('guardian', 0xaff1), p = w.player;
  w.actors = [p]; p.statuses = [];
  p.sheet.setSource('affliction-rig', [mod('life', 'override', 100), mod('damageTaken', 'override', 1),
    ...['energyShield', 'manaShield', 'esDotResist', 'esDotBypass', 'staggerFrac', 'lastGasp', 'lifeRegen'].map(s => mod(s, 'override', 0))]);
  p.fillResources(); p.life = 100; p.es = p.ward = p.absorb = 0;
  return { w, p };
}
const total = (p: ReturnType<typeof fixture>['p']) => Object.values(afflictionPressureOf(p)).reduce((a, b) => a + b, 0);
{
  const { p } = fixture();
  check('healthy statusless body has no pressure', total(p) === 0);
  p.statuses = [status('burn')];
  check('two seconds of burn measures current life', near(total(p), 0.2));
  p.life = 20; check('same burn grows as actual life shrinks', near(total(p), 1));
  p.reservedLife = 80; check('reservation does not invent extra spendable life', near(total(p), 1));
  p.life = 0.5; check('fractional remaining life is not rounded up to a whole point', near(total(p), 40)); p.life = 20;
  p.statuses[0].remaining = 0.1; check('nearly expired burn cannot project a full horizon', near(total(p), 0.05));
  p.statuses[0].remaining = 0; check('expired statuses stop pressure and screen cues immediately', total(p) === 0 && !collectActiveFx(p.statuses).length);
  p.statuses = [status('poison', 10, 6, 3)]; p.life = 100;
  check('actual stack DPS contributes', near(total(p), 0.6));
  p.invulnerable = true; check('immune body has no damage urgency', total(p) === 0); p.invulnerable = false;
  p.dead = true; check('death clears pressure', total(p) === 0); p.dead = false;
  p.downed = true; check('downed body clears pressure', total(p) === 0);
}
{
  const { p } = fixture(); p.statuses = [status('burn'), status('poison')];
  p.ward = 5; p.absorb = 5; p.es = 10;
  check('simultaneous ailments spend shared buffers only once', near(total(p), 0.2));
  const before = JSON.stringify({ statuses: p.statuses, life: p.life, ward: p.ward, absorb: p.absorb, es: p.es, mana: p.mana });
  for (let i = 0; i < 20; i++) afflictionPressureOf(p);
  check('forecast does not consume pools, statuses or clocks', before === JSON.stringify({ statuses: p.statuses, life: p.life, ward: p.ward, absorb: p.absorb, es: p.es, mana: p.mana }));
  const projected = total(p) * p.life, initial = p.life;
  for (let i = 0; i < 8; i++) { applyDot(p, 2.5, 'fire'); applyDot(p, 2.5, 'chaos'); }
  check('shared-pool estimate agrees with actual typed DoT damage', near(initial - p.life, projected));
}
for (const pool of ['ward', 'absorb', 'es'] as const) {
  const { p } = fixture(); p.statuses = [status('burn')]; p[pool] = 100;
  check(`${pool} protects life from urgency`, total(p) === 0);
}
{
  const { p } = fixture(); p.statuses = [status('burn')]; p.es = 100;
  p.sheet.setSource('affliction-rig-bypass', [mod('esDotBypass', 'override', 1, ['fire'])]);
  check('typed ES bypass remains threatening behind a full shield', near(total(p), 0.2));
  p.sheet.setSource('affliction-rig-resist', [mod('esDotResist', 'override', 1)]);
  check('ES DoT resistance suppresses threat', total(p) === 0);
  p.es = 0; check('resistance ends when the shield empties', near(total(p), 0.2));
  p.sheet.setSource('affliction-rig-taken', [mod('damageTaken', 'override', 0.5, ['fire'])]);
  check('typed damage-taken reduction scales pressure', near(total(p), 0.1));
  p.sheet.setSource('affliction-rig-mana', [mod('manaShield', 'override', 0.5)]); p.mana = 100;
  check('mana shield pays its share', near(total(p), 0.05));
}
{
  const { p } = fixture(); p.statuses = [status('burn', 40)]; p.es = 10;
  p.sheet.setSource('affliction-rig-resist', [mod('esDotResist', 'override', 0.5)]);
  check('forecast notices ES resistance ending inside the horizon', near(total(p), 0.6));
}
{
  const s = { ...status('wither_agony', 10, 8), total: 8 };
  check('ramp integrates the actual upcoming curve', near(statusDamageOver(s, 0, 2), 5));
  s.remaining = 2; check('late ramp is stronger', near(statusDamageOver(s, 0, 2), 35));
  const burst = { ...status('bleed', 0), popAcc: 12 };
  check('banked reapply burst counted once', statusDamageOver(burst, 0, 0.25) === 12 && statusDamageOver(burst, 0.25, 0.5) === 0);
}
{
  const { p } = fixture(); p.es = 1000; p.statuses = [{ ...status('doom', 0), rupture: 60 }];
  const early = total(p); check('Doom reads its armed cull bank despite ES', near(early, 0.6 * C.armedUrgencyFloor));
  p.statuses[0].remaining = 0.1; check('Doom urgency grows toward expiry', total(p) > early);
  p.life = 60; check('Doom grows toward the real cull line', total(p) > 0.9);
  check('Doom inherits a clasp instead of requiring an id branch', collectActiveFx(p.statuses)[0].def.motif === 'doom');
}
{
  const { p } = fixture(); p.statuses = [status('burn', 1)];
  const edge = () => composeAfflictionEdge(collectActiveFx(p.statuses), afflictionPressureOf(p), 'still', 0)!;
  const mild = edge().layers[0];
  check('minor burn has its own subtle kindling even at full life', mild.severity === 0 && mild.alpha > 0 && mild.alpha < 0.15 && mild.profile.gesture === 'ember');
  p.statuses = [status('burn', 20), status('bleed', 20), status('poison', 20), { ...status('doom', 0), rupture: 80 }];
  const severe = edge(), byFamily = (family: string) => severe.layers.find(l => l.family === family)!;
  check('four simultaneous ailments retain all four visual layers', severe.layers.length === 4);
  check('burn intensifies its kindling geometry and alpha', byFamily('fire').severity > mild.severity && byFamily('fire').reach > mild.reach && byFamily('fire').alpha > mild.alpha);
  check('blood is dripping material, poison is its own green vignette', byFamily('wound').profile.gesture === 'drip' && byFamily('toxin').profile.gesture === 'vignette');
  check('families retain their own authored colors without a dominant blended hue', severe.layers.every(l => l.color === STATUS_DEFS[l.sources[0]].color));
  check('clutter budget retains even the fourth family', severe.layers.every(l => l.alpha > 0) && severe.layers.reduce((n,l) => n+l.alpha,0) <= C.opacityBudget + 1e-8);
  check('budget reserves quiet presence before scaling strong effects', severe.layers.every(l => l.alpha >= l.floor));
  const original = JSON.stringify(severe); p.statuses.reverse(); check('status reordering cannot change identities or placement', original === JSON.stringify(edge()));
  const fx = collectActiveFx(p.statuses), pressure = afflictionPressureOf(p);
  check('still mode freezes every family clock', JSON.stringify(composeAfflictionEdge(fx, pressure, 'still', 0)) === JSON.stringify(composeAfflictionEdge(fx, pressure, 'still', 5)));
  check('gentle mode carries the motion clock', composeAfflictionEdge(fx, pressure, 'gentle', 5)!.seconds === 5);
  check('off removes all ailment layers', !composeAfflictionEdge(fx, pressure, 'off', 0));
  p.statuses = []; check('cleanse clears every material layer', !composeAfflictionEdge(collectActiveFx(p.statuses), {}, 'still', 0));
  p.statuses = [status('burn', 20), status('scorch', 20), status('poison', 30)];
  const grouped = edge();
  check('multiple fire ailments share a layer and aggregate only fire severity', grouped.layers.length === 2
    && grouped.layers.find(m => m.family === 'fire')!.pressure > grouped.layers.find(m => m.family === 'toxin')!.pressure
    && grouped.layers.find(m => m.family === 'fire')!.sources.length === 2);
  // Increasing a different family cannot make a mild bleed look severe.
  const mixed = collectActiveFx([status('bleed'), status('burn'), status('poison')]);
  const before = composeAfflictionEdge(mixed, { bleed: 0.01, burn: 0.01, poison: 0.01 }, 'still', 0)!;
  const after = composeAfflictionEdge(mixed, { bleed: 0.01, burn: 10, poison: 0.01 }, 'still', 0)!;
  for (const family of ['wound', 'toxin']) {
    const a = before.layers.find(l => l.family === family)!, b = after.layers.find(l => l.family === family)!;
    check(family + ' severity/shape remains its own when burn rises', a.severity === b.severity && a.reach === b.reach && a.alpha === b.alpha);
  }
  const customFx = Array.from({length:12}, (_,i) => ({id:'custom'+i,k:1,color:'#abcdef',def:{kind:'vignette' as const,motif:'custom'+i}}));
  const many = composeAfflictionEdge(customFx, Object.fromEntries(customFx.map(f => [f.id,10])), 'still', 0)!;
  check('open family registry has no strongest-N cutoff', many.layers.length === 12 && many.layers.every(l => l.alpha > 0));
  check('many custom families still respect the intensity budget', many.layers.reduce((n,l)=>n+l.alpha,0) <= C.opacityBudget + 1e-8);
}
{
  const custom = 'probe_affliction_custom';
  STATUS_DEFS[custom] = { label: 'Custom', color: '#abcdef', duration: 5, dotType: 'cold' };
  try {
    const s = status(custom), fx = collectActiveFx([s]);
    check('new damage statuses inherit a universal screen read', fx[0]?.def.kind === 'vignette' && fx[0].color === '#abcdef');
    check('unknown motif resolves safely', afflictionMotif('missing').gesture === 'notch' && afflictionMotif('__proto__').gesture === 'notch');
    STATUS_DEFS[custom].screenCue = { motif: 'doom', color: '#fedcba', intensity: 0.3 };
    check('status data overrides family, color and intensity', collectActiveFx([s])[0].def.motif === 'doom' && collectActiveFx([s])[0].color === '#fedcba');
    STATUS_DEFS[custom].screenCue = false; check('status can opt out when other cues suffice', !collectActiveFx([s]).length);
    delete STATUS_DEFS[custom].screenCue; STATUS_DEFS[custom].beneficial = true;
    check('beneficial states do not create debuff overlays', !collectActiveFx([s]).length);
  } finally { delete STATUS_DEFS[custom]; }
  const fx = collectActiveFx([status('faintness', 0, 3, 1)]);
  check('existing faintness/falter channel remains stack-scaled', collectFalterK(fx) > 0 && collectFalterK(fx) < 0.55);
  check('terrain statuses stay quiet', !collectActiveFx([status('mired', 0)]).length);
  check('separate instances of one ailment do not duplicate the screen cue', collectActiveFx([status('burn'), status('burn')]).length === 1);
}
{
  const { w, p } = fixture(); p.statuses = [status('burn', 20), { ...status('doom', 0), rupture: 50 }];
  const client = fixture().w, snapshot = serializeSnapshot(w, 1); applySnapshot(client, snapshot);
  const mirror = client.actors[snapshot.actors.findIndex(a => a.id === p.id)];
  check('remote seat receives exact host-derived threat without needing DPS stats', JSON.stringify(afflictionPressureOf(mirror)) === JSON.stringify(afflictionPressureOf(p)) && mirror.statuses.every(s => s.dps === 0));
  check('remote and host compose the same edge', JSON.stringify(composeAfflictionEdge(collectActiveFx(mirror.statuses), afflictionPressureOf(mirror), 'still', 0)) === JSON.stringify(composeAfflictionEdge(collectActiveFx(p.statuses), afflictionPressureOf(p), 'still', 0)));
  p.statuses = []; applySnapshot(client, serializeSnapshot(w, 2));
  check('snapshot reconciliation clears cured threat', !mirror.afflictionPressure && !mirror.statuses.length);
}
{
  const settings = makeSettings(); check('default is gentle', settings.afflictionOverlays === 'gentle');
  for (const mode of ['gentle', 'still', 'off'] as const) {
    settings.afflictionOverlays = mode;
    check(`${mode} preference survives save/load`, deserializeSettings(serializeSettings(settings))!.afflictionOverlays === mode);
  }
  const legacy = serializeSettings(settings); delete legacy.afflictionOverlays;
  check('old saves get the default without migration', deserializeSettings(legacy)!.afflictionOverlays === 'gentle');
}
{
  const { w, p } = fixture(); p.statuses = [status('burn', 15)];
  const guest = w.addSeat('p1', CLASSES[0], new NullInput());
  guest.actor.statuses = [status('poison', 30)]; guest.actor.life = 20; guest.actor.es = 0;
  const client = fixture().w; client.clientSeatId = 'p1';
  applySnapshot(client, serializeSnapshot(w, 3));
  check('remote screen anchors to its own afflicted hero', client.player.statuses[0].id === 'poison'
    && JSON.stringify(afflictionPressureOf(client.player)) === JSON.stringify(afflictionPressureOf(guest.actor)));
  check('remote screen does not inherit the host burn', !('burn' in afflictionPressureOf(client.player)));
  guest.actor.statuses = [status('probe_untyped_dot', 30)]; guest.actor.ward = 10000;
  applySnapshot(client, serializeSnapshot(w, 4));
  check('untyped custom DoT retains its generic presence behind a shield on the client',
    collectActiveFx(client.player.statuses)[0]?.def.kind === 'vignette' && client.player.statuses[0].dps === 0);
  guest.actor.statuses = []; applySnapshot(client, serializeSnapshot(w, 5));
  check('own-seat cleanse clears generic hints and pressure', !collectActiveFx(client.player.statuses).length && total(client.player) === 0);
}
{
  const { w, p } = fixture();
  const impaleCueIds = Object.keys(STATUS_DEFS).filter(id => id === 'impaled' || id.startsWith('impaled_'));
  for (const id of impaleCueIds) {
    p.statuses = [{ ...status(id, 0), rupture: 100, casterId: p.id }];
    const impaleCue = composeAfflictionEdge(collectActiveFx(p.statuses), afflictionPressureOf(p), 'still', 0);
    check(id + ' has lodged body steel and edge spikes without invented DoT pressure',
      collectStatusBodyParts(p)[0]?.kind === 'lodgedSpikes' && impaleCue?.layers[0].profile.gesture === 'spike'
      && impaleCue.layers[0].severity === 0 && impaleCue.layers[0].alpha > 0);
  }
  p.statuses = impaleCueIds.map(id => status(id, 0));
  const impaleCueBody = JSON.stringify(collectStatusBodyParts(p));
  check('simultaneous Impale types share one body attachment and one edge layer',
    collectStatusBodyParts(p).length === 1 && composeAfflictionEdge(collectActiveFx(p.statuses), {}, 'still', 0)!.layers.length === 1);
  p.statuses.reverse();
  check('Impale attachment does not shuffle when statuses reorder', JSON.stringify(collectStatusBodyParts(p)) === impaleCueBody);
  p.statuses.push(status('burn'), status('poison'), status('bleed'), { ...status('doom', 0), rupture: 20 });
  const impaleCueMixed = composeAfflictionEdge(collectActiveFx(p.statuses), afflictionPressureOf(p), 'still', 0)!;
  check('Impale coexists with all four ailment families within the shared budget', impaleCueMixed.layers.length === 5
    && impaleCueMixed.layers.every(l => l.alpha > 0) && impaleCueMixed.layers.reduce((n, l) => n + l.alpha, 0) <= C.opacityBudget + 1e-8);
  p.statuses = [status('impaled', 0, 0)];
  check('expired Impale leaves neither body nor screen steel', !collectStatusBodyParts(p).length && !collectActiveFx(p.statuses).length);
  p.statuses = [status('impaled', 0)]; p.dead = true;
  check('dead Impale victim has no persistent body attachment', !collectStatusBodyParts(p).length); p.dead = false; p.downed = true;
  check('downed Impale victim has no persistent body attachment', !collectStatusBodyParts(p).length); p.downed = false;
  p.endStatus('impaled');
  check('cleansing Impale clears both cues', !collectStatusBodyParts(p).length && !collectActiveFx(p.statuses).length);
  const impaleCueGuest = w.addSeat('p1', CLASSES[0], new NullInput());
  impaleCueGuest.actor.statuses = impaleCueIds.map(id => status(id, 0));
  const impaleCueClient = fixture().w; impaleCueClient.clientSeatId = 'p1';
  applySnapshot(impaleCueClient, serializeSnapshot(w, 10));
  check('remote owning seat derives the same Impale body and screen from the ordinary status wire',
    JSON.stringify(collectStatusBodyParts(impaleCueClient.player)) === JSON.stringify(collectStatusBodyParts(impaleCueGuest.actor))
    && JSON.stringify(composeAfflictionEdge(collectActiveFx(impaleCueClient.player.statuses), {}, 'still', 0))
    === JSON.stringify(composeAfflictionEdge(collectActiveFx(impaleCueGuest.actor.statuses), {}, 'still', 0)));
  check('guest Impale does not prick the healthy host screen', !collectActiveFx(p.statuses).length);
  impaleCueGuest.actor.statuses = []; applySnapshot(impaleCueClient, serializeSnapshot(w, 11));
  check('remote Impale cure clears both cues', !collectStatusBodyParts(impaleCueClient.player).length && !collectActiveFx(impaleCueClient.player.statuses).length);
}
{
  // Impale cues follow any real source, independent of an evolving skill tree.
  const { w, p } = fixture();
  const impaleCueTarget = w.createMonster('zombie', 1, 'enemy');
  impaleCueTarget.pos = { x: p.pos.x + 30, y: p.pos.y }; impaleCueTarget.tier = p.tier; impaleCueTarget.skills = [];
  impaleCueTarget.sheet.setSource('impale-cue-rig', [mod('life', 'flat', 100000), mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]);
  impaleCueTarget.fillResources(); w.actors.push(impaleCueTarget);
  p.sheet.setSource('impale-cue-accuracy', [mod('accuracy', 'flat', 100000), mod('critChance', 'override', 0)]);
  p.sheet.setSource('impale-cue-bank', [mod('impalePower', 'flat', 0.3)]);
  const impaleCueHit = makeSkillInstance({ ...SKILLS.backstab, id: 'probe_impale_cue_hit', name: 'Impale cue hit',
    tree: undefined, useTime: 0, cooldown: 0, manaCost: 0, tags: ['attack', 'melee', 'physical'],
    baseDamage: { physical: [10, 10] }, effects: [{ type: 'damage' }] });
  w.executeSkill(p, impaleCueHit, impaleCueTarget.pos);
  const impaleCueBank = impaleCueTarget.statuses.find(s => s.id === 'impaled');
  check('real Impale hit banks attributed damage and wears both cues', (impaleCueBank?.rupture ?? 0) > 0
    && impaleCueBank?.casterId === p.id && impaleCueBank.sourceName === 'Impale cue hit'
    && collectStatusBodyParts(impaleCueTarget).some(part => part.kind === 'lodgedSpikes')
    && collectActiveFx(impaleCueTarget.statuses).some(f => f.def.motif === 'impale'));
  p.sheet.removeSource('impale-cue-bank'); w.executeSkill(p, impaleCueHit, impaleCueTarget.pos);
  check('real qualifying hit discharges Impale and removes both cues', !impaleCueTarget.statuses.some(s => s.id === 'impaled')
    && !collectStatusBodyParts(impaleCueTarget).length && !collectActiveFx(impaleCueTarget.statuses).length);
}
console.log(`PASS ${count} affliction cue checks`);
