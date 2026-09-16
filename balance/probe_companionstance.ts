// THE COMPANION STANCES + THE GROWING BOND (2026-09-16) — the regression rig.
//
// Two fabrics on the tamed bond, pinned through the real engine:
//   1. THE GROWING BOND — a bonded body's level follows its keeper (the
//      level-one hound is a level-twelve hound beside a level-twelve Tamer),
//      re-stamped in place through the one monster level fold, life kept as
//      a fraction, a beast claimed ABOVE the keeper kept at its wild level,
//      the kit re-leveled, the 'owner' mint-source double-dip closed.
//   2. THE STANCES — aggressive / defensive / passive as the standing order
//      beneath every issued one: the passive heel, the defensive answer
//      (keeper wounded, keeper wounding, the beast bitten), the leash, the
//      engage window, the sticky quarry, the cycle through the meta press,
//      the action intent, the clickable face, save + wire round trips, the
//      Command gem's chained Assault, `lunges`, the tree's stance-art hook,
//      dormant/released cleanup.
// docs/design/tame-beast.md; `npm run probe -- companionstance`.
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { mod } from '../src/engine/stats';
import { makeSkillInstance, instanceMeta, instanceMetas, metaFaceOf, supportFitsTags, META_CHAIN_INTERVAL, type SkillInstance, type SkillDef } from '../src/engine/skills';
import { COMPANION_CFG, companionLevelOf } from '../src/engine/companionSpec';
import { COMPANION_STANCE_CFG, defaultStanceId, nextStanceId, sanitizeCompanionStances, stanceOfOrder, standingOrderFor, stanceKindId } from '../src/engine/companionStances';
import { COMPANION_STANCES, companionStanceIds } from '../src/data/companionStances';
import { COMMAND_KINDS } from '../src/engine/ai';
import { monsterSkillLevelOf } from '../src/engine/world';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { CLASSES } from '../src/data/classes';
import { COMPANION_SKILLS } from '../src/data/companionSkills';
import { MIMIC_CFG } from '../src/engine/mimic';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { serializeSnapshot } from '../src/net/snapshot';
import { DEFAULT_KEYBINDS, ACTION_IDS, ACTION_LABELS, bindingContextsOverlap } from '../src/meta/settings';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';

let passed = 0, failed = 0;
const check = (name: string, ok: unknown) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); ok ? passed++ : failed++; };
const near = (a: number, b: number, eps = 0.0001) => Math.abs(a - b) < eps;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const TAME = 'tame_beast';

