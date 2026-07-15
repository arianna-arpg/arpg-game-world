// ---------------------------------------------------------------------------
// ONE-OFF PROBE — the SYMPATHY FABRIC end to end on the real engine
// (docs/engine/sympathy.md): the tamed flask/orb bond, keeper-support
// potency (Alpha's Bond), the charge echo (Pack Instinct), the inverse lane
// (Reciprocal Bond), the depth discipline, the tag filter, claim grafts
// (companionCapOf + Beast Master), and the monster-side matron's draught
// with its radius clamp. Run: npx tsx balance/probe_sympathy.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { applyBuild } from '../src/sim/builds';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import type { BuildSpec } from '../src/sim/types';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
const world = makeSimWorld('tamer', 24601);
const spec: BuildSpec = {
  id: 'sympathy_probe', classId: 'tamer', level: 9,
  skills: [
    // The bond skill, deepened: Alpha's Bond (+0.5 potency to both bond
    // links) and Pack Instinct (charge echo) socketed into the tame.
    { id: 'tame_beast', level: 3, supports: [{ id: 'alphas_bond', level: 1 }, { id: 'pack_instinct', level: 1 }] },
    // The whistle carries the INVERSE lane (also 'companion'-tagged): when
    // the beast is mended, a share flows back to the keeper.
    { id: 'companion_whistle', level: 1, supports: [{ id: 'reciprocal_bond', level: 1 }] },
    { id: 'life_flask', level: 1 },
    { id: 'mend', level: 3 },
  ],
};
const warnings = applyBuild(world, spec, 7);
if (warnings.length) console.log('build warnings:', warnings.join(' | '));

const p = world.player;
const step = (s: number): void => {
  const dt = 1 / 60;
  for (let t = 0; t < s; t += dt) world.update(dt);
};

// --- 0) the bond: claim a wolf directly (the claim ROLL is tryTame's own
// probe surface; here the fabric under it is the subject) -------------------
const wolf = world.createMonster('plains_wolf', 5, 'enemy');
wolf.pos = { x: p.pos.x + 60, y: p.pos.y };
world.actors.push(wolf);
world.tameCompanion(p, wolf, 'tame_beast');
check('claim: wolf wears the bond', wolf.companion === true && wolf.owner === p);
check('claim: the kept mark stamped (collar tack)',
  (wolf.extraParts ?? []).some(ep => ep.kind === 'collar'));

// --- 1) bond_flask: the keeper drinks, the beast drinks ---------------------
p.life = p.maxLife() * 0.5;             // the thirst gate wants a missing pool
wolf.life = wolf.maxLife() * 0.5;
p.gainCharge('flask_life', 1, 3);       // fuel the drink
step(0.1);
const flask = p.skills.find(s => s?.def.id === 'life_flask');
check('build: life flask on the bar', !!flask);
world.useSkill(p, flask!, { x: p.pos.x, y: p.pos.y });
step(0.2);
const myStream = p.restoreStreams.find(st => st.resource === 'life');
const petStream = wolf.restoreStreams.find(st => st.resource === 'life');
check('drink: keeper pours a life stream', !!myStream);
check('bond_flask: the beast pours one too', !!petStream);
// Alpha's Bond: potency 1 (tame's own equipMods) + 0.5 (gem) = 1.5.
const ratio = petStream && myStream ? (petStream.remaining + 1e-6) / (myStream.remaining + 1e-6) : 0;
check('alphas_bond: the echo runs at 1.5× potency', Math.abs(ratio - 1.5) < 0.05,
  `pet/keeper = ${ratio.toFixed(3)}`);
check('bond_flask: the flask buff echoed (quaffing)', wolf.buffs.has('quaffing'));
step(3.5);
check('bond_flask: the beast actually mended', wolf.life > wolf.maxLife() * 0.5 + 1,
  `life ${Math.round(wolf.life)}/${Math.round(wolf.maxLife())}`);

// --- 2) the tag filter: a NON-flask buff stays private ----------------------
p.addBuff({ type: 'buff', id: '__probe_private', duration: 3, mods: [] });
step(0.15);
check('tag filter: a plain buff gain does NOT echo', !wolf.buffs.has('__probe_private'));

