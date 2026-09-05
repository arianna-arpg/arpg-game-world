// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE MASTERY LADDER + THE OPENING + THE RUNESCRIPT
// (data/classTiers.ts · data/classes.ts ClassDef.kit · meta/classkit.ts ·
// data/runescript.ts · the objective web's live stamps).
//
// THE LADDER: per class, Novice/Adept/Expert/Master rungs at class level
// 10/30/60/100 — catalog rows minted only where the class authors a kit row
// (nothing moot), sequenced strictly, behind the earned class, unveiled by
// the class-level milestone the catalog derivation registers. THE OPENING:
// the wake's bar resolved against what the account OWNS (an unowned
// alternate falls back; a Master grant seats itself; picks remembered per
// class; the class-skill lane reads alternates as the class's own). THE
// RUNESCRIPT: 26 letters + th/ng, unique runes, a lossless round trip, the
// vestiges as the Rosetta stone (THE ROSETTA LAW — glyph derives from the
// taught letter, the letter lives in the name, no two teach the same).
// LIVE: the corpse reclaim + the boss kill stamp the account directly, the
// claim sweep yields a class mid-run (notice included), the derivation
// stamps class milestones beyond the standing list, and the wake seats the
// resolved kit. Run: npx tsx balance/probe_classmastery.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, classById, makeSimWorld, SIM_ARENA_ID, SIM_CFG } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { World } from '../src/engine/world';
import { resetActorIdCounter, type Actor } from '../src/engine/actor';
import { updateAI } from '../src/engine/ai';
import { buildManifest } from '../src/packages/manifest';
import { mod } from '../src/engine/stats';
import { vec, type Vec2 } from '../src/core/math';
import { RUNESCRIPT, decipher, encipher, isRune, runeLetterOf, runeOf } from '../src/data/runescript';
import { VESTIGE_LIST } from '../src/data/vestiges';
import { CLASSES, classOpeningSkills, classSkillStat, kitRungs } from '../src/data/classes';
import { CLASS_TIERS, CLASS_TIER_BY_ID, CLASS_WEB_CFG, classTierId } from '../src/data/classTiers';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import {
  LEDGER_BOSS_SLAIN, LEDGER_CORPSES_RECLAIMED, STARTER_CLASSES, bossSlainKey, classLevelLedgerKey,
  deserializeAccount, makeAccount, serializeAccount, type Account,
} from '../src/meta/account';
import { DEATH_SCHEMA } from '../src/meta/death';
import {
  UNLOCK_CATALOG, applyUnlock, availableUnlocks, catalogClassLevelMilestones, classBundleId,
  classUnlockFor, investUnlock, isUnlockVisible, settleClassUnlocks, shroudedClassUnlocks,
  classUnlockProgress,
} from '../src/meta/unlocks';
import {
  classTierOwned, kitChoicesFor, kitHasOptions, kitRungOf, rememberKitPicks, resolveClassKit,
} from '../src/meta/classkit';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

const NECRO = classById('necromancer');
const tierOf = (id: string) => CLASS_TIER_BY_ID[id];

// --- A) THE RUNESCRIPT: a whole, unique, lossless script ---------------------
{
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  check('runes: every letter a–z has a rune, plus the two Futhark digraphs',
    letters.every(l => !!runeOf(l)) && !!runeOf('th') && !!runeOf('ng'), `${RUNESCRIPT.length} rows`);
  const runes = RUNESCRIPT.map(r => r.rune);
  check('runes: every rune is unique (a cipher with homophones is not a cipher)',
    new Set(runes).size === runes.length);
  check('runes: every rune lives in the Unicode Runic block (U+16A0–U+16FF)',
    runes.every(r => [...r].length === 1 && r.codePointAt(0)! >= 0x16a0 && r.codePointAt(0)! <= 0x16ff));
  check('runes: the reverse read agrees with the forward table',
    RUNESCRIPT.every(r => runeLetterOf(r.rune) === r.letter && isRune(r.rune)));
  const names = CLASSES.map(c => c.name);
  const pangram = 'the quick brown fox jumps over the lazy dog, singing 12 songs!';
  check('runes: the round trip is lossless on every class name and a pangram (digraphs first)',
    [...names, pangram].every(t => decipher(encipher(t)) === t.toLowerCase()));
  check('runes: a shrouded name carries no plain letter — only runes, spaces and marks',
    names.every(n => !/[a-z]/i.test(encipher(n))));
  check('runes: "th" is one rune, never two (the script reads consistently both ways)',
    encipher('th') === runeOf('th') && encipher('t h') === `${runeOf('t')} ${runeOf('h')}`);
  check('runes: digits and punctuation pass through untouched (word shapes survive)',
    encipher('12 x-3') === `12 ${runeOf('x')}-3`);
  check('runes: enciphering runes is a fixed point (a shrouded line never double-shrouds)',
    encipher(encipher('necromancer')) === encipher('necromancer'));
}

