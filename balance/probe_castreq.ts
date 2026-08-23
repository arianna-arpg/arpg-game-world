// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE CAST-TIME REQUIREMENT GATE (backlog #90:
// World.castReqRefusal / reqShortfall — skills.ts `SkillDef.requirements`
// held at the PRESS, not only at the learn). Pins:
//   - THE LEARN GATE UNCHANGED: learnSkill still refuses a build below the
//     gem's gates and admits one meeting them (meetsRequirements now folds
//     through the ONE reqShortfall read).
//   - THE BYPASS CLOSES: a gem learned at met attributes REFUSES to cast
//     after the build drops below them (the respec / shed-gear exploit) —
//     the refused press pays nothing, starts nothing, and stays refused.
//   - THE REFUSAL SPEAKS: reqShortfall names every short attribute in the
//     registry's own shorts ('needs STR 24'), derived here from ATTRIBUTES
//     + the def itself so a blessed rename flows through.
//   - THE KIT CENSUS: every class bar and every merc template loadout
//     clears its own class's BASE attributes — a fresh class (and every
//     class-derived template blade) can never boot with a dark kit.
//   - SEATLESS CASTERS EXEMPT BY CONSTRUCTION: a monster casting a
//     requirement-bearing catalog skill is untouched (no seat, no build to
//     judge — enemy kits never gate on player attributes).
//   - THE POSSESSION STANCE: a seat-owned caster firing an instance the
//     seat never LEARNED (a borrowed husk's kit, a mimic capture, an
//     improvised swing) is exempt — the gate binds exactly the learn-gated
//     population, read off seat.meta (the HOME build).
//   - RELEASE ALWAYS LANDS: a live toggle (aura up / strobe held) is exempt
//     so the OFF-press works below the gates; RE-ignition is what refuses.
//   - THE TRIGGER ARTERY: an armed trigger gem cannot fire an unmet host by
//     the side door (triggerEligible reads the same predicate, silently).
// Run: npx tsx balance/probe_castreq.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance, TRIGGER_CFG } from '../src/engine/skills';
import { ATTRIBUTES, ATTRIBUTE_IDS } from '../src/engine/stats';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { CLASSES } from '../src/data/classes';
import { MERC_TEMPLATES } from '../src/data/mercenaries';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xca57);

const w: World = makeSimWorld('warrior', 0xca57);
const seat = w.localSeat;
const hero = seat.actor;
const aim = () => vec(hero.pos.x + 60, hero.pos.y);

/** Attribute surgery: pin every base attribute to n (the probe's "respec"
 *  lever — recalcSeat re-derives live attrs the same artery a real respec
 *  or unequip does, so the gate sees exactly what it would see live). */
const setAll = (n: number): void => {
  for (const a of ATTRIBUTE_IDS) seat.meta.baseAttrs[a] = n;
  w.recalcSeat(seat);
};
const settle = (): void => {
  hero.casting = null;
  hero.cooldowns.clear();
  hero.mana = hero.maxMana();
  w.time += 10;
};
// THE RESIDENCE (M1): bag() mints the gem's wrapper item and answers its
// UID — learnSkill's new address. A refused learn leaves the item bagged,
// so the same uid re-learns after the attributes rise (rig A's shape).
const bag = (skillId: string): number => {
  const item = w.grantSkillGemItem(seat, makeSkillInstance(SKILLS[skillId], 1, 1));
  return item!.uid;
};
const step = (sec: number): void => {
  const dt = 1 / 60;
  for (let t = 0; t < sec; t += dt) w.update(dt);
};

const gsReq = SKILLS['ground_slam'].requirements!;
const gsWhy = `needs ${ATTRIBUTES.strength.short} ${gsReq.strength}`;
/** The independent oracle for a whole-def shortfall at attrs 0: every gate,
 *  def order, the registry's own shorts. */
const wholeShortfall = (id: string): string => 'needs ' + Object.entries(SKILLS[id].requirements!)
  .map(([a, n]) => `${ATTRIBUTES[a as keyof typeof ATTRIBUTES].short} ${n}`).join(', ');

