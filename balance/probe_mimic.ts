// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE MIMICRY FABRIC on the real engine (engine/mimic.ts):
// policy (tag/delivery/effect defaults, the explicit allow/deny lane, and
// structural refusals that beat an explicit allow), the CAPTURE path through
// a REAL executeSkill blow (the bestiary arts gate at its exact count
// boundary, dedupe-refresh, cap eviction that spares the held selection, the
// unslotted release), the WITNESS lane (in reach + out of reach through the
// real completed-cast hook), THE SLOT REDIRECT (mint at host level, shared
// socket array, power-factor extraMods, slotFaceOf/pressUsable faces, the
// captured art's own cooldown), selection cycling via the mimicSelect
// effect, COMBO KINSHIP (the cast ring records the STOLEN art's real id),
// and null-cost hygiene (no slot on the bar = no bank, ever).
// Run: npx tsx balance/probe_mimic.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { BESTIARY_CFG, bestiaryKey, bestiaryThreshold } from '../src/data/bestiary';
import { MONSTERS } from '../src/data/monsters';
import { MIMIC_CFG, mimicEntries, mimicRefreshWatch, mimicSelected, skillMimicable } from '../src/engine/mimic';
import { makeSkillInstance, type SkillDef } from '../src/engine/skills';
import { comboStat } from '../src/engine/sequence';
import { mod } from '../src/engine/stats';
import { vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x31c0a);

// The capture gate's exact count boundary, derived from the LIVE config so
// retunes retune the probe: smallest kill count whose fraction reaches the
// study group's reveal tier.
const artsAt = BESTIARY_CFG.revealTiers.find(t => t.group === MIMIC_CFG.studyGroup)?.at ?? 0.35;
const artsKills = (defId: string): number =>
  Math.max(1, Math.ceil(bestiaryThreshold(MONSTERS[defId]) * artsAt));

// A monster stands beside the hero and completes a REAL cast at it. The
// student is healed before every lesson — a dead seat learns nothing (and
// with the evade die overridden off, the whole curriculum lands).
const blowFrom = (w: ReturnType<typeof makeSimWorld>, m: import('../src/engine/actor').Actor,
  def: SkillDef, times = 4): void => {
  for (let i = 0; i < times; i++) {
    w.player.life = w.player.maxLife();
    m.useLock = 0; m.mana = m.maxMana();
    w.executeSkill(m, makeSkillInstance(def, 1), vec(w.player.pos.x, w.player.pos.y));
  }
};

// --- 1) POLICY -------------------------------------------------------------
{
  check('policy: a teaching art is capturable by tag default',
    skillMimicable(SKILLS.mocking_refrain) && skillMimicable(SKILLS.shard_waltz));
  check('policy: the mimic slot itself is structurally refused',
    !skillMimicable(SKILLS.mimicry));
  check('policy: summons refused by the tag default',
    !skillMimicable(SKILLS.summon_skeleton));
  const base: SkillDef = {
    id: 'probe_art', name: 'Probe Art', description: '', tags: ['spell'], color: '#fff',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'nova', radius: 40 }, effects: [{ type: 'damage' }],
  };
  check('policy: explicit deny seals a default-admitted art',
    !skillMimicable({ ...base, id: 'probe_deny', mimicable: false }));
  check('policy: explicit allow opens a tag-denied art',
    skillMimicable({ ...base, id: 'probe_allow', tags: ['summon'], mimicable: true }));
  check('policy: structural refusal beats an explicit allow',
    !skillMimicable({ ...base, id: 'probe_struct', mimicable: true, mimic: {} }));
  check('policy: command-shaped effects refused by default',
    !skillMimicable({ ...base, id: 'probe_cmd', effects: [{ type: 'commandMinions', order: 'attack' } as never] }));
}