// --- B) THE ROSETTA LAW: the vestiges teach the script ------------------------
{
  check('rosetta: every vestige teaches a letter of the script',
    VESTIGE_LIST.every(v => !!runeOf(v.letter)), VESTIGE_LIST.filter(v => !runeOf(v.letter)).map(v => v.id).join(','));
  check('rosetta: every vestige\'s glyph IS the rune of its letter (derived, never drifting)',
    VESTIGE_LIST.every(v => v.glyph === runeOf(v.letter)));
  check('rosetta: the taught letter lives in the vestige\'s short name (the item can teach it)',
    VESTIGE_LIST.every(v => v.name.split(',')[0].toLowerCase().includes(v.letter)),
    VESTIGE_LIST.filter(v => !v.name.split(',')[0].toLowerCase().includes(v.letter)).map(v => v.id).join(','));
  const taught = VESTIGE_LIST.map(v => v.letter);
  check('rosetta: no two vestiges teach the same letter (distinguishable underfoot)',
    new Set(taught).size === taught.length, taught.join(' '));
  const glyphs = VESTIGE_LIST.map(v => v.glyph);
  check('rosetta: every vestige glyph is unique', new Set(glyphs).size === glyphs.length);
}

// --- C) THE LADDER's weave ----------------------------------------------------------
{
  check('ladder: rungs ascend in level and every rung is priced',
    CLASS_TIERS.every((t, i) => t.cost > 0 && t.level > 0 && (i === 0 || t.level > CLASS_TIERS[i - 1].level)));
  check('ladder: rung ids unique', new Set(CLASS_TIERS.map(t => t.id)).size === CLASS_TIERS.length);
  const tierRows = UNLOCK_CATALOG.filter(u => u.kind === 'classtier');
  const kitted = CLASSES.filter(c => kitRungs(c).length > 0);
  check('ladder: exactly the classes authoring kit rows sell rungs (nothing moot surfaces)',
    tierRows.every(u => u.kind === 'classtier' && kitRungs(classById(u.payload.classId)).length > 0)
    && kitted.every(c => tierRows.some(u => u.kind === 'classtier' && u.payload.classId === c.id)),
    `${tierRows.length} rows over ${kitted.length} classes`);
  check('ladder: her four wear the whole ladder, and the Summoner mirrors it',
    ['warrior', 'magician', 'rogue', 'necromancer', 'summoner'].every(cid =>
      CLASS_TIERS.every(t => tierRows.some(u => u.id === classTierId(cid, t.id)))));
  let seqOk = true, gateOk = true, payloadOk = true, doorOk = true;
  for (const c of kitted) {
    let prev: string | undefined;
    for (const t of CLASS_TIERS) {
      const gifts = kitRungs(c).filter(r => r.tier === t.id);
      const u = tierRows.find(x => x.id === classTierId(c.id, t.id));
      if (!gifts.length) { if (u) seqOk = false; continue; }
      if (!u || u.kind !== 'classtier') { seqOk = false; continue; }
      const req = u.requiresUnlock === undefined ? [] : Array.isArray(u.requiresUnlock) ? u.requiresUnlock : [u.requiresUnlock];
      if (prev ? !req.includes(prev) : req.some(id => id.startsWith('tier_'))) seqOk = false;
      if (STARTER_CLASSES.includes(c.id) ? req.includes(classBundleId(c.id)) : !req.includes(classBundleId(c.id))) doorOk = false;
      const gate = u.reqAnyOf?.[0]?.classLevel;
      if (!gate || gate.classId !== c.id || gate.level !== t.level || u.reqAnyOf!.length !== 1) gateOk = false;
      if (u.payload.skillIds.join() !== gifts.map(g => g.skill).join() || u.cost !== t.cost) payloadOk = false;
      prev = u.id;
    }
  }
  check('ladder: rungs chain strictly to the previous EXISTING rung', seqOk);
  check('ladder: non-starters\' rungs stand behind the earned class; starters\' stand free', doorOk);
  check('ladder: each rung is unveiled by exactly its class level (a classLevel avenue)', gateOk);
  check('ladder: each rung sells exactly its kit row\'s skills at the ladder\'s price', payloadOk);
  // The kit rows themselves (validate.ts warns; this pins).
  const barOwners = new Map<string, string>();
  for (const c of CLASSES) for (const s of c.bar) if (s) barOwners.set(s, c.id);
  const allRungs = CLASSES.flatMap(c => kitRungs(c).map(r => ({ c, r })));
  check('kit: every rung names a real ladder rung and a real, droppable skill',
    allRungs.every(({ r }) => !!tierOf(r.tier) && !!SKILLS[r.skill] && !SKILLS[r.skill].noDrop));
  check('kit: no rung skill opens another class (kit uniqueness, extended)',
    allRungs.every(({ r }) => !barOwners.has(r.skill)));
  check('kit: rung skills are unique across every rung',
    new Set(allRungs.map(x => x.r.skill)).size === allRungs.length);
  check('kit: a `replaces` names one of its own class\'s starters and is bindable by the class\'s spread',
    allRungs.every(({ c, r }) => r.replaces === undefined
      || (c.bar.includes(r.replaces) && Object.entries(SKILLS[r.skill].requirements ?? {})
        .every(([a, n]) => (c.attributes[a as keyof typeof c.attributes] ?? 0) >= (n ?? 0)))));
  check('kit: every class authors at most one grant, and it is the Master\'s',
    CLASSES.every(c => kitRungs(c).filter(r => r.replaces === undefined).every(r => r.tier === CLASS_TIERS[CLASS_TIERS.length - 1].id)
      && kitRungs(c).filter(r => r.replaces === undefined).length <= 1));
  check('kit: classOpeningSkills = the bar + every rung skill, no repeats',
    CLASSES.every(c => {
      const open = classOpeningSkills(c);
      return new Set(open).size === open.length
        && c.bar.every(s => !s || open.includes(s)) && kitRungs(c).every(r => open.includes(r.skill));
    }));
  check('kit: kitRungOf names a rung skill\'s rung and nothing for a base starter',
    kitRungOf(NECRO, 'shambler_horde')?.label === tierOf('novice').label && kitRungOf(NECRO, 'poison_nova') === undefined);
  // THE CLASS-MILESTONE DERIVATION: the rungs' levels register their stamps.
  check('derivation: every kitted class\'s catalog milestones include each rung level',
    kitted.every(c => CLASS_TIERS.every(t => catalogClassLevelMilestones(c.id).includes(t.level))));
  check('derivation: a chained parent\'s played-to level registers on the PARENT',
    catalogClassLevelMilestones('necromancer').includes(CLASS_WEB_CFG.chainPlayLevel));
}