// ------------------------------------------------ A. THE LEARN GATE HELD
setAll(0);
const gsIdx = bag('ground_slam');
check('A: learnSkill refuses a build below the gates', w.learnSkill(gsIdx, seat) === false
  && !seat.meta.knownSkills.has('ground_slam'));
setAll(40);
check('A: …and admits one meeting them', w.learnSkill(gsIdx, seat) === true
  && seat.meta.knownSkills.has('ground_slam'));

// ------------------------------------- B. THE RESPEC BYPASS CLOSES (#90)
const gs = seat.meta.knownSkills.get('ground_slam')!;
check('B: at met attributes the learned gem casts', w.useSkill(hero, gs, aim()) === true);
settle();
setAll(0); // the respec: the build no longer carries STR 24
const manaBefore = hero.mana;
check('B: below them the SAME gem refuses at the press',
  w.useSkill(hero, gs, aim()) === false && hero.casting === null);
check('B: the refused press pays nothing', hero.mana === manaBefore);
check('B: and stays refused — the exploit is dead, not once-warned',
  w.useSkill(hero, gs, aim()) === false);

// ------------------------------------------------ C. THE REFUSAL SPEAKS
check('C: castReqRefusal speaks the shortfall', w.castReqRefusal(hero, gs) === gsWhy);
check('C: reqShortfall lists every short attribute in def order',
  w.reqShortfall('tide_lash', seat)
    === `needs ${ATTRIBUTES.dexterity.short} ${SKILLS['tide_lash'].requirements!.dexterity}, `
      + `${ATTRIBUTES.strength.short} ${SKILLS['tide_lash'].requirements!.strength}`);
// A HELD STROBE is a live toggle: the release must stay reachable.
hero.strobes.set('ground_slam', { inst: gs, timer: 0, reserved: 0 });
check('C: a held strobe exempts (release reachable)', w.castReqRefusal(hero, gs) === undefined);
hero.strobes.delete('ground_slam');
check('C: …and the gate returns when the strobe drops', w.castReqRefusal(hero, gs) === gsWhy);
setAll(40);
check('C: met builds read undefined', w.reqShortfall('ground_slam', seat) === undefined
  && w.castReqRefusal(hero, gs) === undefined);

// ----------------------------------------------------- D. THE KIT CENSUS
{
  const rows: string[] = [];
  const censusBar = (label: string, bar: (string | null)[], attrs: Record<string, number>): void => {
    for (const sid of bar) {
      const req = sid ? SKILLS[sid]?.requirements : undefined;
      if (!req) continue;
      for (const [a, n] of Object.entries(req)) {
        if ((attrs[a] ?? 0) < (n ?? 0)) rows.push(`${label}: ${sid} needs ${a} ${n} over base ${attrs[a] ?? 0}`);
      }
    }
  };
  for (const c of CLASSES) censusBar(`class ${c.id}`, c.bar, c.attributes);
  for (const t of MERC_TEMPLATES) {
    const c = CLASSES.find(x => x.id === t.classId);
    if (!c) { rows.push(`template ${t.id}: unknown class '${t.classId}'`); continue; }
    censusBar(`template ${t.id}`, t.bar ?? c.bar, c.attributes);
  }
  check('D: every class kit + merc template loadout clears its class base attrs',
    rows.length === 0, rows.join('; '));
}

// -------------------------------------- E. SEATLESS CASTERS EXEMPT
settle();
w.devGrabSpawn('dire_wolf');
const wolf = w.actors[w.actors.length - 1];
wolf.mana = 999;
const wolfInst = makeSkillInstance(SKILLS['ground_slam'], 1, 1);
check('E: a seatless monster never meets the gate',
  w.castReqRefusal(wolf, wolfInst) === undefined);
check('E: …and the full pipeline admits its cast',
  w.useSkill(wolf, wolfInst, vec(wolf.pos.x + 60, wolf.pos.y)) === true);
wolf.dead = true;

// ------------------- F. THE POSSESSION STANCE (unlearned instance exempt)
setAll(0);
const tide = makeSkillInstance(SKILLS['tide_lash'], 1, 1);
check('F: a seat-owned caster firing an UNLEARNED instance is exempt',
  !seat.meta.knownSkills.has('tide_lash') && w.castReqRefusal(hero, tide) === undefined);
