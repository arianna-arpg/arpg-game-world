import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { START_ZONE } from '../src/data/zones';
import { TOWN_PORTAL_CFG } from '../src/data/townportals';
import { SHRINES } from '../src/data/shrines';
import { FIXTURE_IDS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { makeSkillGem, hostSockets, supportFits, supportFitsInstOrCrew } from '../src/engine/skills';
import { SUPPORTS } from '../src/data/supports';
import { PASSIVE_NODES } from '../src/data/passives';
import { angleDiff, dist } from '../src/core/math';
import { mod } from '../src/engine/stats';
import { SIM_TAP } from '../src/engine/tap';
import { captureZoneContents } from '../src/engine/zonecontents';
import type { World } from '../src/engine/world';
let failures = 0;
const check = (name: string, ok: boolean): void => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failures++; };
const tick = (w: World, sec: number): void => { for (let t = 0; t < sec; t += 1 / 60) w.update(1 / 60); };
const portalTick = (w: World, sec: number): boolean =>
  (w as unknown as { updateTownPortals(dt: number): boolean }).updateTownPortals(sec);
const linger = (w: World): void => {
  const v = w.townPortalViews()[0];
  if (!v) throw new Error('Expected visible portal');
  w.player.pos = { x: v.pos.x + 150, y: v.pos.y }; portalTick(w, 0);
  w.player.pos = { ...v.pos }; w.player.push = null; w.player.casting = null;
  w.localSeat.lastActedAt = -100;
  portalTick(w, TOWN_PORTAL_CFG.dwellSeconds + 0.1);
};
seedGlobalRandom(7421);
const w = makeSimWorld('warrior', 7421);
w.zone.objective = { kind: 'clear', all: true };
const source = w.zone.id;
// Keep the combat floor occupied; no AI runs in this controlled fixture.
const cache = w.createMonster(FIXTURE_IDS.gem_cache, 1, 'enemy');
cache.fromZoneGen = true; cache.pos = { x: 200, y: 200 }; w.actors.push(cache);
const survivor = w.createMonster('skeleton_warrior', 1, 'enemy');
survivor.fromZoneGen = true; survivor.pos = { x: 250, y: 200 }; survivor.life = 17; w.actors.push(survivor);
w.chests = [{ pos: { x: 300, y: 300 }, kind: 'timed', mimic: false, opened: true, lockTime: 0, maxLock: 3 }];
w.shrines = [{ pos: { x: 400, y: 300 }, def: SHRINES[0], used: true }];
w.drops = [{ pos: { x: 420, y: 310 }, bob: 0, item: { kind: 'skill', inst: makeSkillGem(SKILLS.cleave, 1, 'common') } }];
cache.dead = true;
w.player.pos = { x: 700, y: 600 };
const origin = { ...w.player.pos };
const heading = -3 * Math.PI / 4;
w.player.facing = heading;
const def = SKILLS[TOWN_PORTAL_CFG.skillId];
const portalGem = makeSkillGem(def, 1, 'common');
const echo = { def: SUPPORTS.spell_echo, level: 1 };
portalGem.sockets = [echo];
portalGem.grafts = [echo];
check('socket, crew and graft paths all respect the portal support policy',
  !supportFits(echo.def, def) && !supportFitsInstOrCrew(echo.def, portalGem, 'unknowable')
  && hostSockets(portalGem).length === 0);
const bolt = makeSkillGem(SKILLS.firebolt, 1, 'common');
const selective = { ...bolt, def: { ...bolt.def, castPolicy: { supports: { exclude: [echo.def.id] } } },
  sockets: [echo, { def: SUPPORTS.potency, level: 1 }] };
check('a selective exclusion leaves other compatible supports active',
  hostSockets(selective).length === 1 && hostSockets(selective)[0].def === SUPPORTS.potency
  && !supportFitsInstOrCrew(echo.def, selective, null));