// --- D) THE VAULT walk: rungs surface only when investable; classes never pour ----
{
  const a = makeAccount();
  a.credits = 100000;
  const vis = (id: string): boolean => {
    const u = UNLOCK_CATALOG.find(x => x.id === id);
    return !!u && isUnlockVisible(a, u) && availableUnlocks(a).some(x => x.id === id);
  };
  const N = (t: string): string => classTierId('necromancer', t);
  check('vault: a fresh account sees no rung at all', UNLOCK_CATALOG.filter(u => u.kind === 'classtier').every(u => !vis(u.id)));
  a.ledger[classLevelLedgerKey('necromancer', 10)] = 1;
  check('vault: the Novice rung waits behind the EARNED class even at level 10', !vis(N('novice')));
  // Earn the Necromancer the corpse road; the pour never reaches it.
  const bundle = classUnlockFor('necromancer')!;
  const before = a.credits;
  check('earned: the pour refuses a class outright (cost 0, claimed never bought)',
    investUnlock(a, bundle, 100) === 0 && !applyUnlock(a, bundle) && a.credits === before && !a.unlockedClasses.has('necromancer'));
  a.ledger[LEDGER_CORPSES_RECLAIMED] = 20;
  check('earned: the settle claims the Necromancer at twenty corpses',
    settleClassUnlocks(a).some(u => u.id === bundle.id) && a.unlockedClasses.has('necromancer'));
  check('vault: the Novice rung surfaces once the class is earned and level 10 stands', vis(N('novice')));
  check('vault: the Adept rung stays hidden (Novice unowned, level 30 unmet)', !vis(N('adept')));
  a.ledger[classLevelLedgerKey('necromancer', 30)] = 1;
  check('vault: level 30 alone does not surface the Adept rung (sequence first)', !vis(N('adept')));
  check('buy: the Novice rung', applyUnlock(a, UNLOCK_CATALOG.find(u => u.id === N('novice'))!)
    && classTierOwned(a, 'necromancer', 'novice'));
  check('buy: the rung\'s skill joins the drop pool', a.unlockedSkills.has('shambler_horde'));
  check('vault: Novice owned + level 30 surfaces the Adept rung alone',
    vis(N('adept')) && !vis(N('expert')) && !vis(N('master')));
  a.ledger[classLevelLedgerKey('necromancer', 60)] = 1;
  a.ledger[classLevelLedgerKey('necromancer', 100)] = 1;
  check('vault: level 60 and 100 stamped, Expert and Master still wait on the sequence',
    !vis(N('expert')) && !vis(N('master')));
  check('buy: Adept, then Expert, then Master — one rung at a time',
    applyUnlock(a, UNLOCK_CATALOG.find(u => u.id === N('adept'))!) && vis(N('expert')) && !vis(N('master'))
    && applyUnlock(a, UNLOCK_CATALOG.find(u => u.id === N('expert'))!) && vis(N('master'))
    && applyUnlock(a, UNLOCK_CATALOG.find(u => u.id === N('master'))!));
  check('vault: the ladder climbed, nothing more to sell for the class',
    CLASS_TIERS.every(t => !vis(N(t.id))) && ['shambler_horde', 'corpse_explosion', 'summon_bone_golem', 'grave_tide']
      .every(s => a.unlockedSkills.has(s)));
  // A starter class stands free of any bundle: its rung needs only the level.
  const b = makeAccount();
  b.credits = 1000;
  const W = classTierId('warrior', 'novice');
  const bvis = (id: string): boolean => availableUnlocks(b).some(x => x.id === id);
  check('vault: a starter\'s Novice rung waits only on its level', !bvis(W) && (b.ledger[classLevelLedgerKey('warrior', 10)] = 1, bvis(W)));
  check('shroud: the Necromancer, once earned, leaves the shrouded wall',
    shroudedClassUnlocks(a).every(u => u.kind === 'class' && u.payload.classId !== 'necromancer'));
}

