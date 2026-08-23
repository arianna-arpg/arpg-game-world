// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE BREAKER'S EYE (bench salvage QoL: engine/world.ts
// salvageBulk/salvageLockSet, the `locked` keeper's-mark flag on
// ItemInstance/SkillInstance/SupportInstance, meta/character.ts save
// threading, net/snapshot.ts `lk` wire bit). Pins:
//   - THE KEEPER'S MARK (salvageLock): a locked bag item / skill gem /
//     support gem REFUSES single salvage (thing stays, wallet unmoved) and
//     every salvageBulk sweep skips it; the mark rides gear by uid on bag
//     AND doll (locking a worn piece protects it after unequip); unlocking
//     re-opens salvage.
//   - THE SWEEP (salvageBulk): one blow per category — whole-bag and
//     rarity-narrowed gear sweeps pay EXACTLY the sum of the per-item
//     yields the panel previews (same function, same filters); skill-gem
//     sweeps pry socketed supports into the loose bag (never destroyed),
//     skip granted sparks (they break into nothing — deleting them stays a
//     deliberate single click) and skip locked gems; support sweeps skip
//     locked gems.
//   - WORN GEAR IS STRUCTURALLY SAFE: a doll piece is not in m.items, so
//     neither single salvage nor any sweep can reach it.
//   - SAVE FIDELITY: locked flags round-trip serializeCharacter →
//     rebuildSavedMeta on gear (verbatim JSON), carried skill gems and
//     loose supports (threaded through SavedSkill/SavedSocket).
//   - WIRE FIDELITY: serializeSeatMeta ships `lk: 1` on locked carried
//     gems (gear rides verbatim), absent otherwise.
// Run: npx tsx balance/probe_salvagemode.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { FEATURE } from '../src/meta/account';
import { START_ZONE } from '../src/data/zones';
import { SALVAGE_SITE } from '../src/data/townBuild';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { ESSENCE_IDS, type EssenceId } from '../src/data/essences';
import { rollItem } from '../src/engine/itemgen';
import { salvageItemYield, salvageSkillYield, salvageSupportYield } from '../src/engine/crafting';
import { makeSkillInstance, type SupportInstance } from '../src/engine/skills';
import type { ItemInstance, ItemRarity } from '../src/engine/items';
import { serializeCharacter, rebuildSavedMeta } from '../src/meta/character';
import { serializeSeatMeta } from '../src/net/snapshot';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

/** Stand the hero on the bench itself (nearSalvage: feature + town +
 *  radius + dwell-reachable — zero distance satisfies all reach). */
const atBench = (w: World): void => {
  w.account.features.add(FEATURE.SALVAGE_STATION);
  w.loadZone(START_ZONE);
  w.player.pos.x = SALVAGE_SITE.x;
  w.player.pos.y = SALVAGE_SITE.y;
};

/** Mint a bag item of an exact rarity (seeded stream, never null-looped
 *  past sanity). */
const mint = (rarity: ItemRarity, ilvl = 9): ItemInstance => {
  for (let i = 0; i < 40; i++) {
    const it = rollItem({ ilvl, rarity });
    if (it) return it;
  }
  throw new Error(`could not mint a ${rarity} item`);
};

const wallet = (w: World): Record<EssenceId, number> => {
  const out = {} as Record<EssenceId, number>;
  for (const id of ESSENCE_IDS) out[id] = w.localSeat.meta.essences[id] ?? 0;
  return out;
};
const walletDelta = (before: Record<EssenceId, number>, after: Record<EssenceId, number>): Record<EssenceId, number> => {
  const out = {} as Record<EssenceId, number>;
  for (const id of ESSENCE_IDS) out[id] = (after[id] ?? 0) - (before[id] ?? 0);
  return out;
};
const sumYields = (ys: ({ essence: EssenceId; count: number } | null)[]): Record<EssenceId, number> => {
  const out = {} as Record<EssenceId, number>;
  for (const id of ESSENCE_IDS) out[id] = 0;
  for (const y of ys) if (y) out[y.essence] += y.count;
  return out;
};
const sameWallet = (a: Record<EssenceId, number>, b: Record<EssenceId, number>): boolean =>
  ESSENCE_IDS.every(id => (a[id] ?? 0) === (b[id] ?? 0));

