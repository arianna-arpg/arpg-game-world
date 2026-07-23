// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE FIELD DISCIPLINE end to end (engine/skills.ts
// SWAP_DISCIPLINE_CFG + World.swapRefusal + the unlearn/socket/unsocket
// gates). Pins:
//   - THE WORKSHOP LAW: sanctuary ground (zone objective 'safe' — Lastlight,
//     the sim arena) waives EVERYTHING: hot blood, foes at arm's length,
//     ticking cooldowns — swap on a whim at the rack.
//   - THE FIELD: a player-side blow inside calmSec refuses all three
//     surgeries ('the blood is still hot'); live non-passive hostiles in
//     foeRadius refuse them ('foes press too near' — a passive body like a
//     training dummy never counts, BY CONSTRUCTION not by name); refusals
//     leave state untouched (gem stays bagged, socket stays filled, the
//     book keeps the skill).
//   - THE QUIET-CLOCK CLAUSE (unlearn alone): a skill on cooldown refuses
//     ('its clock still turns'), the active cast refuses ('mid-cast');
//     socket surgery never reads these clocks.
//   - THE DIALS: sanctuaryWaives=false disciplines even the sanctuary;
//     foeRadius=0 disables the proximity clause — config, not literals.
//   - ONE LAW, ONE VOICE: the engine gates and the panels read the same
//     swapRefusal strings verbatim.
// Run: npx tsx balance/probe_fielddiscipline.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SWAP_DISCIPLINE_CFG } from '../src/engine/skills';
import { SUPPORTS } from '../src/data/supports';
import { START_ZONE } from '../src/data/zones';
import { vec } from '../src/core/math';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xd15c);

const cfg = SWAP_DISCIPLINE_CFG;
const w: World = makeSimWorld('warrior', 0xd15c);
const seat = w.localSeat;
const hero = seat.actor;
const bagMultistrike = (): number => {
  seat.meta.inventory.push({ def: SUPPORTS['multistrike'], level: 1 });
  return seat.meta.inventory.length - 1;
};
const spawnAt = (defId: string, dx: number): Actor => {
  w.devGrabSpawn(defId);
  const a = w.actors[w.actors.length - 1];
  a.pos = vec(hero.pos.x + dx, hero.pos.y);
  return a;
};
const sweepField = (): void => {
  for (const a of w.actors) if (a.team === 'enemy') a.dead = true;
};
const heat = (): void => { w.lastCombatAt = w.time; };
const calm = (): void => { w.lastCombatAt = -999; };

// -------------------------------------------- A. THE WORKSHOP LAW (arena)
check('A: the sim arena is sanctuary ground', w.zone.objective?.kind === 'safe');
heat();
const foeA = spawnAt('dire_wolf', 80);
check('A: sanctuary waives with blood hot AND a wolf at arm\'s length',
  w.swapRefusal(seat, 'socket') === null && w.swapRefusal(seat, 'unlearn', 'cleave') === null);
check('A: the real mutations run free at the rack',
  w.socketSupport(bagMultistrike(), 'cleave', seat)
  && w.unsocketSupport('cleave', seat.meta.knownSkills.get('cleave')!.sockets.findIndex(s => s?.def.id === 'multistrike'), seat));
hero.cooldowns.set('war_cry', 5);
check('A: even a ticking clock unlearns in sanctuary',
  w.unlearnSkill('war_cry', seat));
hero.cooldowns.delete('war_cry');
check('A: …and relearns', w.learnSkill(seat.meta.skillInv.findIndex(i => i.def.id === 'war_cry'), seat));
foeA.dead = true;
seat.meta.inventory.pop();

// ----------------------------------------------------- B. INTO THE FIELD
const field = Object.values(w.zoneMap).find(z =>
  z.id !== START_ZONE && !z.boundless && z.objective?.kind !== 'safe');
check('B: the chart offers unsafe ground', !!field, field?.id ?? 'none');
w.loadZone(field!.id);
sweepField();
calm();
check('B: calm, empty field — hands free',
  w.swapRefusal(seat, 'socket') === null
  && w.swapRefusal(seat, 'unsocket') === null
  && w.swapRefusal(seat, 'unlearn', 'cleave') === null);