// --- E) THE OPENING: the resolver, the chooser, the memory --------------------------
{
  const a = makeAccount();
  a.unlockedClasses.add('necromancer');
  const base = NECRO.bar.slice();
  check('opening: with no rung owned the kit is the base bar, and the card has no choice to offer',
    resolveClassKit(a, NECRO).join() === base.join() && !kitHasOptions(a, NECRO)
    && kitChoicesFor(a, NECRO).slots.every(s => s.options.length === 1) && kitChoicesFor(a, NECRO).grants.length === 0);
  check('opening: an unowned alternate is refused — the base stands',
    resolveClassKit(a, NECRO, { poison_nova: 'shambler_horde' })[0] === 'poison_nova');
  a.unlockedClassTiers.add(classTierId('necromancer', 'novice'));
  const ch = kitChoicesFor(a, NECRO);
  check('opening: Novice owned — the first slot offers base OR the alternate, base picked by default',
    ch.slots[0].options.join() === 'poison_nova,shambler_horde' && ch.slots[0].picked === 'poison_nova' && kitHasOptions(a, NECRO));
  check('opening: a valid pick stands in for its base; the other slots keep theirs',
    resolveClassKit(a, NECRO, { poison_nova: 'shambler_horde' }).slice(0, 3).join() === 'shambler_horde,raise_dead,despair');
  check('opening: a stranger pick and an unowned rung\'s pick both fall back',
    resolveClassKit(a, NECRO, { poison_nova: 'firebolt', raise_dead: 'corpse_explosion' }).slice(0, 3).join() === base.slice(0, 3).join());
  rememberKitPicks(a, NECRO, { poison_nova: 'shambler_horde', raise_dead: 'corpse_explosion', despair: 'despair' });
  check('memory: only valid, non-base picks are remembered',
    JSON.stringify(a.kitPicks.necromancer) === JSON.stringify({ poison_nova: 'shambler_horde' }));
  check('memory: the remembered pick is the chooser\'s default and the resolver\'s answer',
    kitChoicesFor(a, NECRO).slots[0].picked === 'shambler_horde' && resolveClassKit(a, NECRO)[0] === 'shambler_horde');
  const round = deserializeAccount(serializeAccount(a))!;
  check('memory: rungs and picks survive the account round trip',
    round.unlockedClassTiers.has(classTierId('necromancer', 'novice')) && round.kitPicks.necromancer?.poison_nova === 'shambler_horde');
  rememberKitPicks(a, NECRO, { poison_nova: 'poison_nova' });
  check('memory: choosing the base again forgets the record', a.kitPicks.necromancer === undefined);
  a.unlockedClassTiers.add(classTierId('necromancer', 'master'));
  const withGrant = resolveClassKit(a, NECRO);
  check('opening: the Master\'s grant seats itself in the first empty slot (THE CAPSTONE LAW: bar-bound, cast-gated)',
    kitChoicesFor(a, NECRO).grants.map(g => g.skill).join() === 'grave_tide' && withGrant[3] === 'grave_tide'
    && withGrant.length === NECRO.bar.length);
  const full: (string | null)[] = ['poison_nova', 'raise_dead', 'despair', 'x1', 'x2', 'x3', 'x4', 'x5'];
  const fullDef = { ...NECRO, bar: full };
  check('opening: a full bar takes no gift (never overwrites a seat)',
    !resolveClassKit(a, fullDef).includes('grave_tide'));
}