check('F: …and the borrowed-kit shape casts through the pipeline',
  w.useSkill(hero, tide, aim()) === true);
// A GRANTED spark (class-kit re-kindle, dev grant) is the game's own gift —
// exempt: the gate binds exactly the learn-gated population.
const gift = makeSkillInstance(SKILLS['heavy_strike'], 1, 1);
gift.granted = true;
seat.meta.knownSkills.set('heavy_strike', gift);
check('F: a granted spark is exempt below its gates',
  w.castReqRefusal(hero, gift) === undefined);
gift.granted = false;
check('F: …and the same instance gates once it is an ordinary learned gem',
  w.castReqRefusal(hero, gift) !== undefined);
seat.meta.knownSkills.delete('heavy_strike');
settle();

// ------------------------------------------- G. RELEASE ALWAYS LANDS
setAll(40);
const rfIdx = bag('righteous_fire');
check('G: the aura learns at met attributes', w.learnSkill(rfIdx, seat) === true);
const rf = seat.meta.knownSkills.get('righteous_fire')!;
check('G: ignition at met attributes', w.useSkill(hero, rf, aim()) === true);
step(1);
check('G: the aura stands', hero.activeAuras.has('righteous_fire'));
setAll(0); // the respec below WIL 16, aura still up
check('G: a live aura exempts — the OFF-press stays reachable',
  w.castReqRefusal(hero, rf) === undefined);
w.time += 1;
check('G: the release lands', w.useSkill(hero, rf, aim()) === true);
step(1);
check('G: …and the aura is down', !hero.activeAuras.has('righteous_fire'));
w.time += 1;
hero.casting = null;
check('G: re-ignition is what the gate refuses',
  w.useSkill(hero, rf, aim()) === false
  && w.castReqRefusal(hero, rf) === wholeShortfall('righteous_fire'));

// ---------------------------------------------- H. THE TRIGGER ARTERY
// Derive a quick host the trigger can legally fire (the compat idiom —
// never a hardcoded id): requirement-bearing, instant-fire under
// TRIGGER_CFG.maxUseTime, cooldown-free, and socketable by the gem.
settle();
const codt = SUPPORTS['cast_on_damage_taken'];
const codtExclude = new Set(codt.excludeTags ?? []);
const quick = Object.values(SKILLS).find(s =>
  !s.noDrop && s.requirements && s.cooldown === 0
  && s.useTime > 0 && s.useTime <= TRIGGER_CFG.maxUseTime
  && !s.channel && !s.castMode && !s.pool && !s.invokes && !s.comboChain && !s.mimic
  && s.delivery.type !== 'aura' && s.delivery.type !== 'dash'
  && s.delivery.type !== 'blink' && s.delivery.type !== 'leap'
  && !(s.delivery.type === 'ground' && s.delivery.strobe)
  && !s.tags.some(t => codtExclude.has(t))
  && !seat.meta.knownSkills.has(s.id));
check('H: a quick requirement-bearing trigger host derives from the catalog',
  !!quick, quick?.id ?? 'none');
setAll(40);
check('H: the host learns', w.learnSkill(bag(quick!.id), seat) === true);
const codtItem = w.grantSupportGemItem(seat, { def: codt, level: 1 });
check('H: the trigger gem sockets',
  !!codtItem && w.socketSupport(codtItem.uid, quick!.id, seat) === true);
const armed = seat.meta.knownSkills.get(quick!.id)!;
hero.skills[3] = armed; // the bar seat the trigger artery scans
setAll(0); // the respec: the armed host is now unmet
hero.mana = hero.maxMana();
w.bankDamageTakenTriggers(hero, hero.maxLife());
check('H: below the gates the bank holds — no side-door fire',
  (armed.state?.trigAccum ?? 0) > 0);
setAll(40);
hero.mana = hero.maxMana();
w.time += 1; // past any icd
w.bankDamageTakenTriggers(hero, hero.maxLife());
check('H: at met attributes the same bank fires (accum spent)',
  (armed.state?.trigAccum ?? 0) === 0);

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
