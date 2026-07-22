// ONE-OFF PROBE — THE LITURGY: the Cathedral's own art. The call/response
// pair (song tags, the family's self-teaching grant), the Responsory
// grammar (vary-by-skill over the song gate, the delayedBurst harm+mend
// payoff), the CONSECRATED central status (+ its auto-minted stat lanes),
// the second player-allied angel, and the See-taught pool row.
// Run: npx tsx balance/probe_liturgy.ts
import { bootSimEngine } from '../src/sim/arena';
import { SKILLS } from '../src/data/skills';
import { COMBO_RULES } from '../src/data/combos';
import { STATUS_DEFS } from '../src/engine/status';
import { STAT_DEFS } from '../src/engine/stats';
import { MONSTERS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { UNLOCK_CATALOG } from '../src/meta/unlocks';
import { GLYPH_PARTS } from '../src/data/glyphParts';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

// --- §1 THE FAMILY -----------------------------------------------------------
const call = SKILLS.versicle, resp = SKILLS.antiphon, invoke = SKILLS.invoke_lampad;
check('family: versicle + antiphon + invoke_lampad exist', !!call && !!resp && !!invoke);
check('family: the pair sing (song-tagged)',
  !!call?.tags.includes('song') && !!resp?.tags.includes('song'));
check('family: the response TEACHES the measure (equipMods grant combo_liturgy)',
  (resp?.equipMods ?? []).some(m => m.stat === 'combo_liturgy' && m.value === 1));
check('family: See-bracketed drops (minDropLevel 11-12)',
  (call?.minDropLevel ?? 0) >= 11 && (resp?.minDropLevel ?? 0) >= 11 && (invoke?.minDropLevel ?? 0) >= 11);
check('family: every liturgy skill carries an AI hint (kin-reuse ready)',
  !!call?.ai && !!resp?.ai && !!invoke?.ai);

// --- §2 THE RESPONSORY GRAMMAR ----------------------------------------------
const rule = COMBO_RULES.liturgy;
check('grammar: the Responsory is registered', !!rule);
check('grammar: two DIFFERENT songs close the measure (vary 2 by skill over the song gate)',
  rule?.vary?.n === 2 && rule?.vary?.by === 'skill' && (rule?.gate?.anyTags ?? []).includes('song'));
check('grammar: the payoff harms the court AND mends the congregation',
  rule?.effect.type === 'delayedBurst' && !!rule?.effect.damage && !!rule?.effect.healAllies
  && rule?.effect.at === 'self');

// --- §3 THE CONSECRATED STATUS ----------------------------------------------
const cons = STATUS_DEFS.consecrated;
check('status: consecrated registered, beneficial, mending', !!cons?.beneficial
  && (cons?.mods ?? []).some(m => m.stat === 'lifeRegen'));
check('status: the auto-minted lanes opened (apply_/damageVs_/minionApply_)',
  !!STAT_DEFS.apply_consecrated && !!STAT_DEFS.damageVs_consecrated && !!STAT_DEFS.minionApply_consecrated,
  ['apply_consecrated', 'damageVs_consecrated', 'minionApply_consecrated'].filter(s => !STAT_DEFS[s]).join(',') || 'all 3');

// --- §4 THE SECOND ANGEL -----------------------------------------------------
const lam = MONSTERS.lampad_chorister;
check('angel: the chorister exists (xp 0, deep mana — the minion shape)', !!lam && lam.xp === 0 && (lam.base.mana ?? 0) >= 900);
check('angel: wears the lampad\'s own look (reuse before mint)', lam?.look === 'lampad_vigil' && !!LOOKS.lampad_vigil);
check('angel: sings her office (votive_ward in the kit)', (lam?.skills ?? []).includes('votive_ward'));
check('angel: the summon calls HER', SKILLS.invoke_lampad?.delivery.type === 'summon'
  && (SKILLS.invoke_lampad?.delivery as { monsterId?: string }).monsterId === 'lampad_chorister');

// --- §5 THE SEE TEACHES ------------------------------------------------------
const row = UNLOCK_CATALOG.find(u => u.id === 'gem_skills_liturgy') as
  { reqLedger?: string; payload?: { skillIds?: string[] } } | undefined;
check('vault: the liturgy pool row reads the cathedral doors',
  row?.reqLedger === 'cathedral_door_opened');
check('vault: every pooled id resolves', (row?.payload?.skillIds ?? []).every(id => !!SKILLS[id]),
  (row?.payload?.skillIds ?? []).filter(id => !SKILLS[id]).join(',') || 'all 3');

// --- §6 THE EMBLEM -----------------------------------------------------------
check('glyph: crossedKeys shipped (the warden\'s office at the belt)',
  !!GLYPH_PARTS.crossedKeys && (LOOKS.censer_warden?.parts ?? []).some(p => p.kind === 'crossedKeys'));

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