// --- F) LIVE: the stamps, the sweep, the derivation, the wake -----------------------
bootSimEngine();
seedGlobalRandom(0x5ca1e);

/** A sim world on a GIVEN account (makeSimWorld's recipe, minus its
 *  unlock-everything line — the web must have something left to claim). */
function worldOn(account: Account, classId: string, seed: number, kit?: readonly (string | null)[]): World {
  resetActorIdCounter();
  const manifest = buildManifest(account, seed);
  for (const p of manifest.packages) p.enabled = false;
  const w = new World(account, Object.freeze(manifest));
  w.createPlayer(classById(classId), { kit });
  w.loadZone(SIM_ARENA_ID);
  w.player.pos.x = SIM_CFG.arena.w / 2;
  w.player.pos.y = SIM_CFG.arena.h / 2;
  return w;
}
type CorpseLike = { pos: Vec2; recordIndex: number; owner: string; who: { classId: string; level: number }; dwell: number; reclaimed: boolean };
type WorldPriv = { reclaimCorpse(c: CorpseLike): void; createMonster(defId: string, lvl: number, team: 'enemy' | 'player'): Actor; recalcSeat(seat: World['localSeat']): void };
const priv = (w: World): WorldPriv => w as unknown as WorldPriv;

{
  // THE CORPSE DEED: reclaiming your own corpse stamps the account directly.
  const acc = makeAccount();
  const w = worldOn(acc, 'warrior', 0x2c1);
  // A corpse record on the account ring (the death flow's own shape; the
  // kit's own gems are not loot, so the record is minted by hand here).
  acc.deaths.push({
    schema: DEATH_SCHEMA, mapX: 0, mapY: 0, pos: { x: w.player.pos.x, y: w.player.pos.y }, zoneId: w.zone.id,
    loot: { items: [] }, classId: 'warrior', charLevel: 1, zoneName: w.zone.name, owner: 'p0', timestamp: 0,
  });
  const corpse: CorpseLike = { pos: vec(w.player.pos.x, w.player.pos.y), recordIndex: 0, owner: 'p0', who: { classId: 'warrior', level: 1 }, dwell: 0, reclaimed: false };
  priv(w).reclaimCorpse(corpse);
  check('live: the reclaim stamps corpses_reclaimed ACCOUNT-DIRECT (never the run ledger)',
    (acc.ledger[LEDGER_CORPSES_RECLAIMED] ?? 0) === 1 && corpse.reclaimed && (w.ledger[LEDGER_CORPSES_RECLAIMED] ?? 0) === 0
    && acc.deaths[0].loot.items.length === 0);
  check('live: the reclaim booked the account save', w.accountDirty);
}
{
  // THE BOSS DEED: a credited boss kill counts once for all and once per faction.
  const acc = makeAccount();
  const w = worldOn(acc, 'warrior', 0x2c2);
  const boss = priv(w).createMonster('wailing_one', 5, 'enemy');
  w.actors.push(boss);
  w.kill(boss, false, w.player);
  check('live: a credited undead boss stamps boss_slain and boss_slain:undead on the account',
    (acc.ledger[LEDGER_BOSS_SLAIN] ?? 0) === 1 && (acc.ledger[bossSlainKey('undead')] ?? 0) === 1);
  const trash = priv(w).createMonster('zombie', 5, 'enemy');
  w.actors.push(trash);
  w.kill(trash, false, w.player);
  check('live: a trash kill stamps no boss deed', (acc.ledger[LEDGER_BOSS_SLAIN] ?? 0) === 1);
  const quiet = priv(w).createMonster('wailing_one', 5, 'enemy');
  quiet.noBounty = true;
  w.actors.push(quiet);
  w.kill(quiet, false, w.player);
  check('live: a rewardless (noBounty) boss teaches nothing — the scene stays rewardless', (acc.ledger[LEDGER_BOSS_SLAIN] ?? 0) === 1);
  const uncredited = priv(w).createMonster('wailing_one', 5, 'enemy');
  w.actors.push(uncredited);
  w.kill(uncredited, false, trash);
  check('live: an uncredited boss death (a monster\'s blow) stamps nothing', (acc.ledger[LEDGER_BOSS_SLAIN] ?? 0) === 1);
}
{
  // THE CLAIM SWEEP: a deed completed mid-run yields the class mid-run, with a notice.
  const acc = makeAccount();
  const w = worldOn(acc, 'warrior', 0x2c3);
  acc.ledger[LEDGER_CORPSES_RECLAIMED] = 20;
  check('live: before the sweep the Necromancer is unclaimed', !acc.unlockedClasses.has('necromancer'));
  for (let i = 0; i < Math.ceil((CLASS_WEB_CFG.sweepSec + 1) * 60); i++) w.update(1 / 60);
  check('live: the sweep claims the Necromancer within its cadence and its gems join the pool',
    acc.unlockedClasses.has('necromancer') && acc.unlockedSkills.has('raise_dead'));
  check('live: the claim speaks on the notice feed', w.notices.some(n => n.text.includes('Necromancer')));
  check('live: the sweep booked the account save', w.accountDirty);
  // The merged view: a play milestone stamped THIS run (run ledger only) claims through the view.
  w.ledger[classLevelLedgerKey('necromancer', 10)] = 1;
  w.update(CLASS_WEB_CFG.sweepSec + 0.5);
  check('live: a run-ledger milestone claims the chained Summoner through the merged view (account ledger untouched)',
    acc.unlockedClasses.has('summoner') && acc.ledger[classLevelLedgerKey('necromancer', 10)] === undefined);
  check('live: the shrouded card\'s progress read agrees with the view', classUnlockProgress(acc, classUnlockFor('summoner')!, w.ledgerView()).met);
}
{
  // THE DERIVATION: a necromancer levelled past the standing list stamps the rungs' levels too.
  const w = makeSimWorld('necromancer', 0x2c4);
  w.grantXp(5e7);
  check('live: the run ledger carries the rungs\' class milestones (60 and 100 are not on the standing list)',
    (w.ledger[classLevelLedgerKey('necromancer', 60)] ?? 0) >= 1 && (w.ledger[classLevelLedgerKey('necromancer', 100)] ?? 0) >= 1
    && (w.ledger[classLevelLedgerKey('necromancer', 30)] ?? 0) >= 1, `level ${w.player.level}`);
}
{
  // THE WAKE: the resolved kit seats the alternate and the grant; the class-skill lane reads them.
  const acc = makeAccount();
  acc.unlockedClasses.add('necromancer');
  acc.unlockedClassTiers.add(classTierId('necromancer', 'novice'));
  acc.unlockedClassTiers.add(classTierId('necromancer', 'master'));
  const kit = resolveClassKit(acc, NECRO, { poison_nova: 'shambler_horde' });
  const w = worldOn(acc, 'necromancer', 0x2c5, kit);
  const bar = w.player.skills.map(s => s?.def.id ?? null);
  check('live: the hero wakes with the alternate in the first seat and the grant in the fourth',
    bar[0] === 'shambler_horde' && bar[1] === 'raise_dead' && bar[2] === 'despair' && bar[3] === 'grave_tide', bar.join());
  check('live: the displaced base is not known; the seated arts are', !w.meta.knownSkills.has('poison_nova')
    && w.meta.knownSkills.has('shambler_horde') && w.meta.knownSkills.has('grave_tide'));
  w.player.sheet.setSource('probe_classskill', [mod(classSkillStat('necromancer'), 'flat', 2)]);
  priv(w).recalcSeat(w.localSeat);
  check('live: "+2 to Necromancer skills" reaches the alternate opening exactly as a base starter',
    w.meta.knownSkills.get('shambler_horde')?.bonusLevels === 2 && w.meta.knownSkills.get('grave_tide')?.bonusLevels === 2);
  // The Shambling Horde's body + the Bone Golem's: the bomber grammar, pure data.
  const gs = MONSTERS.grave_shambler;
  check('content: the grave shambler is bomber-brained ordnance (fuse + death blast, never recalled)',
    !!gs && gs.brain?.type === 'bomber' && (gs.explodeOnDeath ?? 0) > 0 && gs.noRecall === true && gs.xp === 0
    && SKILLS.shambler_horde.delivery.type === 'summon' && SKILLS.shambler_horde.delivery.monsterId === 'grave_shambler');
  const fam = MONSTERS.arcane_familiar;
  check('content: the Summoner wakes as the arcanist — Ruin, one bonded familiar, the drain',
    classById('summoner').bar.slice(0, 3).join() === 'ruin,bind_familiar,essence_drain'
    && !!fam && fam.xp === 0 && SKILLS.bind_familiar.delivery.type === 'summon'
    && SKILLS.bind_familiar.delivery.monsterId === 'arcane_familiar' && !!SKILLS.bind_familiar.delivery.persistent
    && SKILLS.bind_familiar.delivery.maxActive === 1);
  const bg = MONSTERS.bone_golem;
  check('content: the bone golem stands (look registered, golem contract, shared slot)',
    !!bg && !!LOOKS[bg.look ?? ''] && SKILLS.summon_bone_golem.delivery.type === 'summon'
    && SKILLS.summon_bone_golem.delivery.monsterId === 'bone_golem'
    && SKILLS.summon_bone_golem.delivery.poolGroup === 'golem' && !!SKILLS.summon_bone_golem.delivery.persistent);
  // A live pop through the REAL pipeline: cast the Horde at an enemy a few
  // strides off — the shambler raised at the caster's side lurches to its
  // mark, arms, bursts, and is spent; the mark is wounded by the blast.
  const enemy = priv(w).createMonster('zombie', 1, 'enemy');
  enemy.pos = vec(w.player.pos.x + 120, w.player.pos.y);
  w.actors.push(enemy);
  const enemyLife = enemy.life;
  const inst = w.meta.knownSkills.get('shambler_horde')!;
  check('live: the Horde casts from the wake bar', w.useSkill(w.player, inst, vec(enemy.pos.x, enemy.pos.y), true));
  // (The harness drives minds from the runner, not World.update — step both.)
  let sham: Actor | undefined;
  for (let i = 0; i < 8 * 60; i++) {
    for (const a of w.actors) updateAI(a, w, 1 / 60);
    w.update(1 / 60);
    sham ??= w.actors.find(x => x.defId === 'grave_shambler');
    if (sham?.dead) break;
  }
  check('live: the shambler is raised, lurches to its mark and bursts within seconds; the mark is wounded',
    !!sham && sham.dead && (enemy.dead || enemy.life < enemyLife), `enemy ${Math.round(enemy.life)}/${Math.round(enemyLife)}, shambler ${sham ? (sham.dead ? 'spent' : 'alive') : 'never raised'}`);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failed ? 2 : 0);