// ------------------------------------------------------ C. HOT BLOOD
heat();
check('C: a fresh blow refuses all three surgeries, in its own words',
  w.swapRefusal(seat, 'socket') === 'the blood is still hot'
  && w.swapRefusal(seat, 'unsocket') === 'the blood is still hot'
  && w.swapRefusal(seat, 'unlearn', 'cleave') === 'the blood is still hot');
const bagIdx = bagMultistrike();
const bagBefore = seat.meta.inventory.length;
check('C: the refused socket leaves the gem bagged',
  w.socketSupport(bagIdx, 'cleave', seat) === false
  && seat.meta.inventory.length === bagBefore
  && !seat.meta.knownSkills.get('cleave')!.sockets.some(s => s?.def.id === 'multistrike'));
check('C: the refused unlearn keeps the book whole',
  w.unlearnSkill('cleave', seat) === false && seat.meta.knownSkills.has('cleave'));
w.time += cfg.calmSec + 0.5;
check('C: the calm window expiring re-opens the hands',
  w.swapRefusal(seat, 'socket') === null);

// ----------------------------------------------- D. FOES PRESS TOO NEAR
calm();
const wolf = spawnAt('dire_wolf', Math.max(40, cfg.foeRadius - 80));
check('D: a live hostile inside foeRadius refuses',
  w.swapRefusal(seat, 'socket') === 'foes press too near');
wolf.dead = true;
const dummy = spawnAt('target_dummy', 60);
check('D: a PASSIVE body (the rack\'s kin) never counts — structurally',
  dummy.passive === true && w.swapRefusal(seat, 'socket') === null);
dummy.dead = true;

// ------------------------------------------------ E. THE QUIET CLOCK
calm();
hero.cooldowns.set('war_cry', 4);
check('E: a ticking cooldown refuses the unlearn alone',
  w.swapRefusal(seat, 'unlearn', 'war_cry') === 'its clock still turns'
  && w.unlearnSkill('war_cry', seat) === false
  && w.swapRefusal(seat, 'socket') === null
  && w.swapRefusal(seat, 'unsocket') === null);
hero.cooldowns.delete('war_cry');
check('E: the clock running out frees it',
  w.swapRefusal(seat, 'unlearn', 'war_cry') === null);
const cleaveInst = seat.meta.knownSkills.get('cleave')!;
hero.casting = {
  inst: cleaveInst, mode: 'cast', aim: vec(hero.pos.x, hero.pos.y),
  elapsed: 0, total: 1, held: false, baseMult: 1,
};
check('E: the active cast refuses its own unlearn — and only its own',
  w.swapRefusal(seat, 'unlearn', 'cleave') === 'mid-cast'
  && w.swapRefusal(seat, 'unlearn', 'war_cry') === null);
hero.casting = null;

// ------------------------------------------------------- F. THE DIALS
heat();
const savedWaive = cfg.sanctuaryWaives;
w.loadZone(START_ZONE);
check('F: town is sanctuary — hot blood swaps freely at the rack',
  w.zone.objective?.kind === 'safe' && w.swapRefusal(seat, 'socket') === null);
(cfg as { sanctuaryWaives: boolean }).sanctuaryWaives = false;
heat();
check('F: sanctuaryWaives=false disciplines even the sanctuary (the dial is real)',
  w.swapRefusal(seat, 'socket') === 'the blood is still hot');
(cfg as { sanctuaryWaives: boolean }).sanctuaryWaives = savedWaive;
const savedRadius = cfg.foeRadius;
w.loadZone(field!.id);
sweepField();
calm();
const wolf2 = spawnAt('dire_wolf', 100);
(cfg as { foeRadius: number }).foeRadius = 0;
check('F: foeRadius=0 disables the proximity clause',
  w.swapRefusal(seat, 'socket') === null);
(cfg as { foeRadius: number }).foeRadius = savedRadius;
check('F: …and restored, it bites again',
  w.swapRefusal(seat, 'socket') === 'foes press too near');
wolf2.dead = true;

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