function setup(nodes: string[] = [], def: SkillDef = SKILLS.tame_beast, seed = 51217) {
  const w = makeSimWorld('tamer', seed), p = w.player;
  for (const key of Object.keys(w.meta.baseAttrs) as (keyof typeof w.meta.baseAttrs)[]) w.meta.baseAttrs[key] = 100;
  const inst = makeSkillInstance(def, 20, 3);
  w.meta.knownSkills.set(inst.def.id, inst); p.skills.fill(null); p.skills[0] = inst;
  for (const id of nodes) w.pickTreeNode(inst.def.id, id);
  w.recalcPlayer();
  p.sheet.setSource('rig', [mod('mana', 'flat', 10000), mod('life', 'flat', 10000), mod('lifeRegen', 'override', 0), mod('accuracy', 'flat', 100000), mod('critChance', 'override', 0)]);
  p.fillResources();
  return { w, p, inst, seat: w.localSeat };
}
function tick(w: World, seconds: number, ai = false) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) {
    if (ai) for (const a of w.actors) if (a !== w.player) updateAI(a, w, 1 / 60);
    w.update(1 / 60);
  }
}
/** An inert hostile: no kit, rooted, effectively unkillable — a target that never fights back. */
function foe(w: World, x = 200, y = 0, level = 1) {
  const a = w.createMonster('plains_wolf', level, 'enemy'); a.skills = [];
  a.pos = { x: w.player.pos.x + x, y: w.player.pos.y + y }; a.tier = w.player.tier;
  a.sheet.setSource('rig', [mod('life', 'flat', 100000), mod('lifeRegen', 'override', 0), mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('moveSpeed', 'override', 0), mod('damage', 'override', 0)]);
  w.springAmbush(a, true); a.untargetable = false; a.fillResources(); w.actors.push(a); return a;
}
/** A wild beast claimed on the spot (level as given). */
function pet(s: ReturnType<typeof setup>, id = 'plains_wolf', level = 1, x = 40) {
  const a = s.w.createMonster(id, level, 'enemy');
  a.pos = { x: s.p.pos.x + x, y: s.p.pos.y }; a.tier = s.p.tier;
  s.w.springAmbush(a, true); a.untargetable = false; a.fillResources(); s.w.actors.push(a);
  s.w.tameCompanion(s.p, a, TAME); s.w.companionBonds.refresh(); return a;
}
const strike = (dmg = 50) => makeSkillInstance({ ...SKILLS.claw, baseDamage: { physical: [dmg, dmg] }, effects: [{ type: 'damage' }] }, 1);
function hit(w: World, a: Actor, target: Actor, dmg = 50) {
  const before = target.life;
  (w as unknown as { resolveHit(a: Actor, s: SkillInstance, t: Actor, m: number, d: number): void }).resolveHit(a, strike(dmg), target, 1, 0);
  return before - target.life;
}
const heeled = (beast: Actor, keeper: Actor, reach = 160) => dist(beast.pos, keeper.pos) <= reach;
const stanceOf = (s: ReturnType<typeof setup>) => s.w.companionStanceOf(s.seat, TAME);
const orderOf = (beast: Actor) => stanceOfOrder(beast.standingOrder);

