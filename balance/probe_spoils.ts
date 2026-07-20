// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SPOILS LAW (ZoneDef.spoils: 'none') end to end. Pins:
//   - THE SEAL: on sealed ground a credited kill mints NOTHING — no boss
//     tables (pit_lord's guaranteed gems), no elite spill, no carried gear,
//     no vestige trickle, no essence purse (and "the purse bursts!" never
//     lies) — with every kill-path chance gate FORCED to 1,
//   - XP IS NOT SPOILS: the same sealed kills still pay experience (and the
//     '+xp' float still announces it),
//   - MOVEMENT & OWED ALWAYS PASS: player discards (droppedBy), corpse-owed
//     gear returns (owed), quest-style owed gem pay, dropFromInventory, and
//     a looter's snatched sack spilling back on death all land on sealed
//     ground; plain mints (gems/gear/vestiges/essences/amalgam part spoils)
//     refuse,
//   - THE CONTROL: identical ground without the law mints normally through
//     every primitive and the same boss kill,
//   - THE DOOR SAYS SO: entering sealed ground floats the no-spoils notice
//     (and the control zone stays silent),
//   - THE PIT WEARS IT: the registered pit_entrance sidezone mints its arena
//     level-scaled (levelWith 'character') AND sealed (spoils: 'none') —
//     the XP farm that is deliberately not the gear farm.
// Run: npx tsx balance/probe_spoils.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { ZONES, START_ZONE, type ZoneDef } from '../src/data/zones';
import { SIDEZONES } from '../src/data/sidezones';
import { DROP_CFG } from '../src/engine/loot';
import { rollItem } from '../src/engine/itemgen';
import { VESTIGE_LIST } from '../src/data/vestiges';
import { ESSENCES } from '../src/data/essences';
import { SKILLS } from '../src/data/skills';
import { CLASSES } from '../src/data/classes';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x5b0115);

// ---------------------------------------------------------------- the ground
const PROBE_LEVEL = 12;
const mkGround = (id: string, spoils?: 'none'): ZoneDef => ({
  id, name: id, level: PROBE_LEVEL,
  size: { w: 1400, h: 1000 },
  theme: {
    floor: '#101010', grid: '#181818', border: '#3a3a3a',
    obstacle: '#2a2a2a', obstacleEdge: '#444444', accent: '#888888',
  },
  seed: 0x7a55, layout: [],
  objective: { kind: 'safe' },
  exits: [],
  map: { x: 9400, y: 9400 },
  ...(spoils ? { spoils } : {}),
});
ZONES['probe_spoils_sealed'] = mkGround('probe_spoils_sealed', 'none');
ZONES['probe_spoils_open'] = mkGround('probe_spoils_open');

const w = makeSimWorld(CLASSES[0].id, 0xd1ce) as World;
const W = w as unknown as {
  drops: unknown[];
  texts: { text: string }[];
  meta: { xp: number };
  localSeat: unknown;
  createMonster(defId: string, level: number, team: string): Actor;
  actors: Actor[];
  dropAmalgamPart(af: unknown, partId: string, at: { x: number; y: number }): void;
  rollSkillGem(): unknown;
};

// Force every kill-path CHANCE gate wide open: on sealed ground even a
// certain drop must refuse; on open ground the same certainty must land.
const saved = { item: DROP_CFG.killItemChance, gem: DROP_CFG.killGemChance, vest: DROP_CFG.vestigeChance };
DROP_CFG.killItemChance = 1;
DROP_CFG.killGemChance = 1;
DROP_CFG.vestigeChance = 1;

const at = () => ({ x: w.player.pos.x, y: w.player.pos.y });
const slay = (defId: string, rig?: (m: Actor) => void): void => {
  const m = W.createMonster(defId, PROBE_LEVEL, 'enemy');
  m.pos.x = w.player.pos.x + 60;
  m.pos.y = w.player.pos.y;
  W.actors.push(m);
  rig?.(m);
  w.kill(m, false, w.player);
};
const fakeAmalgamField = { partById: () => ({ drop: { skill: Object.keys(SKILLS)[0], gems: 0 } }) };

// ============================================================ sealed ground
w.loadZone('probe_spoils_sealed');
check('THE DOOR SAYS SO: sealed entry floats the no-spoils notice',
  W.texts.some(t => t.text.includes('keeps no spoils')));

const xp0 = W.meta.xp;
slay('pit_lord'); // boss: guaranteed gem drops + boss table — all must refuse
slay('pit_mauler', m => { m.rarity = 'crowned'; }); // elite bonus rolls + rarity gem spill
slay('gilded_hoarder'); // the essence purse — deathBurst must stay silent
slay('pit_mauler', m => {
  m.carriedGear = rollItem({ ilvl: PROBE_LEVEL, rarity: 'rare' }) ?? undefined;
});
check('THE SEAL: forced-certain kills (boss + crowned + purse + carried gear) mint zero drops',
  W.drops.length === 0, `drops=${W.drops.length}`);