// --- 2) CAPTURE through the real blow --------------------------------------
{
  const w = makeSimWorld('warrior', 0x31c1);
  const p = w.player;
  p.skills[0] = makeSkillInstance(SKILLS.mimicry, 1);
  // Determinism: the capture gate reads LANDED hits — take the evade die
  // off the table so every teaching blow actually lands.
  p.sheet.setSource('probe_noevade', [mod('evasion', 'override', 0)]);

  check('setup: the troupe is real', !!MONSTERS.mockthrush && !!MONSTERS.the_understudy);
  check('spawn: a mockthrush seats beside the hero', w.devGrabSpawn('mockthrush'));
  const t = w.actors[w.actors.length - 1];
  t.pos = vec(p.pos.x + 40, p.pos.y); // inside the refrain's nova

  // UNSTUDIED: the blow lands, nothing is learned.
  blowFrom(w, t, SKILLS.mocking_refrain);
  check('gate: an unstudied kind teaches nothing', !p.mimicBank);

  // ONE BELOW the arts boundary: still nothing.
  const key = bestiaryKey('mockthrush');
  const need = artsKills('mockthrush');
  w.account.ledger[key] = need - 1;
  blowFrom(w, t, SKILLS.mocking_refrain);
  check(`gate: ${need - 1} kills (one under arts) still teaches nothing`, !p.mimicBank?.length);

  // AT the boundary: captured, wearing the source kind's face.
  w.account.ledger[key] = need;
  blowFrom(w, t, SKILLS.mocking_refrain);
  const bank = () => mimicEntries(p, w.time);
  check(`gate: ${need} kills (arts reached) captures the art`,
    bank().length === 1 && bank()[0].sid === 'mocking_refrain' && bank()[0].src === 'mockthrush');
  check('select: the first capture self-selects',
    mimicSelected(p, w.time)?.sid === 'mocking_refrain');

  // DEDUPE: a re-hit refreshes, never duplicates.
  const at0 = bank()[0].at;
  blowFrom(w, t, SKILLS.mocking_refrain);
  check('dedupe: a re-hit refreshes the one entry',
    bank().length === 1 && bank()[0].at >= at0);

  // CAP EVICTION: oldest-out, but never the held selection. (Instant
  // deliveries only — a projectile art would need flight ticks to land —
  // and TOUCH range, so the claw's short arm reaches too.)
  t.pos = vec(p.pos.x + 22, p.pos.y);
  blowFrom(w, t, SKILLS.shard_waltz);
  blowFrom(w, t, SKILLS.heavy_strike);
  blowFrom(w, t, SKILLS.showstopper);
  t.pos = vec(p.pos.x + 22, p.pos.y); // the Showstopper SHOVES — re-close for the claw
  blowFrom(w, t, SKILLS.claw);
  const ids = bank().map(e => e.sid);
  check('cap: bank holds exactly the configured size',
    bank().length === Math.max(1, Math.round(MIMIC_CFG.bankSize)), ids.join(','));
  check('cap: the held selection survives eviction; the oldest unselected goes',
    ids.includes('mocking_refrain') && !ids.includes('shard_waltz'));

  // UNSLOT: the bank is ramp state and releases with the slot.
  p.skills[0] = null;
  p.mimicWatchAt = 0; // force the throttled cache to re-evaluate now
  mimicRefreshWatch(p, w.time);
  check('release: unslotting the mimic frees the bank', !p.mimicBank && !p.mimicSel);
}

// --- 3) THE WITNESS LANE ---------------------------------------------------
{
  const w = makeSimWorld('warrior', 0x31c2);
  const p = w.player;
  p.skills[0] = makeSkillInstance(SKILLS.mimicry, 1);
  // The lever as a plain stat (a passive would grant it the same way);
  // Keen Study grants it through the slot's own socket mods instead.
  p.sheet.setSource('probe_witness', [mod('mimicWitness', 'flat', 1)]);
  w.account.ledger[bestiaryKey('mockthrush')] = artsKills('mockthrush');
  check('spawn: witness thrush', w.devGrabSpawn('mockthrush'));
  const t = w.actors[w.actors.length - 1];

  // IN REACH but outside the nova: no blow lands — the eye alone learns.
  t.pos = vec(p.pos.x + 250, p.pos.y);
  p.mimicWatchAt = 0;
  blowFrom(w, t, SKILLS.mocking_refrain, 1);
  check('witness: a studied art SEEN in reach is captured without the blow',
    mimicEntries(p, w.time).some(e => e.sid === 'mocking_refrain'));

  // OUT of reach: nothing new.
  t.pos = vec(p.pos.x + MIMIC_CFG.witnessRadius + 300, p.pos.y);
  blowFrom(w, t, SKILLS.shard_waltz, 1);
  check('witness: beyond the radius teaches nothing',
    !mimicEntries(p, w.time).some(e => e.sid === 'shard_waltz'));
}