w.player.sheet.setSource('portal-probe', [...(PASSIVE_NODES.cl_pri_page.mods ?? []), mod('moveTrail', 'flat', 1)]);
w.player.skills.push(makeSkillGem(SKILLS.invocation, 1, 'common'));
const casts: string[] = [];
const prior = SIM_TAP.current;
SIM_TAP.current = { onCast: (caster, inst) => { if (caster === w.player) casts.push(inst.def.id); } };
try {
  check('an interruptible portal cast starts', w.castTownPortal());
  w.player.applyStatus('stun', 0, 0.3, 'portal probe');
  tick(w, 0.6);
  check('stun interrupts before a portal opens', !w.player.casting && !w.townPortals.length && !casts.includes(def.id));
  check('cast starts with the ordinary windup and retains the diagonal heading',
    w.castTownPortal() && w.player.casting?.inst.def === def && w.townPortals.length === 0
    && Math.abs(angleDiff(w.player.facing, heading)) < 1e-8);
  tick(w, 0.2);
  check('the windup holds facing and refuses a second press',
    !!w.player.casting && !w.castTownPortal() && Math.abs(angleDiff(w.player.facing, heading)) < 1e-8);
  tick(w, TOWN_PORTAL_CFG.castSeconds - 0.1);
  check('release starts the ordinary cooldown', (w.player.cooldowns.get(def.id) ?? 0) > 0 && !w.castTownPortal());
  tick(w, 1.2);
  const expected = w.findFreeSpot({ x: origin.x + Math.cos(heading) * TOWN_PORTAL_CFG.spawnOffset,
    y: origin.y + Math.sin(heading) * TOWN_PORTAL_CFG.spawnOffset }, 18, w.player.tier ?? 0);
  check('one execution with Restless Page, one forward endpoint, and no combat trail',
    casts.filter(id => id === def.id).length === 1 && !!w.townPortals[0]
    && dist(w.townPortals[0].sourcePos, expected) < 1e-8
    && Math.abs(angleDiff(w.player.facing, heading)) < 1e-8 && !('walkTrail' in w.player));
  check('Town Portal does not fuel Invocation', w.player.runes.length === 0);
  check('ordinary spells still echo with the same keystone', w.useSkill(w.player, bolt, expected, true));
  tick(w, 2);
  check('Firebolt echoed and fueled Invocation once', casts.filter(id => id === bolt.def.id).length === 2
    && w.player.runes.length === 1);
} finally {
  SIM_TAP.current = prior;
  w.player.sheet.removeSource('portal-probe');
}
check('cast makes one owned portal without spending a gem', w.townPortals.length === 1 && w.townPortals[0].owner === w.localSeat.id);
check('dwell requires being near the portal', !portalTick(w, 2) && w.zone.id === source);
const before = captureZoneContents(w);
const survivorLife = survivor.life;
linger(w);
check('outbound dwell travels to configured town', w.zone.id === TOWN_PORTAL_CFG.destination);
check('arrival cannot instantly bounce back', !portalTick(w, 2) && w.zone.id === START_ZONE);
const door = w.doodads.find(d => d.door);
check('town has an actual door fixture', !!door?.door);
if (door?.door) w.setDoorState(door.door.id, 'open', { silent: true });
const doorId = door?.door?.id;
const saved = JSON.parse(JSON.stringify(w.serializeWorldState()));
w.time += 3600;
w.player.life = w.player.maxLife();
linger(w);
check('return lands at casting position', w.zone.id === source && Math.hypot(w.player.pos.x - origin.x, w.player.pos.y - origin.y) < 1);
check('used portal is consumed by configurable return policy', w.townPortals.length === 0);
check('dead cache stays dead beyond old expiry', !w.actors.some(a => a.defId === FIXTURE_IDS.gem_cache && !a.dead));
check('survivor health persists', w.actors.some(a => a.defId === survivor.defId && a.life === survivorLife));
check('opened chest and used shrine persist', w.chests[0]?.opened && w.shrines[0]?.used);
check('uncollected gem survives return', JSON.stringify(captureZoneContents(w).drops) === JSON.stringify(before.drops));
w.drops = []; w.loadZone(START_ZONE); w.loadZone(source);
check('picked-up loot does not reappear', w.drops.length === 0);
w.loadZone(START_ZONE);
check('town door remains open after leaving and re-entering', !!w.doodads.find(d => d.door?.id === doorId)?.door?.open);

const resumed = makeSimWorld('warrior', 9921);
check('town-side save adopts', resumed.adoptWorldState(saved));
resumed.resumeSpawn('exact', saved.player);
check('town endpoint survives save/load', resumed.townPortalViews().length === 1);
linger(resumed);
check('saved portal returns to same spent contents', resumed.zone.id === source && resumed.chests[0]?.opened && resumed.shrines[0]?.used);
resumed.loadZone(START_ZONE);
check('saved town door is open', !!resumed.doodads.find(d => d.door?.id === doorId)?.door?.open);
resumed.refreshZones();
check('campfire clears return passages', resumed.townPortals.length === 0);
check('campfire preserves town doors', !!resumed.doodads.find(d => d.door?.id === doorId)?.door?.open);
resumed.loadZone(source);
check('campfire refreshes spent chest state', !resumed.chests.some(c => c.opened));

// Nested cave route uses the same saved ladder as exact resume.
const enter = (seed: number): void => (resumed as unknown as {
  enterSidezone(cm: { pos: { x: number; y: number }; seed: number; kind: string }): void;
}).enterSidezone({ pos: { ...resumed.player.pos }, seed, kind: 'cave_entrance' });
enter(4242); enter(777);
const cave = resumed.zone.id;
resumed.player.cooldowns.clear(); resumed.player.useLock = 0;
check('portal can cast in a stable nested sidezone', resumed.castTownPortal());
tick(resumed, 2);
linger(resumed); linger(resumed);
check('round trip rebuilds the nested cave route', resumed.zone.id === cave && !!resumed.caveReturn);
resumed.zone.townPortals = false;
check('authored sealed zones refuse portal casts', !resumed.castTownPortal());
process.exitCode = failures ? 1 : 0;