// --- 3) bond_orb: a scooped orb pours into the beast too --------------------
wolf.life = wolf.maxLife() * 0.4;
const petBefore = wolf.life;
world.shedOrb('life', { x: p.pos.x, y: p.pos.y });
step(0.6);
check('bond_orb: the scooped life orb healed the beast', wolf.life > petBefore + 1,
  `${Math.round(petBefore)} → ${Math.round(wolf.life)}`);

// --- 4) pack_charges: charges echo, verbatim, into the baseCap lane ---------
p.gainCharge('frenzy', 1, 3);
step(0.1);
check('pack_instinct: the beast banked the frenzy charge',
  (wolf.charges.get('frenzy') ?? 0) === 1, `pet bank=${wolf.charges.get('frenzy') ?? 0}`);

// --- 5) depth discipline: a chained gain does NOT echo ----------------------
const bankBefore = wolf.charges.get('frenzy') ?? 0;
p.gainCharge('frenzy', 1, 3, undefined, 1);   // depth 1 = one proc link deep
step(0.1);
check('depth lid: a depth-1 gain stays private',
  (wolf.charges.get('frenzy') ?? 0) === bankBefore);

// --- 6) reciprocal_bond (the INVERSE lane): mend the beast, mend the keeper -
p.life = p.maxLife() * 0.4;
wolf.life = wolf.maxLife() * 0.5;
const keeperBefore = p.life;
const mend = p.skills.find(s => s?.def.id === 'mend');
check('build: mend on the bar', !!mend);
world.useSkill(p, mend!, { x: wolf.pos.x, y: wolf.pos.y });
step(0.8);
check('reciprocal_bond: healing the beast flowed back to the keeper',
  p.life > keeperBefore + 1, `${Math.round(keeperBefore)} → ${Math.round(p.life)}`);

// --- 7) claim grafts: Beast Master grows the kennel --------------------------
// (Minted directly — the bar's tame is busy holding the live bond, and the
// cap read is pure: def slots + summed tameMod grafts.)
const bareTame = makeSkillInstance(SKILLS['tame_beast']!, 1);
const grownTame = makeSkillInstance(SKILLS['tame_beast']!, 1);
grownTame.sockets[0] = { def: SUPPORTS['beast_master']!, level: 1 };
check('beast_master: +1 bond slot through companionCapOf',
  world.companionCapOf(bareTame) === 1 && world.companionCapOf(grownTame) === 2,
  `bare=${world.companionCapOf(bareTame)} grown=${world.companionCapOf(grownTame)}`);

// --- 8) the matron's draught: monster-side sympathy, radius-clamped ---------
const matron = world.createMonster('den_matron', 6, 'enemy');
matron.pos = { x: p.pos.x + 900, y: p.pos.y + 900 };
world.actors.push(matron);
const whelp = world.createMonster('den_whelp', 6, 'enemy');
whelp.pos = { x: matron.pos.x + 80, y: matron.pos.y };
world.actors.push(whelp);
const swig = matron.skills.find(s => s?.def.id === 'swig');
check('matron: carries the pocket brew', !!swig);
matron.life = matron.maxLife() * 0.6;   // her own thirst gate (missing 20%)
world.useSkill(matron, swig!, { x: matron.pos.x, y: matron.pos.y });
step(0.2);
check('matrons_draught: the whelp drinks when she drinks',
  whelp.restoreStreams.length > 0);
// The radius clamp: a whelp beyond 300 is outside the draught.
const farWhelp = world.createMonster('den_whelp', 6, 'enemy');
farWhelp.pos = { x: matron.pos.x + 600, y: matron.pos.y };
world.actors.push(farWhelp);
matron.cooldowns.delete('swig');
matron.life = matron.maxLife() * 0.6;
world.useSkill(matron, swig!, { x: matron.pos.x, y: matron.pos.y });
step(0.2);
check('matrons_draught: the FAR whelp is beyond the draught (radius 300)',
  farWhelp.restoreStreams.length === 0);

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