// --- 4) THE SLOT REDIRECT --------------------------------------------------
{
  const w = makeSimWorld('warrior', 0x31c3);
  const p = w.player;
  const slot = makeSkillInstance(SKILLS.mimicry, 1);
  p.skills[0] = slot;
  p.sheet.setSource('probe_noevade', [mod('evasion', 'override', 0)]);
  w.account.ledger[bestiaryKey('mockthrush')] = artsKills('mockthrush');
  check('spawn: redirect thrush', w.devGrabSpawn('mockthrush'));
  const t = w.actors[w.actors.length - 1];
  t.pos = vec(p.pos.x + 40, p.pos.y);
  blowFrom(w, t, SKILLS.mocking_refrain);
  check('setup: the art is banked', mimicSelected(p, w.time)?.sid === 'mocking_refrain');

  check('face: slotFaceOf presents the captured art',
    w.slotFaceOf(p, slot).id === 'mocking_refrain');
  check('face: pressUsable judges the captured face', w.pressUsable(p, slot));

  // SELECTION CYCLE via the meta payload's effect (no world ticks run here,
  // so the nearby teacher cannot act between these synchronous casts).
  blowFrom(w, t, SKILLS.shard_waltz);
  const before = mimicSelected(p, w.time)?.sid;
  p.useLock = 0; p.mana = p.maxMana();
  w.executeSkill(p, makeSkillInstance(SKILLS.mimic_attune, 1), vec(p.pos.x, p.pos.y));
  const selSid = mimicSelected(p, w.time)?.sid;
  check('cycle: the meta press turns the repertoire', !!selSid && selSid !== before);

  // Park the teacher FAR out of reach: the redirect's cast bar must ride
  // out undisturbed (a live thrush shrieking at the caster interrupts) —
  // and CLEANSE the lessons' own confusion first: a befuddled hand may
  // scramble the very press under test (the addled-hand fabric working).
  t.pos = vec(p.pos.x + 2600, p.pos.y);
  p.statuses = [];

  // COMBO KINSHIP: equip a REAL grammar (the combo_<id> stat family — the
  // same lane a passive or the Spellblade vocation grants), so recordCast's
  // own watch re-evaluation keeps the ring live: the recorded cast must be
  // the STOLEN art under its own id, never the slot's.
  p.sheet.setSource('probe_grammar', [mod(comboStat('spellblade_weave'), 'flat', 1)]);
  p.comboWatchAt = 0; // let the record site recompute watch from the grammar
  p.useLock = 0; p.mana = p.maxMana();
  const manaBefore = p.mana;
  const castSid = selSid!;
  check('press: the redirect fires', w.useSkill(p, slot, vec(p.pos.x + 60, p.pos.y)));
  // Ride out the cast bar through the runner's own host frame
  // (applyInputs + update — the "same game headless" contract).
  for (let i = 0; i < 60; i++) { w.applyInputs(new Map(), 1 / 30); w.update(1 / 30); }
  const minted = p.metaInsts.get('mimicry:' + castSid);
  check('mint: the minted instance shares the slot socket array',
    !!minted && minted.sockets === slot.sockets);
  check('mint: the power factor rides as instance mods',
    minted?.extraMods?.some(md => md.stat === 'damage' && md.kind === 'more'
      && Math.abs(md.value - (MIMIC_CFG.powerFactor - 1)) < 1e-9) === true);
  check('pipeline: the captured art pays its own mana', p.mana < manaBefore || p.maxMana() === 0);
  check('pipeline: the captured art runs its own cooldown',
    (p.cooldowns.get(castSid) ?? 0) > 0);
  check('combo kinship: the ring recorded the STOLEN art, not the slot',
    p.castRing?.some(r => r.sid === castSid) === true
    && !p.castRing?.some(r => r.sid === 'mimicry'),
    `ring=${p.castRing?.map(r => r.sid).join(',') ?? 'null'}`);

  // EMPTY: the slot is a dead button with nothing captured.
  p.mimicBank = null; p.mimicSel = null;
  check('empty: pressUsable refuses a bare slot', !w.pressUsable(p, slot));
  check('empty: the press fails with nothing captured',
    !w.useSkill(p, slot, vec(t.pos.x, t.pos.y)));
}

// --- 5) NULL-COST HYGIENE --------------------------------------------------
{
  const w = makeSimWorld('warrior', 0x31c4);
  const p = w.player;
  p.sheet.setSource('probe_noevade', [mod('evasion', 'override', 0)]);
  w.account.ledger[bestiaryKey('mockthrush')] = artsKills('mockthrush');
  check('spawn: hygiene thrush', w.devGrabSpawn('mockthrush'));
  const t = w.actors[w.actors.length - 1];
  t.pos = vec(p.pos.x + 40, p.pos.y);
  blowFrom(w, t, SKILLS.mocking_refrain);
  check('hygiene: no mimic slot on the bar = no bank, no watch',
    !p.mimicBank && !p.mimicWatch);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