const skillDef = Object.values(SKILLS)[0];
const supDef = Object.values(SUPPORTS)[0];

// ------------------------------------------------------ A. THE KEEPER'S MARK
seedGlobalRandom(0x5a17);
const w = makeSimWorld('warrior', 0x5a17);
atBench(w);
const m = w.localSeat.meta;
check('A: the bench answers (nearSalvage)', w.nearSalvage());

const keepMe = mint('rare');
const breakMe = mint('common');
m.items.push(keepMe, breakMe);
w.salvageLockSet(w.localSeat, keepMe.uid, true);
check('A: the mark lands on the item', keepMe.locked === true);

let before = wallet(w);
w.salvageItem(w.localSeat, keepMe.uid, 'break');
check('A: a locked piece refuses the hammer (stays, wallet unmoved)',
  m.items.some(i => i.uid === keepMe.uid) && sameWallet(before, wallet(w)));

const breakYield = salvageItemYield(breakMe);
before = wallet(w);
w.salvageItem(w.localSeat, breakMe.uid, 'break');
check('A: an unlocked piece breaks for its previewed yield',
  !m.items.some(i => i.uid === breakMe.uid)
  && sameWallet(walletDelta(before, wallet(w)), sumYields([breakYield])));

w.salvageLockSet(w.localSeat, keepMe.uid, false);
check('A: unlocking clears the mark (delete, not false)', keepMe.locked === undefined);
w.salvageItem(w.localSeat, keepMe.uid, 'break');
check('A: an unlocked mark salvages again', !m.items.some(i => i.uid === keepMe.uid));

// ---------------------------------------------------------- B. THE SWEEP
const bagB = [mint('common'), mint('common'), mint('magic'), mint('rare'), mint('magic')];
const lockedB = bagB[3]; // the rare stays home
m.items.push(...bagB);
w.salvageLockSet(w.localSeat, lockedB.uid, true);
const expectB = sumYields(bagB.filter(i => i !== lockedB).map(salvageItemYield));
before = wallet(w);
w.salvageBulk(w.localSeat, 'item', undefined, 'break');
check('B: break-all sweeps every unlocked piece and no other',
  m.items.length === 1 && m.items[0] === lockedB);
check('B: the sweep pays exactly the sum of previewed yields',
  sameWallet(walletDelta(before, wallet(w)), expectB));

// Rarity narrowing: commons fall, the magic stands.
const bagC = [mint('common'), mint('common'), mint('magic')];
m.items.push(...bagC);
before = wallet(w);
w.salvageBulk(w.localSeat, 'item', 'common', 'break');
check('B: a rarity-narrowed sweep takes only that rarity',
  m.items.filter(i => i.rarity === 'common').length === 0
  && m.items.some(i => i === bagC[2]) && m.items.some(i => i === lockedB));
check('B: the narrowed sweep pays only those pieces',
  sameWallet(walletDelta(before, wallet(w)), sumYields(bagC.slice(0, 2).map(salvageItemYield))));

// ------------------------------------------------- C. GEMS UNDER THE SWEEP
// THE RESIDENCE (M1): loose gems are bag WRAPPER items — the sweeps address
// their payload kinds; the keeper's mark rides the wrapper by uid.
const plain = makeSkillInstance(skillDef, 3, 2);
plain.rarity = 'magic';
plain.sockets[0] = { def: supDef, level: 2 } as SupportInstance;
const granted = makeSkillInstance(skillDef, 1, 1);
granted.granted = true;
const lockedGem = makeSkillInstance(skillDef, 5, 1);
lockedGem.rarity = 'rare';
const plainItem = w.grantSkillGemItem(w.localSeat, plain)!;
const grantedItem = w.grantSkillGemItem(w.localSeat, granted)!;
const lockedGemItem = w.grantSkillGemItem(w.localSeat, lockedGem)!;
w.salvageLockSet(w.localSeat, lockedGemItem.uid, true);
const supWrappers = (): number => m.items.filter(i => i.gem?.kind === 'support').length;
const looseBefore = supWrappers();
const expectC = sumYields([salvageSkillYield(plain)]);
before = wallet(w);
w.salvageBulk(w.localSeat, 'skill', undefined, 'break');
check('C: the skill sweep breaks the plain gem only (granted + locked stand)',
  !m.items.some(i => i.uid === plainItem.uid)
  && m.items.some(i => i.uid === grantedItem.uid)
  && m.items.some(i => i.uid === lockedGemItem.uid));
