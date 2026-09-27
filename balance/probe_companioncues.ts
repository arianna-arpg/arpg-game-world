import { strict as assert } from 'node:assert';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance, type TameEffect } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { companionCueState, companionCueFlash, companionMaterial } from '../src/engine/companionCues';
import { procCueRows } from '../src/engine/procCues';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { MONSTERS } from '../src/data/monsters';
import { COMPANION_STANCES } from '../src/data/companionStances';
import { CLASSES } from '../src/data/classes';
import { NullInput } from '../src/net/intent';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { drawCompanionCueBody, drawCompanionCueLinks, drawCompanionCueFlash } from '../src/render/vis/companionCueLayer';

seedGlobalRandom(26029);
let checks = 0;
const check = (label: string, ok: unknown) => { assert.ok(ok, label); checks++; console.log('PASS ' + label); };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
function rig() {
  const w = makeSimWorld('tamer', 26029), p = w.player;
  w.actors = [p]; w.flashes = []; w.corpses = []; w.zones = []; p.pos = { x: 700, y: 700 };
  const inst = makeSkillInstance({ ...SKILLS.tame_beast, requirements: undefined });
  p.skills = [inst]; w.meta.knownSkills.set(inst.def.id, inst);
  p.sheet.setSource('companion-cue-rig', [mod('mana', 'override', 10000), mod('life', 'override', 10000), mod('accuracy', 'override', 100000), mod('critChance', 'override', 0)]); p.fillResources();
  const beast = (id = 'plains_wolf', x = 790) => { const a = w.createMonster(id, 1, 'enemy'); a.pos = { x, y: 700 }; a.anchored = true; w.actors.push(a); return a; };
  return { w, p, inst, beast };
}
{
  const { w, p, inst, beast } = rig(), a = beast();
  check('wild creature invents no ownership', !companionCueState(a, w).links.length);
  check('real tame press opens focused preparation', w.useSkill(p, inst, a.pos) && !!p.casting);
  p.casting!.elapsed = p.casting!.total * .5;
  const prepare = companionCueState(p, w).links.find(l => l.kind === 'tame');
  check('binding follows the actual cast target and progress', prepare?.to.id === a.id && near(prepare.progress!, .5));
  p.casting!.focusBroken = true;
  check('lost concentration visibly strains the same binding', companionCueState(p, w).links.some(l => l.broken));
  p.casting = null;
  check('interruption leaves no phantom taming effort', !companionCueState(p, w).links.some(l => l.kind === 'tame'));
  const fx: TameEffect = { type: 'tame', tags: ['beast'], sureBelow: .5, wildChance: 0 };
  w['tryTame'](p, inst, a, fx);
  check('hard rejection preserves wildness and snaps a binding', !a.owner && w.flashes.some(f => f.companionCue?.event === 'reject'));
  check('tame rejection never uses the damage-resistance cue', !w.flashes.some(f => f.combatCue?.style === 'resist'));
  w.flashes = []; a.life *= .1; w['tryTame'](p, inst, a, fx);
  check('successful claim wears the real keeper endpoint', a.companion && a.owner === p && companionCueState(a, w).links[0]?.to.id === p.id);
  check('settled claim records a distinct bind event and collar', w.flashes.some(f => f.companionCue?.event === 'bind') && a.extraParts?.some(x => x.kind === 'collar'));
  for (const [id, profile] of [['aggressive','hunt'], ['defensive','guard'], ['passive','heel']]) {
    w.setCompanionStance(w.localSeat, inst.def.id, id);
    check(id + ' has a distinct persistent posture', companionCueState(a, w).stance?.profile === profile);
  }
  const before = JSON.stringify([a.life, a.sheet.sourceNames(), a.standingOrder]); companionCueState(a, w);
  check('presentation reads cannot change conduct or stats', before === JSON.stringify([a.life, a.sheet.sourceNames(), a.standingOrder]));
  const client = rig().w, snap = serializeSnapshot(w, 1); applySnapshot(client, snap);
  const mirror = client.actors[snap.actors.findIndex(x => x.id === a.id)];
  check('co-op resolves keeper identity through local actor IDs', companionCueState(mirror, client).links[0]?.to.id === client.player.id && companionCueState(mirror, client).stance?.profile === 'heel');
  client.player.pos.x += 31;
  check('mirrored ownership follows interpolated keeper positions', companionCueState(mirror, client).links[0].to.x === client.player.pos.x);
  snap.actors.find(x => x.id === a.id)!.companionCues!.links[0].to.x = -99;
  check('nested wire endpoint copies cannot mutate the host', companionCueState(a, w).links[0].to.x === p.pos.x);
  w.kill(a);
  check('companion down remains incapacitation, not death', a.downed && !a.dead && !w.corpses.length && w.flashes.some(f => f.companionCue?.event === 'down'));
  check('fallen bodies retain ownership but stop showing active stance', !!companionCueState(a, w).links.length && !companionCueState(a, w).stance);
  w.reviveCompanion(a);
  check('revival keeps the established life fraction and immunity budget', !a.downed && near(a.life, a.maxLife() * .5) && a.statuses.some(s => s.id === 'companion_recovery' && near(s.remaining, 3)));
  check('revival adds a motion without a new targetability/AI hold', w.emergences.some(e => e.actorId === a.id && e.spec.motion === 'stir' && !e.held) && a.emergeUntil === undefined);
  const recoveredSnap = serializeSnapshot(w, 2); applySnapshot(client, recoveredSnap);
  const recoveredBody = client.actors[recoveredSnap.actors.findIndex(x => x.id === a.id)];
  check('recovery pose and story survive co-op with a local body identity', client.emergences.some(e => e.actorId === recoveredBody.id && e.spec.motion === 'stir' && e.recoveryCueTier === a.tier && !e.held));
  const grainsBefore = w.emergences[0].spec.grains[0]; recoveredSnap.recoveryCues![0].spec.grains[0] = 999;
  check('recovery wire cannot mutate host or client material arrays', w.emergences[0].spec.grains[0] === grainsBefore && client.emergences[0].spec.grains[0] === grainsBefore);
  applySnapshot(client, { ...recoveredSnap, recoveryCues: undefined });
  check('missing recovery wire clears an old client pose', !client.emergences.length);
  check('recovery accents retain their source story', w.flashes.some(f => f.recoveryCueTier === a.tier));
  w.flashes = []; w.releaseCompanion(a.id);
  check('release severs the bond and quietly removes the actual body', a.dead && !a.companion && !w.corpses.length && w.flashes.some(f => f.companionCue?.event === 'sever'));
  applySnapshot(client, serializeSnapshot(w, 2));
  check('removed bonds leave no stale mirrored endpoints', !client.actors.some(b => !b.dead && companionCueState(b, client).links.length));
}
{
  const { w, p, inst, beast } = rig(), a = beast();
  inst.def = { ...inst.def, companionCue: false, recoveryCues: { revive: false } };
  w.tameCompanion(p, a, inst.def.id);
  check('bond opt-out suppresses only supplemental claim presentation', a.companion && !companionCueState(a, w).links.length && !w.flashes.some(f => f.companionCue));
  w.kill(a); w.reviveCompanion(a);
  check('recovery opt-out preserves revival while silencing its pose', !a.downed && !w.emergences.length);
  check('unknown relationship materials inherit safely', companionMaterial({ profile: 'missing' }).profile === 'bond');
  check('explicit event opt-out creates no flash', companionCueFlash(a, 'bind', p, false) === undefined);
}
{
  const { w, p, beast } = rig(), a = beast('skeleton_warrior'); a.owner = p; a.team = p.team; a.sourceSkillId = '__proc:undying'; a.undyingTime = 2;
  a.life = 0; w.kill(a);
  check('undying preserves its one-use life and duration rules', !a.dead && a.undyingSpent && near(a.life, a.maxLife() * .25) && a.lifespan === 2);
  check('undying rises without an invulnerability extension', !a.untargetable && !a.emergeUntil && w.emergences.some(e => e.actorId === a.id && e.spec.motion === 'rise' && !e.held));
  w.kill(a);
  check('a second death cannot replay the undying save', a.dead);
}
{
  const { w, p, beast } = rig(), a = beast('skeleton_warrior'); a.owner = p; a.team = p.team; a.sourceSkillId = '__proc:decay';
  a.life = 1; a.decay = { t: 0, dps0: 1000, growth: 1 }; w.update(.05);
  check('actual decay death collapses its material', a.dead && w.flashes.some(f => f.combatCue?.style === 'companion_unravel'));
  const b = beast('skeleton_warrior'); b.owner = p; b.team = p.team; b.sourceSkillId = '__proc:bloom'; b.bloomIn = .01;
  p.sheet.setSource('bloom', [mod('minionBloomPower', 'override', .5)]); w.update(.02);
  const flash = w.flashes.find(f => f.combatCue?.style === 'companion_bloom');
  check('bloom uses the real explosion footprint', !!flash && near(flash.radius, 45 + b.radius * 2) && b.dead);
  const c = beast('skeleton_warrior'); c.owner = p; c.team = p.team; c.sourceSkillId = '__proc:emptybloom'; c.bloomIn = .01;
  p.sheet.removeSource('bloom'); w.flashes = []; w.update(.02);
  check('zero-power bloom invents no damaging footprint', !w.flashes.some(f => f.combatCue?.style === 'companion_bloom'));
  const d = beast('skeleton_warrior'); d.owner = p; d.team = p.team; d.sourceSkillId = '__proc:decay-save'; d.undyingTime = 2;
  d.life = 1; d.decay = { t: 0, dps0: 1000, growth: 1 }; w.flashes = []; w.update(.02);
  check('undying intercepts decay without a false death collapse', !d.dead && d.undyingSpent && !w.flashes.some(f => f.combatCue?.style === 'companion_unravel'));
}
{
  const { w, p } = rig();
  const skill = makeSkillInstance({ ...SKILLS.summon_stone_golem, requirements: undefined, useTime: 0 }); p.skills = [skill];
  w.executeSkill(p, skill, p.pos); const golem = w.actors.find(a => a.owner === p && a.defId === 'stone_golem')!;
  check('persistent fixture has a real contracted body', !!golem);
  w.kill(golem); for (const r of w.pendingRespawns) r.timer = .01;
  w['updatePendingRespawns'](.02);
  const replacement = w.actors.find(a => a.owner === p && a.defId === 'stone_golem' && !a.dead)!;
  check('respawn motion belongs to the actual replacement only', !!replacement && replacement !== golem && w.emergences.some(e => e.actorId === replacement.id && !e.held));
}
{
  const { w, p, beast } = rig(), a = beast(), b = beast('plains_wolf', 880);
  a.addBuff({ type: 'buff', id: 'life_bond_probe', duration: 4, mods: [] }); p.bond = { targetId: a.id, buffId: 'life_bond_probe' };
  check('life-sharing tether follows its actual buff recipient', companionCueState(p, w).links.some(l => l.kind === 'mend' && l.to.id === a.id));
  a.removeBuff('life_bond_probe');
  check('expired life-sharing buff clears its line immediately', !companionCueState(p, w).links.length);
  b.owner = p; b.sourceSkillId = '__dominate:probe';
  check('dominated allegiance has chained ownership geometry', companionCueState(b, w).links[0].profile === 'thrall');
  const mark = makeSkillInstance(Object.values(SKILLS).find(s => s.delivery.type === 'mark')!); p.skills = [mark];
  check('Mark fixture exists', !!mark.def);
  w.executeSkill(p, mark, { x: 750, y: 700 });
  check('actual placed recall point is persistent', companionCueState(p, w).marks.length === 1);
  w.executeSkill(p, mark, p.pos);
  check('recall consumes its marker without leaving an afterimage', !companionCueState(p, w).marks.length);
}
{
  const { w, p } = rig();
  const base = Object.values(SKILLS).find(s => s.tags.includes('curse') && s.delivery.type === 'nova') ?? SKILLS.expose_weakness;
  const inst = makeSkillInstance({ ...base, tags: ['spell', 'curse'], requirements: undefined, useTime: 0 });
  inst.sockets = [{ def: SUPPORTS.miasma, level: 1 }]; p.skills = [inst];
  check('miasma creates its real reserved field', w.executeSkill(p, inst, p.pos) && w.zones.length === 1 && p.reservedMana > 0);
  const z = w.zones[0], form = w.flashes.find(f => f.combatCue?.style === 'field_form');
  check('field creation shows its resolved radius', !!form && near(form.radius, z.radius) && z.fieldCue !== undefined);
  w['expireZone'](z); w['expireZone'](z);
  check('field retirement collapses once and refunds the same reservation', w.flashes.filter(f => f.combatCue?.style === 'field_release').length === 1 && p.reservedMana === 0);
  inst.def = { ...inst.def, fieldCue: false }; w.zones = []; w.flashes = [];
  w.executeSkill(p, inst, p.pos);
  check('field opt-out keeps the functioning zone', w.zones.length === 1 && !w.flashes.some(f => f.combatCue?.style === 'field_form'));
}
{
  const { w, p } = rig();
  w.remnants = [{ pos: { ...p.pos }, element: 'fire', life: 10, bob: 0 }]; w['updateRemnants'](.01);
  check('elemental pickup stores a matching material bank', !w.remnants.length && procCueRows(p).some(r => r.id === 'remnant_fire' && r.profile === 'fire' && r.phase === 'stored'));
  w['consumeRemnants'](p, { ...SKILLS.claw, tags: ['attack', 'cold'] });
  check('wrong-school cast preserves the real elemental bank', p.buffs.has('remnant_fire'));
  w['consumeRemnants'](p, { ...SKILLS.claw, tags: ['attack', 'fire'] });
  check('matching cast consumes the bank with one release', !p.buffs.has('remnant_fire') && procCueRows(p).some(r => r.id === 'remnant:fire' && r.phase === 'release'));
  w.remnants = [{ pos: { ...p.pos }, kind: 'bulwark', life: 10, bob: 0 }]; w['updateRemnants'](.01);
  check('registry fragment banks its authored material', procCueRows(p).some(r => r.id === 'frag_bulwark' && r.profile === 'cold'));
  p.gainCharge('rage', 10, 10); p.procCuePulses = [];
  w.remnants = [{ pos: { ...p.pos }, kind: 'rage', life: 10, bob: 0 }]; w['updateRemnants'](.01);
  check('capped charge pickup creates no false gain pulse', !p.procCuePulses.length && !w.remnants.length);
  w.loadZone(w.zone.id);
  check('zone transit clears old outcome flashes', !w.flashes.length);
}
{
  let depth = 0, labels = 0, strokes = 0;
  const ctx = new Proxy({ globalAlpha: 1, save: () => { depth++; }, restore: () => { depth--; }, stroke: () => { strokes++; }, fillText: () => { labels++; } },
    { get: (o, k) => k in o ? o[k as keyof typeof o] : () => {} }) as unknown as CanvasRenderingContext2D;
  const { w, p, inst, beast } = rig(), a = beast(); w.tameCompanion(p, a, inst.def.id);
  for (const s of Object.keys(COMPANION_STANCES)) { w.setCompanionStance(w.localSeat, inst.def.id, s); drawCompanionCueBody(ctx, companionCueState(a, w), 16, 0); }
  drawCompanionCueLinks(ctx, { ...a.pos, radius: a.radius }, companionCueState(a, w).links[0], 1);
  const f = companionCueFlash(a, 'sever', p)!; drawCompanionCueFlash(ctx, f);
  check('relationship shapes draw without captions or leaked context', strokes > 5 && depth === 0 && labels === 0);
  check('new outcomes survive the existing flash wire', serializeSnapshot(w, 1).flashes.some(f => f.companionCue?.event === 'bind'));
}
{
  const { w, p, beast } = rig(), victim = beast(); victim.life = 1;
  const hit = makeSkillInstance(SKILLS.claw);
  hit.sockets = [{ def: { ...SUPPORTS.dominating_blow, dominate: { chance: 1, duration: 12, max: 3 } }, level: 1 }];
  w['resolveHit'](p, hit, victim, 100, 0, undefined, true);
  const thrall = w.actors.find(a => a.owner === p && a.sourceSkillId === '__dominate:claw');
  check('actual dominating kill gives its replacement a keeper and unheld arrival', victim.dead && !!thrall && companionCueState(thrall, w).links[0]?.profile === 'thrall'
    && w.emergences.some(e => e.actorId === thrall.id && !e.held));
}
{
  const { w, beast } = rig(), matron = beast('gnoll_matron', 800), ward = beast('gnoll_prowler', 850);
  w.update(.4); check('pack fixture really receives its ward', ward.bondHeld && ward.bondFrom === matron);
  ward.pos.x += 1500; w.flashes = []; w.update(.4);
  check('leaving the holder removes the actual ward and snaps its recorded endpoint', !ward.bondHeld && w.flashes.some(f => f.companionCue?.event === 'sever' && f.companionCue.from?.id === matron.id));
}
{
  const { w, p } = rig(), ally = w.addSeat('cue-ally', CLASSES.find(c => c.id === 'tamer')!, new NullInput(), { startingCompanions: false });
  ally.actor.pos = { x: p.pos.x + 40, y: p.pos.y }; w.kill(ally.actor);
  check('co-op lethal hit leaves a downed body and matching cue', ally.actor.downed && !ally.actor.dead && w.flashes.some(f => f.companionCue?.event === 'down'));
  w['reviveSeat'](ally);
  check('co-op recovery rises without adding a gameplay hold', !ally.actor.downed && !ally.actor.untargetable && w.emergences.some(e => e.actorId === ally.actor.id && e.spec.motion === 'stir' && !e.held));
}
const source = readFileSync(new URL('../src/engine/world.ts', import.meta.url), 'utf8');
check('retired companion and recovery captions stay absent', !["'resisted!'", 'TAMED:', 'returns to the wild', 'is DOWN`', "'Downed'", "'revived!'", "'undying!'", "'respawned'", 'THE AMALGAM RISES', "'unraveled'", "'BLOOM'", "'miasma rises'", "'bond broken!'", "'the bond answers'", 'remnant!'].some(t => source.includes(t)));
mkdirSync('balance/reports', { recursive: true });
writeFileSync('balance/reports/companion-catalog.json', JSON.stringify({ skills: ['tame_beast','summon_stone_golem','the_amalgam','expose_weakness'].map(id => SKILLS[id]), support: SUPPORTS.miasma, styles: Object.keys(COMPANION_STANCES), monster: MONSTERS.plains_wolf.id }));
console.log(`PASS ${checks} companion and recovery cue checks`);