const restore = seedGlobalRandom(51217);
try {
  // ---- registry + data contracts ---------------------------------------------
  check('Three stances ship in cycle order', companionStanceIds().join(',') === 'aggressive,defensive,passive');
  check('Every stance registers a command kind', companionStanceIds().every(id => COMMAND_KINDS[stanceKindId(id)]));
  check('The default stance is aggressive (the pre-stance conduct)', defaultStanceId() === 'aggressive' && COMPANION_STANCE_CFG.default === 'aggressive');
  check('The cycle wraps', nextStanceId('passive') === 'aggressive' && nextStanceId('aggressive') === 'defensive');
  check('Tame Beast wears the stance shift as its meta', SKILLS.tame_beast.meta?.skillId === 'companion_stance' && !!SKILLS.companion_stance && COMPANION_SKILLS.companion_stance.effects[0].type === 'companionStance');
  check('Whistle stays the converted face', SKILLS.tame_beast.convert?.skillId === 'companion_whistle');
  check('The Command gem fits a companion bond', supportFitsTags(SUPPORTS.command_gem, SKILLS.tame_beast.tags));
  check('The mimic refuses the stance shift', MIMIC_CFG.denyEffects.includes('companionStance'));
  check('The stance action is bindable on keyboard and labelled', DEFAULT_KEYBINDS.companionStance === 'x' && ACTION_IDS.includes('companionStance') && !!ACTION_LABELS.companionStance);
  check('The stance action is a combat control (may share a menu key)', bindingContextsOverlap('companionStance', 'itemLock') === false);
  check('sanitizeCompanionStances keeps known ids only', JSON.stringify(sanitizeCompanionStances({ a: 'passive', b: 'zzz', c: 3 })) === JSON.stringify({ a: 'passive' }) && Object.keys(sanitizeCompanionStances(null)).length === 0);
  check('stanceOfOrder reads only stance orders', stanceOfOrder(standingOrderFor('defensive')) === 'defensive' && stanceOfOrder({ kind: 'assault', pos: { x: 0, y: 0 }, until: 1 }) === undefined && stanceOfOrder(undefined) === undefined);
  check('companionLevelOf: keeper-tracked, wild floor kept', companionLevelOf(12, 1) === 12 && companionLevelOf(5, 15) === 15 && companionLevelOf(20, 15) === 20);

  // ---- THE GROWING BOND ----------------------------------------------------------
  {
    const s = setup(), cls = CLASSES.find(c => c.id === 'tamer')!;
    s.w.actors = []; s.w.createPlayer(cls);
    const p = s.w.player, seat = s.w.localSeat;
    s.p = p; s.seat = seat; // the fresh hero replaces setup's body — every helper reads the live one
    const hound = s.w.actors.find(a => a.companion)!;
    check('A fresh Tamer’s hound stands at level one beside a level-one keeper', hound && hound.level === 1 && p.level === 1);
    const life1 = hound.maxLife();
    check('A bonded body carries no mint-time owner source (one fold)', !hound.sheet.sourceNames().includes('owner') && hound.sheet.sourceNames().includes('companionBond'));
    hound.life = hound.maxLife() * 0.5;
    p.level = 12; s.w.companionBonds.refresh();
    check('The hound grows to its keeper’s level', hound.level === 12);
    check('Level growth is the monster baseline (+22% life per level)', near(hound.maxLife() / life1, 1 + 0.22 * 11, 1e-6));
    check('Growing keeps life as a fraction', near(hound.life / hound.maxLife(), 0.5, 1e-6));
    check('The native kit climbs the monster ladder', hound.skills.every(k => !k || k.level === monsterSkillLevelOf(12)) && monsterSkillLevelOf(12) === 3);
    p.level = 30; s.w.companionBonds.refresh();
    check('Growth is monotone with the keeper', hound.level === 30);
    const seat2 = seat; void seat2;
    // the claimed-level floor
    p.level = 5; s.w.companionBonds.refresh();
    check('The fold is pure: keeper five + claimed one reads five (keeper levels never fall in play)', hound.level === 5);
    const wild = pet(s, 'plains_wolf', 15);
    check('A beast claimed above its keeper keeps its wild level', wild.level === 15);
    p.level = 20; s.w.companionBonds.refresh();
    check('Once the keeper passes it, the wild beast grows too', wild.level === 20);
    // the pre-stance reading
    COMPANION_CFG.level.follow = 'claimed'; s.w.companionBonds.refresh();
    check('follow: claimed restores the claimed level (the old reading)', wild.level === 15);
    COMPANION_CFG.level.follow = 'keeper'; s.w.companionBonds.refresh();
    check('follow: keeper resumes tracking', wild.level === 20);
    // never heals
    s.w.kill(wild);
    check('A downed bond stays at zero life through a relevel', wild.downed && wild.life === 0 && (p.level = 25, s.w.companionBonds.refresh(), wild.level === 25 && wild.life === 0));
  }
  {
    // granted arts re-mint at body level (Ancestral Art)
    const s = setup(['gentle_claim', 'focused_claim', 'returning_claim']);
    const a = pet(s);
    const art = () => a.skills.find(k => k?.def.id === 'beast_hound_art');
    check('The family art mints at body level', art()?.level === a.level);
    s.p.level = 17; s.w.companionBonds.refresh();
    check('The family art re-mints when the bond grows', a.level === 17 && art()?.level === 17);
    check('Defiant Roar rides the same ladder', a.skills.find(k => k?.def.id === 'beast_defiant_roar')?.level === 17);
  }
  {
    // load parity: a restored bond and a fresh claim read the keeper's investment ONCE
    const rigInv = [mod('minionLife', 'increased', 0.5)];
    const a = setup(); a.p.sheet.setSource('rig_inv', rigInv); a.w.recalcPlayer();
    const beastA = pet(a); a.w.companionBonds.refresh();
    const saved = serializeCharacter(a.w);
    const b = setup(); b.p.sheet.setSource('rig_inv', rigInv); b.w.recalcPlayer();
    b.w.restoreCompanions(saved.companions!); b.w.companionBonds.refresh();
    const beastB = b.w.actors.find(x => x.companion)!;
    check('A restored bond has the same life as a fresh claim (no owner-source double dip)', beastB && near(beastA.maxLife(), beastB.maxLife(), 1e-6) && !beastB.sheet.sourceNames().includes('owner'));
    check('A restored bond stands at the keeper’s level', beastB.level === companionLevelOf(b.p.level, saved.companions![0].level));
  }

  // ---- THE STANCES: conduct --------------------------------------------------------
  {
    const s = setup(), a = pet(s), e = foe(s.w, 220);
    check('A bond wears the default stance as its standing order', stanceOf(s) === 'aggressive' && orderOf(a) === 'aggressive');
    tick(s.w, 3, true);
    check('AGGRESSIVE hunts on its own (the legacy conduct)', a.aiTargetId === e.id || e.life < e.maxLife());
  }
  {
    const s = setup(), a = pet(s), e = foe(s.w, 220);
    s.w.setCompanionStance(s.seat, TAME, 'passive');
    check('The stance lands on the seat and the body', stanceOf(s) === 'passive' && orderOf(a) === 'passive');
    const before = e.life; tick(s.w, 3, true);
    check('PASSIVE never strikes of its own accord', e.life === before && a.aiTargetId === undefined);
    check('PASSIVE heels', heeled(a, s.p));
    hit(s.w, e, s.p); tick(s.w, 3, true);
    check('PASSIVE does not answer the keeper’s wound', e.life === before && heeled(a, s.p));
  }
  {
    const s = setup(), a = pet(s), e = foe(s.w, 220);
    s.w.setCompanionStance(s.seat, TAME, 'defensive');
    const before = e.life; tick(s.w, 3, true);
    check('DEFENSIVE idles at heel while the keeper is at peace', e.life === before && a.aiTargetId === undefined && heeled(a, s.p));
    hit(s.w, e, s.p); tick(s.w, 3, true);
    check('DEFENSIVE answers whatever wounds the keeper', a.aiTargetId === e.id && e.life < before);
    const mid = e.life; tick(s.w, 3, true);
    check('The quarry is STICKY: the beast keeps fighting after the window lapses', a.aiTargetId === e.id && e.life < mid);
    // a second foe out of the keeper's fight is ignored while the first stands
    const f = foe(s.w, -220);
    tick(s.w, 1, true);
    check('An uninvolved foe is not a quarry', f.life === f.maxLife());
  }
  {
    const s = setup(), a = pet(s), e = foe(s.w, 220);
    s.w.setCompanionStance(s.seat, TAME, 'defensive');
    const before = e.life; hit(s.w, s.p, e); tick(s.w, 3, true);
    check('DEFENSIVE answers whatever the keeper wounds', a.aiTargetId === e.id && e.life < before - 50);
  }
  {
    const s = setup(), a = pet(s), e = foe(s.w, 220);
    s.w.setCompanionStance(s.seat, TAME, 'defensive');
    // A nip, not a felling blow — and one the level-one pet cannot dodge.
    a.sheet.setSource('rig', [mod('evasion', 'override', 0)]);
    const before = e.life; hit(s.w, e, a, 5); tick(s.w, 3, true);
    check('DEFENSIVE bites back when the beast itself is bitten', !a.downed && a.aiTargetId === e.id && e.life < before);
  }
  {
    const s = setup(), a = pet(s), e = foe(s.w, 900);
    s.w.setCompanionStance(s.seat, TAME, 'defensive');
    const before = e.life; hit(s.w, e, s.p); tick(s.w, 3, true);
    check('THE LEASH: a foe beyond the keeper’s leash is never answered', e.life === before && a.aiTargetId === undefined && heeled(a, s.p));
  }
  {
    const s = setup(), a = pet(s), e = foe(s.w, 220);
    s.w.setCompanionStance(s.seat, TAME, 'passive');
    hit(s.w, e, s.p); tick(s.w, COMPANION_STANCE_CFG.engageWindow + 2, true);
    s.w.setCompanionStance(s.seat, TAME, 'defensive');
    const before = e.life; tick(s.w, 2, true);
    check('THE ENGAGE WINDOW: a stale wound is not an answer', e.life === before && a.aiTargetId === undefined);
  }
  {
    // the keeper's fight carries over a story-blind, team-blind stamp: an ally's blow never stamps the foe ledger
    const s = setup(), a = pet(s);
    const before = s.p.lastFoeId;
    hit(s.w, s.p, a);
    check('A friendly-fire seam never stamps the keeper’s foe ledger', s.p.lastFoeId === before);
  }

  // ---- THE STANCES: the shift (meta press, action, face) --------------------------------
  {
    const s = setup(), a = pet(s);
    check('The bar’s meta is the stance shift', instanceMeta(s.inst)?.skillId === 'companion_stance');
    check('The meta face wears the current stance', metaFaceOf(s.w, s.p, s.inst, instanceMeta(s.inst)!).label.includes('Aggressive'));
    check('A shift-press walks the cycle through the real meta pipeline', s.w.useMetaSkill(s.p, s.inst, s.p.pos) && stanceOf(s) === 'defensive' && orderOf(a) === 'defensive');
    const face = metaFaceOf(s.w, s.p, s.inst, instanceMeta(s.inst)!);
    check('The face follows the shift, in the stance’s ink', face.label.includes('Defensive') && face.color === COMPANION_STANCES.defensive.color);
    tick(s.w, 0.5);
    check('The action intent cycles every bond on the bar', (s.w.applyAction(s.seat, { t: 'companionStance' }), stanceOf(s) === 'passive'));
    check('An unknown stance id is refused', (s.w.applyAction(s.seat, { t: 'companionStance', stance: 'bogus' }), stanceOf(s) === 'passive'));
    check('A named stance lands directly', (s.w.applyAction(s.seat, { t: 'companionStance', skillId: TAME, stance: 'aggressive' }), stanceOf(s) === 'aggressive' && orderOf(a) === 'aggressive'));
    check('A skill the seat does not hold is refused', !s.w.setCompanionStance(s.seat, 'no_such_skill', 'passive'));
    check('Setting the held stance again reports no change', !s.w.setCompanionStance(s.seat, TAME, 'aggressive'));
    // a seatless caster's shift refunds
    const loose = makeSkillInstance(SKILLS.companion_stance, 1); a.skills = [...a.skills, loose];
    s.w.useSkill(a, loose, a.pos);
    check('A seatless caster’s shift refunds its clock', !a.cooldowns.has('companion_stance') && stanceOf(s) === 'aggressive');
  }
  {
    // save + wire round trips
    const s = setup(), a = pet(s);
    s.w.setCompanionStance(s.seat, TAME, 'passive');
    const save = serializeCharacter(s.w);
    check('The stance saves with the character', save.stances?.[TAME] === 'passive');
    const snap = JSON.stringify(serializeSnapshot(s.w, 0));
    check('The stance ships on the wire', snap.includes('"st":{"tame_beast":"passive"}'));
    const t = setup(); applySavedCharacter(t.w, save);
    const b = t.w.actors.find(x => x.companion)!;
    check('A loaded character keeps its stance and the restored bond wears it', t.w.meta.stances[TAME] === 'passive' && b && orderOf(b) === 'passive');
    const u = setup(); applySavedCharacter(u.w, { ...save, stances: { [TAME]: 'zzz' } });
    check('An unknown saved stance drops to the default', u.w.companionStanceOf(u.seat, TAME) === defaultStanceId());
    void a;
  }

  // ---- ORDERS OUTRANK THE STANCE; THE STANCE RESUMES ---------------------------------
  {
    const s = setup(), a = pet(s), e = foe(s.w, 260);
    s.w.setCompanionStance(s.seat, TAME, 'passive');
    tick(s.w, 1, true);
    const cmd = makeSkillInstance(SKILLS.command_assault, 1); cmd.hostSkillId = TAME;
    const before = e.life;
    s.w.executeSkill(s.p, cmd, e.pos);
    check('An explicit Assault order lands on a passive beast', a.aiCommand?.kind === 'assault' && a.aiCommand.targetId === e.id);
    tick(s.w, 3, true);
    check('The order outranks the stance: the passive beast fights', e.life < before);
    tick(s.w, 4, true);
    check('The order lapses and the stance resumes: the beast heels, still passive', !a.aiCommand && orderOf(a) === 'passive' && heeled(a, s.p));
  }
  {
    // THE META CHAIN: stance shift first, the Command gem's Assault one beat later
    const s = setup(), a = pet(s), e = foe(s.w, 260);
    s.inst.sockets[0] = { def: SUPPORTS.command_gem, level: 1 }; s.w.recalcPlayer(); s.w.companionBonds.refresh();
    check('The chain reads shift, then Assault, in slot order', instanceMetas(s.inst).map(m => m.skillId).join(',') === 'companion_stance,command_assault');
    const before = e.life;
    check('The shift-press shifts the stance NOW', s.w.useMetaSkill(s.p, s.inst, e.pos) && stanceOf(s) === 'defensive');
    check('The Assault has not fired yet', !a.aiCommand);
    tick(s.w, META_CHAIN_INTERVAL + 0.1, true);
    check('One beat later the Assault order lands on the bond, pinned on the mark', a.aiCommand?.kind === 'assault' && a.aiCommand.targetId === e.id);
    tick(s.w, 3, true);
    check('The pack charges the mark', e.life < before);
    tick(s.w, 4, true);
    check('Then keeps the stance it was set to', !a.aiCommand && orderOf(a) === 'defensive' && stanceOf(s) === 'defensive');
  }
  {
    // `lunges`: the bond-driven charge obeys the stance; explicit orders do not
    const s = setup(['swift_claim', 'repeat_claim', 'steady_claim']), a = pet(s);
    s.w.setCompanionStance(s.seat, TAME, 'passive');
    s.w.companionBonds.whistle(s.p, s.inst, { x: s.p.pos.x + 300, y: s.p.pos.y });
    check('A passive pack takes the rally’s pulses but not its charge', !a.aiCommand && !COMPANION_STANCES.passive.lunges);
    s.w.setCompanionStance(s.seat, TAME, 'aggressive');
    s.w.companionBonds.whistle(s.p, s.inst, { x: s.p.pos.x + 300, y: s.p.pos.y });
    check('An aggressive pack charges on the rally', a.aiCommand?.kind === 'assault' && COMPANION_STANCES.aggressive.lunges);
  }

  // ---- THE TREE'S HOOK: a stance art on the shift ---------------------------------------
  {
    const base = SKILLS.tame_beast;
    const def: SkillDef = { ...base, tree: { ...base.tree!, nodes: [...(base.tree!.nodes ?? []),
      { id: 'probe_stance_art', name: 'Probe Art', description: '', links: ['gentle_claim'], companionBond: { stanceArt: 'beast_rally_pulse' } }] } };
    const s = setup(['gentle_claim', 'probe_stance_art'], def), a = pet(s), e = foe(s.w, 60);
    check('The synthetic node is spent', s.inst.treeNodes?.includes('probe_stance_art'));
    const before = e.life;
    s.w.setCompanionStance(s.seat, TAME, 'defensive'); tick(s.w, 0.2);
    check('A stance shift casts the tree’s stance art from the beast', e.life < before);
    void a;
  }

  // ---- lifecycle: dormant, released, respec --------------------------------------------
  {
    const s = setup(['swift_claim']), a = pet(s), b = pet(s, 'plains_wolf', 1, 80);
    s.w.setCompanionStance(s.seat, TAME, 'defensive');
    check('Every beast of a litter wears the bond’s stance', orderOf(a) === 'defensive' && orderOf(b) === 'defensive');
    s.w.fonts.push({ pos: { ...s.p.pos } }); s.w.meta.abilityEssences.ability4 = 999; s.w.fontResetTree(TAME); s.w.companionBonds.refresh();
    const dormant = [a, b].find(x => x.companionDormant)!, live = [a, b].find(x => !x.companionDormant)!;
    check('A dormant over-cap bond wears no standing order; the live one keeps the stance', dormant && !dormant.standingOrder && orderOf(live) === 'defensive' && stanceOf(s) === 'defensive');
    s.w.releaseCompanion(live.id, s.seat); s.w.companionBonds.refresh();
    check('A released beast drops its standing order', live.dead && !live.standingOrder);
  }
} finally { restore(); }
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
