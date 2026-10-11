// ---------------------------------------------------------------------------
// THE TARGET STRIKE — a 'target' delivery lands only on what the press
// RESOLVED, and World.useSkill resolves a victim only through a targeting
// spec. Solar Brand shipped without one: every press paid its mana and
// cooldown and struck nothing, for the hero and for every monster kit that
// carries it. This rig pins the repaired brand end to end, plus the boot
// census in data/validate.ts that keeps a spec-less target delivery from
// shipping again.
//   A  a bare field refuses the press BEFORE any cost (no target, no cost)
//   B  the hero's brand damages its mark and lays the two certain stacks
//   C  the monster lane: a cinder chorister's brand lands on the hero
//   D  the census: silent at HEAD, names a stripped spec, passes a payload
//      the engine hands its victim, and names that payload once a kit holds it
// validateContent draws from the seeded global stream, so D stays LAST.
// ---------------------------------------------------------------------------
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { setSimTap } from '../src/engine/tap';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { validateContent } from '../src/data/validate';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';

let failed = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok && detail ? ` (${detail})` : ''}`);
  if (!ok) failed++;
}
const step = (w: World, seconds: number): void => { for (let t = 0; t < seconds; t += 1 / 60) w.update(1 / 60); };
const scorch = (a: Actor): number => a.statuses.filter(s => s.id === 'sunscorched').reduce((n, s) => n + s.stacks, 0);
// A body that neither evades nor blocks, so a resolved brand always lands.
const open = (a: Actor): void => a.sheet.setSource('targetstrike-probe', [mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]);

seedGlobalRandom(0x5b);

// A: no target, no cost.
{
  const w = makeSimWorld('pyromancer', 0x5b), p = w.player;
  const brand = makeSkillInstance(SKILLS.solar_brand, 1);
  const mana = p.mana;
  check('A: a bare field refuses the brand', !w.useSkill(p, brand, { x: p.pos.x + 200, y: p.pos.y }));
  check('A: the refusal spends no mana', p.mana === mana, `${mana} -> ${p.mana}`);
  step(w, 1);
  check('A: the refusal starts no cooldown', !p.cooldowns.has('solar_brand'));
}

// B: the hero's brand lands on its mark.
{
  const w = makeSimWorld('pyromancer', 0x5b), p = w.player;
  const mark = w.createMonster('plains_wolf', 1, 'enemy');
  mark.aiCooldown = 9999; open(mark);
  mark.pos = { x: p.pos.x + 220, y: p.pos.y }; w.actors.push(mark);
  const landed: number[] = [];
  setSimTap({ onHit: (from, to, r) => { if (from === p && to === mark && !r.evaded && !r.immune) landed.push(r.total); } });
  const brand = makeSkillInstance(SKILLS.solar_brand, 1);
  const life = mark.life;
  check('B: the brand accepts a press on a mark in reach', w.useSkill(p, brand, mark.pos));
  step(w, 1.2);
  setSimTap(null);
  check('B: the brand strikes its mark', landed.some(n => n > 0), `landed=[${landed.map(n => n.toFixed(1)).join(', ')}]`);
  check('B: the mark loses life', mark.life < life, `${life.toFixed(1)} -> ${mark.life.toFixed(1)}`);
  check('B: the two certain applications lay at least two sunscorched stacks', scorch(mark) >= 2, `stacks=${scorch(mark)}`);
  check('B: the cast starts its cooldown', p.cooldowns.has('solar_brand'));
}

// C: the monster lane. The AI presses kit skills through the same door, so
// the four kits carrying the brand were striking nothing too.
{
  const w = makeSimWorld('pyromancer', 0x5b), p = w.player;
  open(p);
  const chorister = w.createMonster('cinder_chorister', 1, 'enemy');
  chorister.aiCooldown = 9999;
  chorister.pos = { x: p.pos.x + 220, y: p.pos.y }; w.actors.push(chorister);
  const brand = chorister.skills.find(s => s?.def.id === 'solar_brand');
  const fire: number[] = [];
  setSimTap({ onHit: (from, to, r) => { if (from === chorister && to === p && !r.evaded && !r.immune) fire.push(r.receivedAmounts?.fire ?? 0); } });
  check('C: the chorister carries the brand in its kit', !!brand);
  check('C: the chorister\'s brand accepts a press on the hero', !!brand && w.useSkill(chorister, brand, p.pos));
  step(w, 1.2);
  setSimTap(null);
  check('C: the brand delivers fire to the hero', fire.some(n => n > 0), `fire=[${fire.map(n => n.toFixed(1)).join(', ')}]`);
  check('C: the hero wears at least two sunscorched stacks', scorch(p) >= 2, `stacks=${scorch(p)}`);
}

// D: the boot census (data/validate.ts), through the real sweep.
{
  const census = (): string[] => {
    const lines: string[] = [];
    const orig = console.warn;
    console.warn = (...a: unknown[]) => { lines.push(a.map(String).join(' ')); };
    try { validateContent(); } finally { console.warn = orig; }
    return lines.filter(l => l.includes('\'target\' delivery without a targeting spec'));
  };
  const clean = census();
  check('D: the census is silent: every pressable target delivery carries a spec', clean.length === 0, clean.join(' | '));

  // The drop lane: strip the brand's spec and the census names it, once.
  const spec = SKILLS.solar_brand.targeting;
  delete SKILLS.solar_brand.targeting;
  let stripped: string[] = [];
  try { stripped = census(); } finally { SKILLS.solar_brand.targeting = spec; }
  check('D: a droppable target skill without its spec is named once', stripped.length === 1 && stripped[0].includes('skill solar_brand:'), stripped.join(' | '));

  // The payload lane: a never-dropped target payload that the engine hands
  // its victim directly (Pack Dread's shape) is pressed by nobody, so it
  // passes. Seat it in a monster kit and the AI would press it: named.
  const id = 'probe_targetstrike_payload';
  SKILLS[id] = { ...SKILLS.solar_brand, id, noDrop: true, targeting: undefined };
  const kit = MONSTERS.cinder_chorister.skills;
  let loose: string[] = [], kitted: string[] = [];
  try {
    loose = census();
    kit.push(id);
    kitted = census();
  } finally {
    const at = kit.indexOf(id);
    if (at >= 0) kit.splice(at, 1);
    delete SKILLS[id];
  }
  check('D: a never-dropped payload outside every kit passes', !loose.some(l => l.includes(id)), loose.join(' | '));
  check('D: the same payload seated in a monster kit is named once', kitted.length === 1 && kitted[0].includes(`skill ${id}:`), kitted.join(' | '));
}

console.log(`\nTarget strike: ${failed ? `${failed} FAILED` : 'all passed'}`);
process.exitCode = failed ? 1 : 0;