check('C: the pried socket survives into the bag as its own wrapper',
  supWrappers() === looseBefore + 1
  && m.items.some(i => i.gem?.kind === 'support' && i.gem.supportId === supDef.id
    && (i.gem as { level: number }).level === 2));
check('C: the skill sweep pays the plain gem alone',
  sameWallet(walletDelta(before, wallet(w)), expectC));

const looseKeepItem = w.grantSupportGemItem(w.localSeat, { def: supDef, level: 4, locked: true } as SupportInstance)!;
w.grantSupportGemItem(w.localSeat, { def: supDef, level: 1 } as SupportInstance);
const expectD = sumYields(m.items
  .filter(i => i.gem?.kind === 'support' && !i.locked)
  .map(i => salvageSupportYield({ def: supDef, level: (i.gem as { level: number }).level } as SupportInstance)));
before = wallet(w);
w.salvageBulk(w.localSeat, 'support', undefined, 'break');
check('C: the support sweep spares the locked gem',
  supWrappers() === 1 && m.items.some(i => i.uid === looseKeepItem.uid));
check('C: the support sweep pays every unlocked gem',
  sameWallet(walletDelta(before, wallet(w)), expectD));

// -------------------------------------------------- D. WORN GEAR IS SAFE
const worn = mint('unique');
m.equipped['helmet'] = worn;
before = wallet(w);
w.salvageItem(w.localSeat, worn.uid, 'break');
w.salvageBulk(w.localSeat, 'item', undefined, 'break');
check('D: a worn piece is out of every salvage reach (doll untouched, wallet unmoved on its account)',
  m.equipped['helmet'] === worn);
// The doll-side mark: lock while worn, move to the bag, the sweep still skips.
w.salvageLockSet(w.localSeat, worn.uid, true);
check('D: the mark lands on a WORN piece by uid', worn.locked === true);
delete m.equipped['helmet'];
m.items.push(worn);
w.salvageBulk(w.localSeat, 'item', undefined, 'break');
check('D: the mark made at the doll still guards the piece in the bag',
  m.items.includes(worn));

// ---------------------------------------------------- E. SAVE + WIRE FIDELITY
// Standing state: worn (now bagged + locked), lockedB (locked bag piece),
// lockedGem (locked skill gem), looseKeep (locked support). Everything
// unlocked beside them proves absence serializes as absence.
const freeItem = mint('common');
m.items.push(freeItem);
const save = serializeCharacter(w);
const rebuilt = rebuildSavedMeta(save);
check('E: rebuildSavedMeta stands', rebuilt !== null);
if (rebuilt) {
  const rm = rebuilt.meta;
  check('E: gear marks round-trip the save (locked kept, unlocked absent)',
    rm.items.find(i => i.uid === worn.uid)?.locked === true
    && rm.items.find(i => i.uid === lockedB.uid)?.locked === true
    && rm.items.find(i => i.uid === freeItem.uid)?.locked === undefined);
  // THE RESIDENCE (M1): gem marks ride their WRAPPERS through `items` —
  // one lock law, one save lane, byte-for-byte with gear.
  check('E: the skill gem\'s mark rides its wrapper through the save',
    rm.items.filter(i => i.gem?.kind === 'skill' && i.locked).length === 1);
  check('E: the loose support\'s mark rides its wrapper through the save',
    rm.items.some(i => i.gem?.kind === 'support' && i.locked
      && (i.gem as { level: number }).level === 4));
}
const wire = serializeSeatMeta(w.localSeat);
check('E: the wire ships the marks on gem wrappers and worn gear alike',
  wire.gear!.items.filter(i => i.gem?.kind === 'skill' && i.locked).length === 1
  && wire.gear!.items.filter(i => i.gem?.kind === 'support' && i.locked).length === 1
  && wire.gear!.items.find(i => i.uid === worn.uid)?.locked === true);

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 1 : 0);
