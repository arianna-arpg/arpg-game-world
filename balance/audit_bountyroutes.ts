import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { bountyRoutes } from '../src/world/bountyRoutes';
import { FEATURE } from '../src/meta/account';

const count = Number(process.argv[2] ?? 20);
const levels = (process.argv.find(x=>x.startsWith('--levels='))?.slice(9) ?? '1').split(',').map(Number);
if (!Number.isSafeInteger(count) || count < 1 || levels.some(n=>!Number.isSafeInteger(n)||n<1)) throw new Error('Invalid audit arguments');
let offers = 0, unreachable = 0, manageable = 0, empty = 0;
for (const level of levels) for (let seed = 1; seed <= count; seed++) {
  seedGlobalRandom(seed);
  const w = makeSimWorld('warrior', seed);
  w.account.features.add(FEATURE.BOUNTY_BOARD);
  w.loadZone('crossroads'); w.completedObjectives.add('crossroads'); w.loadZone('lastlight');
  w.player.level = level;
  w.armBountyBoard();
  const routes = bountyRoutes(w, 'lastlight', {maxLevel: level, maxSteps: 6, maxDistance: 650});
  const any = bountyRoutes(w, 'lastlight', {maxLevel: level+4, maxSteps: 12, maxDistance: 1500});
  let good = 0;
  for (const p of w.bountyOffers) {
    offers++;
    const target = p.expedition?.anchor ?? p.zoneId;
    if (w.bountyAppropriate(p,routes)) good++;
    if (!any.has(target)) unreachable++;
  }
  if (good) manageable++; else empty++;
  console.log(JSON.stringify({seed, level, good, offers:w.bountyOffers.map(p=>({kind:p.kind,zone:p.zoneId,
    level:p.challengeLevel ?? p.expedition?.level ?? w.zoneMap[p.zoneId]?.level,reward:p.pay.level,
    route:routes.get(p.expedition?.anchor ?? p.zoneId)?.path}))}));
}
console.log(JSON.stringify({count:count*levels.length,levels,offers,unreachable,manageable,empty}));
if (empty || unreachable) process.exitCode=1;
