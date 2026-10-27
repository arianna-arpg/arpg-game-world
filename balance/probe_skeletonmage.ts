import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { SKELETON_MAGE_SCHOOLS } from '../src/data/skeletonMageTree';
import { makeSkillInstance, instanceDelivery, supportFitsInstOrCrew, type SkillInstance } from '../src/engine/skills';
import { summonCapacity } from '../src/engine/summonContracts';
import { mod } from '../src/engine/stats';
import { updateAI } from '../src/engine/ai';
import { SIM_TAP } from '../src/engine/tap';
import { serializeSeatMeta, applySeatMeta, serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { rebuildSkill, serializeCharacter } from '../src/meta/character';
import type { World } from '../src/engine/world';

let checks = 0;
function check(label: string, ok: unknown) { assert.ok(ok, label); checks++; console.log('PASS ' + label); }
function step(w: World, seconds: number, minds = false) {
  for (let n = 0; n < Math.ceil(seconds * 60); n++) {
    if (minds) for (const a of [...w.actors]) updateAI(a, w, 1 / 60);
    w.update(1 / 60);
  }
}
function rig(nodes: string[]) {
  const w = makeSimWorld('necromancer', 8642), p = w.player;
  for (const k of ['intelligence', 'willpower', 'wisdom'] as const) w.meta.baseAttrs[k] = 100;
  w.recalcPlayer();
  const inst = makeSkillInstance(SKILLS.summon_skeleton_mage, 20, 4);
  w.meta.knownSkills.set(inst.def.id, inst); p.skills.fill(null); p.skills[0] = inst;
  for (const node of nodes) { w.pickTreeNode(inst.def.id, node); check('legal investment ' + node, inst.treeNodes?.includes(node)); }
  p.sheet.setSource('mage-rig', [mod('mana', 'flat', 100000), mod('critChance', 'override', 0)]);
  p.fillResources();
  const aim = { x: p.pos.x + 280, y: p.pos.y };
  const bodies = () => w.actors.filter(a => !a.dead && a.owner === p && a.summonInst === inst && !a.summonArtAnchor);
  const raise = () => { w.executeSkill(p, inst, aim); return bodies(); };
  return { w, p, inst, aim, bodies, raise };
}
function target(w: World, x: number, y: number) {
  const a = w.createMonster('zombie', 1, 'enemy');
  a.pos = { x, y }; a.skills = []; a.brain = undefined;
  a.sheet.setSource('mage-rig', [mod('life', 'flat', 1000000), mod('evasion', 'override', 0),
    mod('armor', 'override', 0), mod('blockChance', 'override', 0), mod('moveSpeed', 'override', 0), mod('lifeRegen', 'override', 0)]);
  a.fillResources(); w.actors.push(a); return a;
}
function exact(body: ReturnType<typeof target>) {
  body.sheet.setSource('exact', [mod('accuracy', 'flat', 100000), mod('critChance', 'override', 0)]);
}
const restore = seedGlobalRandom(8642);
try {
  {
    const { w, p, inst, aim, bodies } = rig(['lich_ascendant']);
    p.sheet.setSource('speed', [mod('castSpeed', 'override', 1), mod('minionMaxCount', 'flat', 20)]);
    const d = instanceDelivery(inst); assert.equal(d.type, 'summon'); if (d.type !== 'summon') throw Error();
    check('Lich capacity stays one despite summon-cap investment', summonCapacity(p, inst, d) === 1);
    check('Lich uses the longer initial summon cast', p.skillUseTime(inst) === 2.75 && w.useSkill(p, inst, aim));
    step(w, 2.6); check('Lich does not arrive before its long windup', bodies().length === 0);
    step(w, 0.2); check('long summon raises exactly one Lich', bodies().length === 1);
    const lich = bodies()[0];
    check('Lich has a native fireball and autonomous Grand Rite', lich.skills.some(s => s?.def.id === 'skeletal_lich_fireball') && lich.skills.some(s => s?.def.id === 'skeletal_grand_rite'));
    lich.sheet.setSource('no-regen', [mod('lifeRegen', 'override', 0)]);
    const id = lich.id; lich.life *= 0.5; const life = lich.life;
    check('living summon presents the command face', w.slotFaceOf(p, inst).id === 'skeletal_grand_command');
    step(w, 0.15); // complete the ordinary cast recovery before commanding
    check('recast accepts the command', w.useSkill(p, inst, aim));
    step(w, 1.2);
    check('command preserves Lich identity and does not heal it', bodies()[0]?.id === id && bodies()[0].life <= life + 0.01);
    check('command places Grand Rite at the aim', w.zones.some(z => z.caster === lich && z.inst.def.id === 'skeletal_grand_rite' && Math.abs(z.pos.x - aim.x) < 1));
    check('Grand Rite command cannot bypass recovery', !w.useSkill(p, inst, aim));
    const client = makeSimWorld('necromancer', 8644); applySeatMeta(client, client.localSeat, serializeSeatMeta(w.localSeat));
    applySnapshot(client, serializeSnapshot(w, 0));
    const clientSkill = client.meta.knownSkills.get(inst.def.id)!;
    check('co-op replica presents the living command and its recovery', client.slotFaceOf(client.player, clientSkill).id === 'skeletal_grand_command' && !client.pressUsable(client.player, clientSkill));
  }
  {
    const { w, p, inst, aim, raise } = rig(['lich_ascendant', 'fused_intellect', 'winter_crown', 'storm_crown']);
    inst.sockets[0] = { def: SUPPORTS.resonance, level: 1 };
    inst.sockets[1] = { def: SUPPORTS.widening, level: 1 };
    check('ritual component census admits area supports', supportFitsInstOrCrew(SUPPORTS.widening, inst, w.summonCrewSkills(inst)));
    const lich = raise()[0]; exact(lich);
    const rite = lich.skills.find(s => s?.def.id === 'skeletal_grand_rite')!;
    const foe = target(w, aim.x, aim.y);
    w.executeSkill(lich, rite, aim);
    const fields = w.zones.filter(z => z.inst.summonArtCast?.field === 'ritual');
    check('Winter Crown adds both boundary and interior blizzard', fields.some(z => z.inst.def.id === 'skeletal_rite_boundary') && fields.some(z => z.inst.def.id === 'skeletal_rite_blizzard'));
    check('each ritual field receives its own compatible support', fields.every(z => z.inst.sockets.some(s => s?.def.id === 'widening')) && fields.every(z => z.radius > 130));
    step(w, 1); const life = foe.life; step(w, 1);
    check('enemies remaining inside the rite keep taking blizzard damage', foe.life < life);
    const oldPos = { ...lich.summonArtState!.ritual!.pos };
    const next = { x: aim.x, y: aim.y + 240 };
    w.executeSkill(lich, rite, next);
    check('Storm Crown detonates the previous site', w.zones.some(z => z.inst.def.id === 'skeletal_rite_rupture' && z.pos.x === oldPos.x && z.pos.y === oldPos.y));
    check('Storm Crown consumes old lingering fields before relocating', w.zones.filter(z => z.inst.summonArtCast?.field === 'ritual').every(z => Math.abs(z.pos.y - next.y) < 1));
    check('Storm Crown gives Grand Rite its own cooldown recovery', Math.abs((lich.cooldownTotals.get(rite.def.id) ?? 0) - 8 / 1.5) < 0.01);
    const before = w.zones.filter(z => z.inst.def.id === 'skeletal_ritual_flare').length;
    const native = lich.skills[0]!;
    const shot: SkillInstance = { ...native, def: { ...native.def, delivery: { type: 'nova', radius: 900 } } };
    const inside = target(w, next.x, next.y); step(w, 0.7); w.executeSkill(lich, shot, inside.pos);
    check('primary hits in the ritual kindle a bounded flare', w.zones.filter(z => z.inst.def.id === 'skeletal_ritual_flare').length > before);
    w.pickTreeNode(inst.def.id, 'grave_studies');
    check('a fifth tree point is refused', inst.treeNodes?.length === 4 && !inst.treeNodes.includes('grave_studies'));
    check('cast does not remove the summoning skill', p.skills.includes(inst));
  }
  {
    const { w, p, inst, aim, bodies, raise } = rig(['lich_ascendant', 'deathless_regent', 'court_of_one']);
    const lich = raise()[0], maximum = lich.maxLife();
    const fodder = () => { const a = w.createMonster('zombie', 1, p.team, p); a.pos = { ...lich.pos }; w.actors.push(a); return a; };
    w.kill(fodder(), true);
    check('silent dismissal never supplies a tithe', p.summonArtContracts.get(inst)!.souls.length === 0);
    w.kill(fodder(), false); step(w, 1);
    w.kill(fodder(), false);
    const c = p.summonArtContracts.get(inst)!;
    check('each soul keeps its own unrefreshed duration', c.souls.length === 2 && c.souls[0] < c.souls[1] - 0.9);
    for (let i = 0; i < 12; i++) w.kill(fodder(), false);
    check('soul bank has a bounded maximum', c.souls.length === 8);
    w.kill(lich, false);
    const anchor = c.anchor!;
    check('combat death creates a vulnerable, owned phylactery', !!anchor && !anchor.dead && Math.abs(anchor.maxLife() - maximum * 0.35) < 0.01);
    check('phylactery retains Ossuary Court', anchor.activeAuras.has('ossuary_command'));
    check('unspent souls shorten reconstruction and are consumed', c.rebuilding === 4 && c.souls.length === 0);
    check('reserved phylactery slot refuses a replacement summon', !w.useSkill(p, inst, aim));
    step(w, 4.1);
    check('surviving phylactery rebuilds the Lich once', anchor.dead && bodies().length === 1 && bodies()[0].id !== lich.id);
    w.kill(bodies()[0], false);
    check('reconstruction rearm survives rebirth', !c.anchor && c.recovery > 20);
  }
  {
    const { w, p, inst, aim, bodies, raise } = rig(['lich_ascendant', 'deathless_regent']);
    const lich = raise()[0]; w.kill(lich, false);
    const c = p.summonArtContracts.get(inst)!; w.kill(c.anchor!, false); step(w, 9);
    check('destroying the phylactery prevents reconstruction', bodies().length === 0 && !c.anchor);
    p.cooldowns.clear(); check('a lost anchor permits the full initial summon again', w.useSkill(p, inst, aim));
    step(w, 3); check('Lich can be summoned after anchor destruction', bodies().length === 1);
  }
  {
    const { w, p, inst, aim, raise } = rig(['lich_ascendant', 'deathless_regent', 'plague_crown']);
    const lich = raise()[0], spell = makeSkillInstance(SKILLS.fireball, 20);
    p.skills[1] = spell;
    spell.sockets[0] = { def: SUPPORTS.widening, level: 1 };
    inst.sockets[0] = { def: SUPPORTS.resonance, level: 1 };
    inst.sockets[1] = { def: SUPPORTS.widening, level: 1 };
    const casts: SkillInstance[] = [];
    SIM_TAP.current = { onCast: (a, s) => { if (a === lich && s.summonArtCast?.role === 'echo') casts.push(s); } };
    w.executeSkill(p, spell, aim); w.executeSkill(p, spell, aim);
    check('Lich echoes the original owner’s offensive spell with a cooldown', casts.length === 1 && casts[0].def.id === spell.def.id);
    check('echo preserves compatible spell supports without duplicating forwarded gems', casts[0].sockets.filter(s => s?.def.id === 'widening').length === 1);
    check('echo damage multiplier belongs to the Lich instance', casts[0].def.innateMods?.some(m => m.stat === 'damage' && Math.abs(m.value + 0.35) < 0.001));
    w.executeSkill(lich, lich.skills[0]!, aim);
    check('minion spells cannot recursively echo', casts.length === 1);
    step(w, 1.6); w.executeSkill(p, spell, aim);
    check('echo cooldown recovers without another summon', casts.length === 2);
    step(w, 1.6);
    const targeted = makeSkillInstance(SKILLS.skeletal_ignite, 20); p.skills[1] = targeted;
    const foe = target(w, aim.x, aim.y); let echoHits = 0;
    SIM_TAP.current = { onHit: (a, victim, result, packet) => { if (a === lich && victim === foe && result.total > 0 && packet.sourceName === targeted.def.name) echoHits++; } };
    check('owner can cast a targeted spell', w.useSkill(p, targeted, foe.pos));
    check('targeted echoes resolve their target from the Lich', echoHits === 1);
    SIM_TAP.current = null;
  }
  {
    const { w, p, aim, raise } = rig(['lich_ascendant', 'deathless_regent', 'plague_crown']);
    const lich = raise()[0], spell = makeSkillInstance(SKILLS.firebolt, 20);
    spell.treeNodes = ['ember_satellites']; p.skills[1] = spell;
    lich.sheet.setSource('echo-cap', [mod('projectileCount', 'override', 100)]);
    w.executeSkill(p, spell, aim);
    const first = w.projectiles.filter(q => q.caster === lich && q.projectileOrbit), host = first[0]?.inst.projectileHost;
    check('echoed projectile mutators create their own live minion-owned satellites', first.length > 0 && !!host && host !== spell);
    lich.summonArtState!.echoReady = 0; w.executeSkill(p, spell, aim);
    const live = w.projectiles.filter(q => q.caster === lich && q.projectileOrbit && !q.dissolved);
    check('successive echoes share one independent ability identity and its configured summon cap', live.length === first.length && live.every(q => q.inst.projectileHost === host));
    (w as unknown as { clearTreeFields(owner: typeof p, skill: SkillInstance): void }).clearTreeFields(p, spell);
    check('retiring the owner spell also retires only its copied ability and captured projectiles', !lich.summonArtState!.echoes?.has(spell) && w.projectiles.every(q => q.caster !== lich));
  }
  {
    const { w, p, inst, aim, raise, bodies } = rig(['grave_academy', 'winter_curriculum', 'deep_winter', 'plague_curriculum']);
    w.setSummonSchools(inst.def.id, ['fire', 'cold']);
    raise(); raise();
    check('chosen school balance fills a mixed roster predictably', bodies().length === 4 && bodies().filter(m => m.defId === 'skeletal_pyromancer').length === 2 && bodies().filter(m => m.defId === 'skeletal_cryomancer').length === 2);
    const source = bodies().find(m => m.defId === 'skeletal_pyromancer')!;
    for (const m of bodies()) { m.pos = { x: p.pos.x + 25, y: p.pos.y }; exact(m); }
    const foe = target(w, aim.x, aim.y);
    let replies = 0; SIM_TAP.current = { onCast: (_a, s) => { if (s.summonArtCast?.role === 'relay' && s.def.id !== 'skeletal_discordant_burst') replies++; } };
    const shot = { ...source.skills[0]!, def: { ...source.skills[0]!.def, delivery: { type: 'nova' as const, radius: 500 } } };
    target(w, aim.x, aim.y + 40);
    w.executeSkill(source, shot, foe.pos);
    check('one multi-hit primary use invites only one reply', replies === 1);
    const burst = w.zones.find(z => z.inst.def.id === 'skeletal_discordant_burst');
    step(w, 1);
    check('reply projectiles cannot start another relay', replies === 1);
    check('different schools produce a mixed-element burst', !!burst?.inst.def.baseDamage?.fire && !!burst.inst.def.baseDamage.cold);
    SIM_TAP.current = null;
    w.setSummonSchools(inst.def.id, ['fire']);
    check('school changes silently retire the old roster', bodies().length === 0);
    raise();
    const [a, b] = bodies(); a.pos = { ...p.pos }; b.pos = { x: p.pos.x + 20, y: p.pos.y }; exact(a);
    w.executeSkill(a, { ...a.skills[0]!, def: { ...a.skills[0]!.def, delivery: { type: 'nova', radius: 500 } } }, foe.pos);
    check('same-school reply wards both participants', a.absorbLayers.has('summonArts:concordance') && b.absorbLayers.has('summonArts:concordance'));
    const rebuilt = rebuildSkill({ skillId: inst.def.id, level: 20, rarity: 'common', sockets: [], treeNodes: inst.treeNodes, summonSchools: ['fire', 'invalid'] });
    check('school selection survives save repair with invalid entries removed', rebuilt?.summonSchools?.join() === 'fire');
    const saved = serializeCharacter(w).knownSkills.find(s => s.skillId === inst.def.id);
    check('character serialization includes selected schools', saved?.summonSchools?.join() === 'fire');
    const wire = serializeSeatMeta(w.localSeat), client = makeSimWorld('necromancer', 8643);
    applySeatMeta(client, client.localSeat, JSON.parse(JSON.stringify(wire)));
    check('co-op build replication preserves selected schools', client.meta.knownSkills.get(inst.def.id)?.summonSchools?.join() === 'fire');
    delete wire.known[inst.def.id].schools; applySeatMeta(client, client.localSeat, wire);
    check('old-host metadata clears a stale school choice', !client.meta.knownSkills.get(inst.def.id)?.summonSchools);
    w.setSummonSchools(inst.def.id, []);
    check('the selector cannot leave an empty summoning pool', inst.summonSchools?.join() === 'fire');
  }
  for (const school of SKELETON_MAGE_SCHOOLS) {
    const { w, p, inst, aim, raise, bodies } = rig(['grave_academy', 'storm_curriculum', 'rolling_thunder', 'expanded_faculty']);
    w.setSummonSchools(inst.def.id, [school.id]);
    inst.sockets[0] = { def: SUPPORTS.resonance, level: 1 };
    inst.sockets[1] = { def: SUPPORTS.widening, level: 1 };
    inst.sockets[2] = { def: SUPPORTS.alacrity, level: 1 };
    const crew = w.summonCrewSkills(inst);
    check(school.name + ' census excludes unselected signatures', Array.isArray(crew) && SKELETON_MAGE_SCHOOLS.filter(s => s !== school).every(s => !crew.some(k => k.id === s.signature || k.id === s.trace)));
    check(school.name + ' fields appear in support census', Array.isArray(crew) && crew.some(s => s.id === school.trace));
    raise(); const [caster, ally] = bodies(); exact(caster);
    caster.pos = { ...p.pos }; ally.pos = { x: p.pos.x + 20, y: p.pos.y }; ally.life *= 0.2;
    caster.sheet.setSource('no-regen', [mod('lifeRegen', 'override', 0)]);
    ally.sheet.setSource('no-regen', [mod('lifeRegen', 'override', 0)]);
    const signature = caster.skills.find(s => s?.def.id === school.signature)!;
    check(school.name + ' learns only its own signature, on a cooldown', !!signature && signature.def.cooldown > 0 && !SKELETON_MAGE_SCHOOLS.filter(s => s !== school).some(s => caster.skills.some(k => k?.def.id === s.signature)));
    check(school.name + ' cooldown supports fit the signature but not its primary', signature.sockets.some(s => s?.def.id === 'alacrity') && !caster.skills[0]!.sockets.some(s => s?.def.id === 'alacrity'));
    const foe = target(w, aim.x, aim.y), before = ally.life;
    check(school.name + ' signature can be cast through targeting', w.useSkill(caster, signature, foe.pos)); step(w, 2.2);
    check(school.name + ' signature actually damages its target', foe.life < foe.maxLife());
    check(school.name + ' signature feeds communal recovery', ally.life > before);
    const fields = w.zones.filter(z => z.caster === caster && z.inst.def.id === school.trace);
    check(school.name + ' hit creates one supported elemental inscription', fields.length === 1 && fields[0].radius > 65);
    if (school.id === 'fire' || school.id === 'chaos') {
      check(school.name + ' ailment carries signature attribution', foe.statuses.some(s => s.skillId === school.signature && s.casterId === caster.id));
      w.zones = []; w.projectiles = []; const healed = ally.life; step(w, 0.5);
      check(school.name + ' actual ailment ticks continue healing', ally.life > healed);
    }
    check(school.name + ' recovery remains bounded by per-caster rate', ally.life - before <= caster.maxLife() * 0.08 * 3.8 + 0.01);
    let uses = 0; SIM_TAP.current = { onCast: (a, s) => { if (a === caster && s.def.id === school.signature) uses++; } };
    step(w, 9, true); SIM_TAP.current = null;
    check(school.name + ' AI uses its taught signature', uses > 0);
  }
  {
    const { w, p, inst, aim, raise } = rig(['lich_ascendant', 'deathless_regent']);
    const lich = raise()[0]; exact(lich);
    const fodder = () => { const a = w.createMonster('zombie', 1, p.team, p); a.pos = { ...lich.pos }; w.actors.push(a); return a; };
    w.kill(fodder(), true, p, 'sacrifice'); w.kill(fodder(), false);
    const contract = p.summonArtContracts.get(inst)!;
    check('intentional sacrifice supplies a soul alongside combat deaths', contract.souls.length === 2);
    w.kill(fodder(), false, undefined, 'expire');
    check('expiry remains excluded even when other death effects are allowed', contract.souls.length === 2);
    const rite = lich.skills.find(s => s?.def.id === 'skeletal_grand_rite')!;
    rite.def = { ...rite.def, baseDamage: { fire: [20, 20] } };
    const foe = target(w, aim.x, aim.y), initial = foe.life;
    w.executeSkill(lich, rite, foe.pos); step(w, 0.8);
    const baseline = initial - foe.life;
    check('autonomous rites leave banked souls available', contract.souls.length === 2 && baseline > 0);
    lich.cooldowns.clear(); p.cooldowns.clear(); p.useLock = 0;
    check('a commanded rite begins its own preparation', w.useSkill(p, inst, foe.pos)); step(w, 0.35);
    check('souls remain banked during the rite preparation', !!lich.casting && contract.souls.length === 2);
    lich.casting = null; lich.useLock = 0;
    w.executeSkill(lich, rite, foe.pos); step(w, 0.8);
    check('interruption does not transfer soul spending to an autonomous rite', contract.souls.length === 2);
    lich.cooldowns.clear(); p.cooldowns.clear(); p.useLock = 0;
    const before = foe.life;
    check('soul-funded command is accepted', w.useSkill(p, inst, foe.pos)); step(w, 1.8);
    check('commanded rite spends souls for actual extra damage', contract.souls.length === 0 && foe.life < before - baseline * 1.1);
  }
  {
    const { w, p, inst, aim, raise, bodies } = rig(['lich_ascendant', 'fused_intellect', 'winter_crown']);
    const lich = raise()[0]; w.executeSkill(lich, lich.skills.find(s => s?.def.id === 'skeletal_grand_rite')!, aim);
    check('ritual is present before tree retirement', w.zones.length > 0);
    w.pickTreeNode(inst.def.id, 'grave_studies');
    check('tree retirement clears bodies, captured ritual fields and contracts', bodies().length === 0 && w.zones.every(z => z.caster !== lich) && !p.summonArtContracts.has(inst));
  }
  {
    const { w, p, inst, aim, raise } = rig(['lich_ascendant', 'fused_intellect', 'deathless_regent']);
    const lich = raise()[0], contract = p.summonArtContracts.get(inst)!;
    w.executeSkill(lich, lich.skills.find(s => s?.def.id === 'skeletal_grand_rite')!, aim);
    contract.recovery = 12; contract.souls = [4];
    w.loadZone(w.zone.id);
    check('mobile Lich identity survives a real zone crossing', w.actors.includes(lich) && !lich.dead && lich.summonInst === inst);
    check('zone crossing preserves soul and rearm clocks but retires the old ritual site', contract.recovery === 12 && contract.souls[0] === 4 && !lich.summonArtState?.ritual);
    contract.recovery = 0; w.kill(lich, false); const anchor = contract.anchor!;
    w.loadZone(w.zone.id);
    check('a stationary phylactery stays behind without resetting its rearm', anchor.dead && !contract.anchor && !contract.rebuilding && contract.recovery > 0);
  }
  console.log('PASS Skeleton Mage: ' + checks + ' checks');
} finally { SIM_TAP.current = null; restore(); }
