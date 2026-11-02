// ---------------------------------------------------------------------------
// THE THREAT DIALS PROBE (data/monsterDamage.ts; docs/design/npc-ai-direction.md,
// "The number pass").
//   A. Every tuned row names a real monster, and every dial is a sane multiplier.
//   B. An enemy mint of a dialed body wears its dial, and the dial reaches its blows by
//      tag: an imp's melee lands at its dial, its spells untouched.
//   C. An undialed body wears no dial source at all, so it is byte-identical to before.
//   D. The same def minted on the player's side wears none: a summon, an ultimate's form.
//   E. A claimed beast drops its dial.
//   F. The farm's threat rule reaches a body's dial, and a knob on it moves the next spawn.
// Run: npx tsx balance/probe_threatdials.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MONSTERS } from '../src/data/monsters';
import { MONSTER_DAMAGE, MONSTER_DAMAGE_TUNED } from '../src/data/monsterDamage';
import type { SkillTag } from '../src/engine/stats';
import { applyKnobs, parseKnob } from '../src/sim/knobs';
import { tuningRuleFor } from '../src/sim/data/knobSets';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(1);
const w = makeSimWorld('warrior', 1);
const tags = (...t: SkillTag[]): ReadonlySet<SkillTag> => new Set(t);
const r3 = (x: number): number => Math.round(x * 1000) / 1000;

// --- A) The rows ------------------------------------------------------------------------
{
  const unknown = Object.keys(MONSTER_DAMAGE_TUNED).filter(id => !MONSTERS[id]);
  check('every tuned row names a real monster', !unknown.length, unknown.join(', '));
  const odd = Object.entries(MONSTER_DAMAGE_TUNED)
    .flatMap(([id, d]) => Object.entries(d).filter(([, v]) => !(typeof v === 'number' && v > 0 && v <= 2)).map(([k, v]) => `${id}.${k}=${v}`));
  check('every dial is a multiplier above 0 and at most 2', !odd.length, odd.join(', '));
  // The sim's sparring dummy registers after the table is built; it is not a game body.
  const rowless = Object.keys(MONSTERS).filter(id => !MONSTER_DAMAGE[id] && !id.startsWith('target_dummy'));
  check('every monster has a row', !rowless.length, rowless.join(', '));
}

// --- B) An enemy wears its dial ---------------------------------------------------------
const imp = w.createMonster('imp', 12, 'enemy');
const ownImp = w.createMonster('imp', 12, 'player', w.player);
{
  const dial = MONSTER_DAMAGE_TUNED.imp?.melee ?? 1;
  check('the imp has a melee dial to test', dial < 1, String(dial));
  check('an enemy imp wears its dial', imp.sheet.hasSource('threat'));
  const melee = imp.sheet.get('damage', tags('melee')) / ownImp.sheet.get('damage', tags('melee'));
  const spell = imp.sheet.get('damage', tags('spell')) / ownImp.sheet.get('damage', tags('spell'));
  check('its melee lands at the dial', r3(melee) === r3(dial), `${r3(melee)} against ${dial}`);
  check('its spells are untouched', r3(spell) === 1, String(r3(spell)));
}

// --- C) An undialed body ----------------------------------------------------------------
{
  const plain = Object.keys(MONSTERS).find(id => !(id in MONSTER_DAMAGE_TUNED) && !MONSTERS[id].parts)!;
  const body = w.createMonster(plain, 12, 'enemy');
  check('an undialed body wears no dial source', !body.sheet.hasSource('threat'), plain);
}

// --- D) The player's side ---------------------------------------------------------------
{
  check('a dialed def summoned for the player wears no dial', !ownImp.sheet.hasSource('threat'));
  for (const id of ['blade_wraith', 'lesser_reaper', 'ult_woken_hollow']) {
    if (!(id in MONSTER_DAMAGE_TUNED)) continue;
    const body = w.createMonster(id, 12, 'player', w.player);
    check(`${id} on the player's side fights at its full numbers`, !body.sheet.hasSource('threat'));
  }
}

// --- E) A claimed beast -------------------------------------------------------------------
{
  const beast = w.createMonster('hellhound', 12, 'enemy');
  const wore = beast.sheet.hasSource('threat');
  w.tameCompanion(w.player, beast, 'tame_beast');
  check('a claimed beast drops its dial', wore && !beast.sheet.hasSource('threat'));
}

// --- F) The farm reaches it ---------------------------------------------------------------
{
  const rule = tuningRuleFor('monster_threat');
  const knobs = rule?.knobs('imp') ?? [];
  check('the threat rule offers the body\'s dial', knobs.includes('monsterDamage.imp.all'), knobs.join(' & '));
  const applied = applyKnobs([parseKnob('monsterDamage.imp.all*0.5')]);
  try {
    check('a knob on the dial applies cleanly', !applied.errors.length, applied.errors.join('; '));
    const halved = w.createMonster('imp', 12, 'enemy');
    const ratio = halved.sheet.get('damage', tags('spell')) / imp.sheet.get('damage', tags('spell'));
    check('and moves the next spawn', r3(ratio) === 0.5, String(r3(ratio)));
  } finally { applied.restore(); }
  check('restoring the knob restores the row', MONSTER_DAMAGE.imp.all === 1);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