check('XP IS NOT SPOILS: the same sealed kills paid experience',
  W.meta.xp > xp0, `xp ${xp0} -> ${W.meta.xp}`);
check('…and the +xp float still announces it',
  W.texts.some(t => /\+\d+ xp/.test(t.text)));
check('THE HONEST FLOAT: no "purse bursts!" on ground where no packet can land',
  !W.texts.some(t => t.text.includes('purse bursts')));

// Primitives refuse plain mints…
const n0 = W.drops.length;
w.dropGemAt(at());
w.dropVestigeAt(at(), VESTIGE_LIST[0]!.id);
w.dropEssenceAt(at(), { essence: Object.keys(ESSENCES)[0] as never, count: 2 });
const gearMint = rollItem({ ilvl: PROBE_LEVEL });
if (gearMint) w.dropGearAt(at(), gearMint);
W.dropAmalgamPart(fakeAmalgamField, 'any', at());
check('THE PRIMITIVES REFUSE: gem/vestige/essence/gear/amalgam mints all sealed',
  W.drops.length === n0, `drops ${n0} -> ${W.drops.length}`);

// …while OWED pay and OWNED movement always pass.
let n = W.drops.length;
w.dropGemAt(at(), undefined, true);
check('OWED gem pay (quest-style) lands on sealed ground', W.drops.length === n + 1);
n = W.drops.length;
const owedGear = rollItem({ ilvl: PROBE_LEVEL });
if (owedGear) w.dropGearAt(at(), owedGear, undefined, true);
check('OWED gear (corpse reclaim lane) lands on sealed ground', W.drops.length === n + 1);
n = W.drops.length;
const discard = rollItem({ ilvl: PROBE_LEVEL });
if (discard) w.dropGearAt(at(), discard, 'seat_probe');
check('OWNED discard (droppedBy) lands on sealed ground', W.drops.length === n + 1);
n = W.drops.length;
const seat = W.localSeat as { meta: { skillInv: unknown[] } };
seat.meta.skillInv.push(W.rollSkillGem());
w.dropFromInventory(W.localSeat as never, 'skill', seat.meta.skillInv.length - 1);
check('OWNED dropFromInventory lands on sealed ground', W.drops.length === n + 1);
n = W.drops.length;
const snatched = rollItem({ ilvl: PROBE_LEVEL });
slay('pit_mauler', m => {
  m.lootSack = snatched ? [{ kind: 'gear', item: snatched } as never] : [];
});
check('GRIEF-PROOF: a looter\'s snatched sack spills back even on sealed ground',
  W.drops.length === n + 1, `drops ${n} -> ${W.drops.length}`);

// ============================================================== open control
w.loadZone('probe_spoils_open');
check('THE CONTROL DOOR: open ground floats no notice',
  !W.texts.some(t => t.text.includes('keeps no spoils')));
slay('pit_lord');
check('THE CONTROL: the same boss kill on open ground mints drops',
  W.drops.length >= 2, `drops=${W.drops.length}`);
n = W.drops.length;
w.dropGemAt(at());
w.dropVestigeAt(at(), VESTIGE_LIST[0]!.id);
w.dropEssenceAt(at(), { essence: Object.keys(ESSENCES)[0] as never, count: 2 });
const ctrlGear = rollItem({ ilvl: PROBE_LEVEL });
if (ctrlGear) w.dropGearAt(at(), ctrlGear);
W.dropAmalgamPart(fakeAmalgamField, 'any', at());
check('THE CONTROL PRIMITIVES: gem/vestige/essence/gear/amalgam all mint openly',
  W.drops.length === n + 5, `drops ${n} -> ${W.drops.length}`);

// ============================================================ the Pit wears it
const pitSz = SIDEZONES['pit_entrance'];
check('the pit_entrance sidezone is registered', !!pitSz);
if (pitSz) {
  const def = pitSz.mint({
    parent: ZONES[START_ZONE], seed: 0xbeef, id: 'probe_pit_zone',
    pos: { x: 0, y: 0 }, playerLevel: 41, pkgActive: () => true,
  });
  check('THE PIT WEARS THE LAW: minted arena carries spoils \'none\'', def.spoils === 'none');
  check('…and still level-scales to the entering hero', def.level === 41, `level=${def.level}`);
  check('…as the endless wave arena it declares', def.objective.kind === 'waves');
}

DROP_CFG.killItemChance = saved.item;
DROP_CFG.killGemChance = saved.gem;
DROP_CFG.vestigeChance = saved.vest;

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 1 : 0);
