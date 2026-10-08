import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { mulberry32, seedGlobalRandom } from '../src/sim/rng';
import { Actor, resetActorIdCounter, type Team } from '../src/engine/actor';
import { monsterSkillLevelOf } from '../src/engine/world';
import { MONSTERS, defDensity, defBreathes } from '../src/data/monsters';
import { vec } from '../src/core/math';
import { rand, chance } from '../src/core/math';
import { mod } from '../src/engine/stats';
import { sympathyStat } from '../src/engine/sympathy';
import { tellSpecsOf } from '../src/engine/tells';
import { DEFENSE_CFG } from '../src/engine/defense';
import { squishSpecOf } from '../src/engine/squish';
import { makeReserve } from '../src/engine/reserves';
import { rollStartTone, attunedStatus, TUNE_CFG } from '../src/engine/tuning';
import { rollItem, nextItemUid } from '../src/engine/itemgen';
import { monsterTurnSpeed } from '../src/engine/handling';
import { makeSkillInstance, validTreeNodes } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { CHOICE_GROUPS } from '../src/data/passiveChoices';
import { plyCountOf } from '../src/engine/plies';
import { coopScale } from '../src/data/coop';
import { serializeAccount, questDoneKey } from '../src/meta/account';
import { BRANDT_HAMMER_QUEST } from '../src/data/brandt';
import { MERC_CFG } from '../src/meta/mercs';
import { captureNativeActorState } from '../src/worldmass/dormancy';
import { createNativeMonster, stampNativeMonsterLevel, armNativeMonsterAmbush,
  type NativeMonsterFactoryHost, type NativeMonsterFactorySources } from '../src/engine/nativeMonsterFactory';

const ORIGINAL = {"revision":"8dcfa9e1accb1d9fa90dc9e65416513e354befbe","worldSHA256":"67d4fa4c23011c6ce4d684f3b218c17712f6fd3aaa8227c7c98b6b09f8b1bdfc","methodsSHA256":"85a919627a55d52c414995f995d5ab74b379a6315a6ebc49eaf90b009c348821","methods":{"createMonster":"createMonster(defId: string, level: number, team: Team, owner?: Actor, spawn?: { scale?: number }): Actor {\n    const def: MonsterDef = MONSTERS[defId];\n    const a = new Actor(def.name, team, vec(0, 0));\n    a.statusRelay = this.relayStatus;\n    a.defId = defId;\n    // THE GUN CENSUS: a bombard-wearing mint re-keys updateBombardment's\n    // presence flag the same frame — the one signal a push can't carry.\n    if (def.bombard) this.bombardMintRev++;\n    a.color = def.color;\n    a.shape = def.shape;\n    a.radius = def.radius;\n    a.level = level;\n    a.invulnerable = !!def.invulnerable;\n    a.untargetable = !!def.untargetable;\n    a.levitates = !!def.levitates;\n    for (const [stat, value] of Object.entries(def.base)) a.sheet.setBase(stat, value);\n    // Innate mods + an optional per-monster detection multiplier (one source).\n    const innate = def.mods ? [...def.mods] : [];\n    if (def.detection !== undefined && def.detection !== 1) {\n      innate.push(mod('detectionRange', 'more', def.detection - 1));\n    }\n    // Born-with SYMPATHY LINKS fold as potency-1 stats through the same\n    // innate source — the fabric reads monsters and players identically.\n    if (def.sympathy) {\n      for (const link of def.sympathy) innate.push(mod(sympathyStat(link), 'flat', 1));\n    }\n    if (innate.length) a.sheet.setSource('innate', innate);\n    // THE LATCH (engine/cling.ts): any monster can be a clinger — stamped\n    // at mint so summons, claims and wild spawns all wear it identically.\n    if (def.cling) a.cling = def.cling;\n    // THE GRAB FABRIC's victim-side policy override (engine/grab.ts):\n    // per-body word over the rarity tiers — the Winter King is never\n    // luggage; a fat unique toad may opt back in.\n    if (def.grabbable !== undefined) a.grabbable = def.grabbable;\n    // ROOTED BODIES (the siegebreaker lane, damage.ts): a def that cannot\n    // walk is a STRUCTURE to the slayer fold — stamped at mint like cling,\n    // so summons, spawner objects and wild engines all wear it identically.\n    if (def.base.moveSpeed === 0) a.stationary = true;\n    // THE PLY FABRIC (engine/plies.ts): hit-counted durability stamped at\n    // mint — the life pool underneath stays authored and fully live.\n    // THE LEVEL STAMP (stampMonsterLevel — ONE fold): plies, the baseline\n    // growth source, opt-in per-stat scaling and the boss poise pool, shared\n    // with the in-place relevel a growing bond rides (relevelActor). A fresh\n    // mint stands at full plies.\n    const lv = level - 1;\n    this.stampMonsterLevel(a, def, level);\n    a.plies = a.pliesMax;\n    // CO-OP: scale HOSTILE monsters (never player-side minions) by the live party\n    // size. coopScale returns 0 at 1 player ⇒ the source is never set ⇒ single-\n    // player identical. Lands in starting life via fillResources() below.\n    if (team === 'enemy' && !owner) this.applyPartyScale(a);\n    if (owner) {\n      a.owner = owner;\n      a.kind = 'minion';\n      // Minions inherit the owner's minion-scaling stats as multipliers.\n      a.sheet.setSource('owner', [\n        mod('damage', 'more', owner.sheet.get('minionDamage') - 1),\n        mod('life', 'more', owner.sheet.get('minionLife') - 1),\n      ]);\n    }\n    // Behavior & body plan from the definition. BRAIN VARIANTS roll a\n    // per-spawn PERSONALITY (pack-runner / loner / tide-cycler from one def)\n    // — the same body, a different mind each time it walks in.\n    a.brain = def.brain;\n    if (def.brainVariants?.length) {\n      let total = 0;\n      for (const v of def.brainVariants) total += v.weight;\n      let roll = rand(0, total);\n      for (let vi = 0; vi < def.brainVariants.length; vi++) {\n        const v = def.brainVariants[vi];\n        roll -= v.weight;\n        if (roll <= 0) { a.brain = v.brain; a.brainVariant = vi; break; }\n      }\n    }\n    // THE TELL FABRIC (engine/tells.ts): the binding list this body wears —\n    // def rows + the rolled temperament's rows. Stamped once; the sweep\n    // (updateTells) and the renderer both read it. Undefined = null-cost.\n    a.tellSpecs = tellSpecsOf(def, a.brainVariant);\n    // THE WATCH FABRIC (engine/watch.ts): the ladder posture, stamped the\n    // same way — undefined keeps every gate/sweep/draw hook null-cost.\n    a.watch = def.watch;\n    // Def-level role tag (ambient wildlife etc.) — spawners may still\n    // overwrite it for event roles (patrols, sieges).\n    if (def.tag) a.tag = def.tag;\n    // DUTY POST (brain.ts PostSpec), the def-level lane: every spawn of this\n    // def keeps a station — its first-tick anchor — walking back whenever\n    // idle drift, a shove or a gale strays it. Spawners stamp Actor.aiPost /\n    // postSpec directly for site-exact posts (a holdfast's gate crew).\n    if (def.post) a.postSpec = def.post === true ? {} : def.post;\n    a.passive = !!def.passive;\n    a.driven = !!def.driven; // engine-wheeled — movementLocked's passive lock stands aside\n\n    // aims:false — facing-is-noise bodies (data lever): no aim tick.\n    if (def.aims === false) a.aims = false;\n    if (def.spawnFacing !== undefined) a.facing = def.spawnFacing;\n    // SCALE VARIANCE: a herd reads as a mix of big adults and small young. Roll a\n    // per-spawn body-scale (sizing the body + — with scaleStats — its life/damage),\n    // and below the juvenile cut SWAP to the juvenile brain (the young flee, never\n    // gore). Harmless on any monster without the lever (no source set).\n    if (def.scaleVariance) {\n      const s = spawn?.scale !== undefined && Number.isFinite(spawn.scale) && spawn.scale > 0\n        ? spawn.scale : rand(def.scaleVariance[0], def.scaleVariance[1]);\n      a.spawnScale = s;\n      a.radius = def.radius * s;\n      if (def.scaleStats) a.sheet.setSource('scaleVar', [mod('life', 'more', s - 1), mod('damage', 'more', s - 1)]);\n      // THE YOUNG (engine/pack.ts): the roll is RECORDED, not merely acted\n      // on. Before this flag a juvenile was a one-way brain swap nothing\n      // could ask about afterwards — so the matriarch could not know whom\n      // she was guarding and the den could not show its young as young.\n      if (def.juvenileBelow !== undefined && s <= def.juvenileBelow) {\n        a.juvenile = true;\n        if (def.juvenileBrain) a.brain = def.juvenileBrain;\n      }\n    }\n    // WEIGHT defaults from the BODY: mass grows with the (post-variance)\n    // radius × the material's DENSITY (MATERIAL_NATURE — a knee-high iron\n    // thrall anchors, a man-high wisp flies from a slap) × the def's HEFT\n    // multiplier, unless the def brings its own base.weight — so the\n    // bestiary gets honest heft for free and any monster can still pin or\n    // scale it as data (engine/mass.ts; docs/engine/mass.md).\n    if (def.base.weight === undefined) {\n      a.sheet.setBase('weight',\n        Math.pow(a.radius / DEFENSE_CFG.weight.refRadius, DEFENSE_CFG.weight.radiusPow)\n        * defDensity(def) * (def.heft ?? 1));\n    }\n    // (Bosses hold their ground: the default poise pool — levels with them —\n    // is part of THE LEVEL STAMP above; rank-and-file keep the registry base,\n    // which ships EMPTY: poise is a defense TEXTURE a def authors, never\n    // ambience — a rabbit has none; a knight declares his.)\n    // BREATH: does this body tire? The material's nature (MATERIAL_NATURE,\n    // data/monsters.ts) with the def's own override — read once here so\n    // the AI's default-kite gate is a field test, not a registry walk.\n    a.breathes = defBreathes(def);\n    // Zone Memory: flag the zone's BASE population (spawned inside the tagging\n    // window in loadZone) so it can be snapshotted + restored on re-entry. Overlay\n    // and event spawns fall outside the window, so they stay live (untouched).\n    if (this.zoneGenTagging && team === 'enemy' && !owner) a.fromZoneGen = true;\n    // moveSpeed 0 in the DEF means rooted — the stat itself floors at 30,\n    // which is exactly how barrels learned to walk. Never again. Breakables\n    // (orbDrops) stay shovable; spawners, caches and townsfolk hold their ground.\n    a.anchored = (def.base.moveSpeed ?? 1) <= 0 && !def.orbDrops;\n    a.movementTetherSpec = def.movementTether;\n    a.faction = def.faction;\n    a.adorn = def.adorn;\n    a.material = def.material;\n    a.look = this.npcDialogues.appearanceFor(a.defId!) ?? def.look;\n    if (def.worm) {\n      a.worm = {\n        length: def.worm.length,\n        spacing: def.worm.spacing ?? def.radius * 1.1,\n        taper: def.worm.taper ?? 0.88,\n        segments: [],\n        // THE SEGMENT FABRIC (engine/segments.ts): hittable chains, wound\n        // states, kit-part looks — all data off the def, absent = legacy.\n        ...(def.worm.hittable ? { hittable: true } : {}),\n        ...(def.worm.looks ? { looks: def.worm.looks } : {}),\n        ...(def.worm.wounds ? { wounds: def.worm.wounds } : {}),\n      };\n    }\n    if (def.explodeOnDeath) a.explodeOnDeath = def.explodeOnDeath;\n    if (def.deathBurst) a.deathBurst = def.deathBurst;\n    if (def.refuge) a.refuge = def.refuge;\n    // THE SQUISH FABRIC (engine/squish.ts): normalized once at spawn — the\n    // tread sweep and the separation exemption read a field, never the registry.\n    const squishSpec = squishSpecOf(def);\n    if (squishSpec) a.squish = squishSpec;\n    if (def.habitat) a.habitat = def.habitat; // confine derives lazily (update sweep)\n    if (def.wake) a.wake = def.wake; // the body-wake odometer arms on first move\n    // THE RESERVES (engine/reserves.ts): the body arrives with its pools\n    // filled to their authored share — one live row per spec, minted here\n    // so EVERY spawn path (packs, events, zone-memory restores, summons)\n    // carries the same fuel economy.\n    if (def.reserves?.length) {\n      a.reserves = new Map(def.reserves.map(r => [r.id, makeReserve(r)]));\n      a.reserveSpecs = def.reserves;\n    }\n    if (def.rooted) a.rootedSpec = def.rooted; // the claim, stamped for the slayer fold\n    if (def.volatile) a.volatile = def.volatile; // the poked nest arms\n    if (def.onHitByType) { a.onHitByType = def.onHitByType; a.onHitTypeIcd = def.onHitTypeIcd; } // the body's element grammar\n    // TUNABLE (the attunement fabric): the body wakes in its ground state —\n    // or, for riddle hearts, a rolled one — and WEARS the tone from tick one.\n    if (def.tune) {\n      a.tune = def.tune;\n      a.tone = rollStartTone(def.tune, () => rand(0, 1));\n      a.applyStatus(attunedStatus(a.tone), 0, TUNE_CFG.holdScale, 'attunement');\n    }\n    // CARRIED GEAR (MonsterDef.carry — the Hollowborn): mint the real piece\n    // the body walks in wearing; its credited kill drops exactly this.\n    if (def.carry && (def.carry.chance === undefined || chance(def.carry.chance))) {\n      const worn = rollItem({\n        ilvl: Math.max(1, level),\n        ...(def.carry.rarity !== undefined ? { rarity: def.carry.rarity } : {}),\n        ...(def.carry.category !== undefined ? { category: def.carry.category } : {}),\n      });\n      if (worn) a.carriedGear = worn;\n    }\n    if (def.immuneGround) a.immuneGround = def.immuneGround; // the insured (lava natives)\n    if (def.pathCosts) a.pathCosts = def.pathCosts; // the wayfaring overrides (the magma worm's bath)\n    // ARMED AMBUSH (the ambush fabric): born as waiting scenery — the\n    // update sweep springs it on proximity, a wound springs it instantly.\n    if (def.ambush) this.armAmbush(a, def.ambush);\n    // SHELL GUARD worn as anatomy: the directional absorb, pool full at birth.\n    if (def.shellGuard) {\n      const sg = def.shellGuard;\n      a.shellGuard = {\n        side: sg.side, arcDeg: sg.arcDeg ?? 180,\n        max: sg.max, pool: sg.max,\n        regenDelay: sg.regenDelay ?? 4,\n        regenRate: sg.regenRate ?? sg.max / 6,\n        lastHitAt: -999, broken: false,\n        color: sg.color ?? '#c8b87a',\n        shellVisual: sg.shellVisual,\n        breathe: sg.breathe, // the tidal shell's opening rides along\n      };\n    }\n    // TURN SPEED: derive innate handling from anatomy unless explicitly\n    // authored. Seat control bypasses this innate rate at the steering seam.\n    a.turnSpeed = monsterTurnSpeed(def);\n    a.facingPrev = a.facing; // the first acquired target also pays the turn\n    if (def.flier) { a.flying = true; a.flyingBase = true; }\n    a.spawnedAt = this.time;\n    // Monsters' skills level up with them — same leveling system as the player.\n    const skillLevel = monsterSkillLevelOf(level);\n    a.skills = def.skills.map(id => makeSkillInstance(SKILLS[id], skillLevel));\n    // LEVEL-GATED GRANTS (MonsterGrant): once the monster is high enough, its kit\n    // evolves — gain a new skill, or socket a support into an existing one (riding\n    // the skill instances' default 3 sockets; the cast pipeline reads them).\n    if (def.grants) {\n      const supLevel = 1 + Math.floor(lv / 5);\n      for (const g of def.grants) {\n        if (level < g.atLevel) continue;\n        if (g.chance !== undefined && Math.random() >= g.chance) continue; // per-spawn variant roll\n        if (g.skill && SKILLS[g.skill]) a.skills.push(makeSkillInstance(SKILLS[g.skill], skillLevel));\n        if (g.support && SUPPORTS[g.support]) {\n          const target = g.on ? a.skills.find(s => s?.def.id === g.on) : a.skills[0];\n          if (target) {\n            const slot = target.sockets.findIndex(x => x === null);\n            if (slot >= 0) target.sockets[slot] = { def: SUPPORTS[g.support], level: supLevel };\n          }\n        }\n      }\n    }\n    // THE MONSTER PIN (skill-mode trees, M1): a kit may pin spent tree\n    // nodes per skill — the ONE validation seam applies (structure only;\n    // an authored pin is the def's warrant, no level budget), and every\n    // cast-path read resolves through the views, so the telegraph draws\n    // exactly what the resolve fires. Capability only: no def wears it yet.\n    if (def.skillTrees) {\n      for (const inst of a.skills) {\n        const pin = inst ? def.skillTrees[inst.def.id] : undefined;\n        if (inst && pin?.length) inst.treeNodes = validTreeNodes(inst.def, pin);\n      }\n    }\n    // BOONS (MonsterBoon): spawn-rolled options from the SAME choice pools\n    // the player's tree deals (data/passiveChoices.ts) — mods fold as a\n    // sheet source, an option's graft rides the first skill's graft lane\n    // (the player's mutator seam, verbatim). Attributes are player-pipeline\n    // payloads and deliberately skip the bestiary.\n    for (const b of def.boons ?? []) {\n      if (level < (b.minLevel ?? 1)) continue;\n      const group = CHOICE_GROUPS[b.group];\n      if (!group) continue;\n      if (b.chance !== undefined && Math.random() >= b.chance) continue;\n      const pool = [...group.options];\n      const picks = Math.min(Math.max(1, b.pick ?? 1), pool.length);\n      const mods: Modifier[] = [];\n      for (let i = 0; i < picks; i++) {\n        const opt = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];\n        if (opt.mods) mods.push(...opt.mods);\n        if (opt.graft && SUPPORTS[opt.graft.support] && a.skills[0]) {\n          (a.skills[0].grafts ??= []).push({ def: SUPPORTS[opt.graft.support], level: opt.graft.level ?? 1 });\n        }\n        // A boon-rolled WORN CONDUIT rides the same actor-level lane the\n        // player's allocations use — parity by construction.\n        if (opt.conduit) (a.wornConduits ??= []).push(opt.conduit);\n      }\n      if (mods.length) a.sheet.setSource(`boon:${group.id}`, mods);\n    }\n    a.xpValue = Math.round(def.xp * XP_SCALE * (1 + 0.15 * lv));\n    a.fillResources();\n    return a;\n  }","stampMonsterLevel":"private stampMonsterLevel(a: Actor, def: MonsterDef, level: number): void {\n    a.level = level;\n    const lv = level - 1;\n    // THE PLY FABRIC (engine/plies.ts): hit-counted durability stamped at\n    // mint — the life pool underneath stays authored and fully live.\n    if (def.plies) {\n      a.plySpec = def.plies;\n      a.pliesMax = plyCountOf(def.plies, level);\n    }\n    // Monsters grow with wave level through the same modifier system. The\n    // baseline (life/damage/accuracy/evasion) is a global lever; per-stat\n    // scaling is opt-in below.\n    a.sheet.setSource('level',\n      Object.entries(MONSTER_LEVEL_SCALE).map(([stat, c]) => mod(stat, 'increased', c * lv)));\n    // OPT-IN per-stat scaling (StatScale): flat/increased per-level (× lv^pow) +\n    // a geometric MORE term — layered on the baseline, applied ONLY where noted.\n    if (def.scaling) {\n      const scaleMods: Modifier[] = [];\n      for (const [stat, s] of Object.entries(def.scaling)) {\n        const lvp = Math.pow(lv, s.pow ?? 1); // 0 at level 1 ⇒ base is the lv-1 value\n        if (s.flatPerLevel) scaleMods.push(mod(stat, 'flat', s.flatPerLevel * lvp));\n        if (s.incPerLevel) scaleMods.push(mod(stat, 'increased', s.incPerLevel * lvp));\n        if (s.rate) scaleMods.push(mod(stat, 'more', Math.pow(1 + s.rate, lv) - 1));\n      }\n      if (scaleMods.length) a.sheet.setSource('scaling', scaleMods);\n    }\n    // Bosses hold their ground: a default poise pool (levels with them)\n    // unless the def declares one.\n    if (def.boss && def.base.poise === undefined) {\n      a.sheet.setBase('poise',\n        DEFENSE_CFG.poise.bossBase + DEFENSE_CFG.poise.bossPerLevel * lv);\n    }\n  }","armAmbush":"armAmbush(a: Actor, spec: AmbushSpec): void {\n    a.ambushArmed = true;\n    if (!spec.visible) {\n      a.untargetable = true;\n      a.sheet.setSource('ambush', [mod('invisible', 'flat', 1)]);\n    }\n  }"}};
// Full original methods and constant values above are pinned source data. No
// runtime Git or ignored scratch read participates in this durable oracle.
assert.equal(createHash('sha256').update(JSON.stringify(ORIGINAL.methods)).digest('hex'), ORIGINAL.methodsSHA256);
const baseline: NativeMonsterFactorySources = { Actor, MONSTERS, vec, mod, sympathyStat, rand, tellSpecsOf, DEFENSE_CFG,
  defDensity,defBreathes,squishSpecOf,makeReserve,rollStartTone,attunedStatus,TUNE_CFG,chance,rollItem,monsterTurnSpeed,
  makeSkillInstance,SKILLS,SUPPORTS,validTreeNodes,CHOICE_GROUPS,plyCountOf,
  MONSTER_LEVEL_SCALE:{life:.22,damage:.1,accuracy:.06,evasion:.06},XP_SCALE:.8,monsterSkillLevelOf,
  get random(){return Math.random;} };
const js=ts.transpileModule('class ArchivedFactory {\n'+Object.values(ORIGINAL.methods).join('\n')+'\n}',{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
bootSimEngine();const restoreBoot=seedGlobalRandom(78913);
const worlds=[makeSimWorld('warrior',991),makeSimWorld('warrior',991)];restoreBoot();
let itemBase=0,recording=false,tape:unknown[]=[];
function state(a:Actor):unknown {
 const before=recording;recording=false;
 try {const s=captureNativeActorState(a);assert.ok(s,'native birth graph '+a.defId);
  for(const node of s.nodes)for(const entry of node.entries)if(entry[0]==='uid'&&typeof entry[1]==='number')entry[1]-=itemBase;
  return {id:a.id,state:s};
 }finally{recording=before;}
}
function norm(v:any):any {
 if(v instanceof Actor)return state(v);
 if(typeof v==='function')return {fn:v.name};
 if(v instanceof Map)return [...v].map(([k,x])=>[norm(k),norm(x)]);
 if(v instanceof Set)return [...v].map(norm);
 if(Array.isArray(v))return v.map(norm);
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='uid'&&typeof x==='number'?x-itemBase:norm(x)]));
 return v;
}
function note(row:unknown[]){if(!recording)return;recording=false;try{tape.push(norm(row));}finally{recording=true;}}
function invoke(name:string,args:unknown[],fn:()=>any):any {
 note(['call',name,args]);try{const out=fn();note(['return',name,out]);return out;}
 catch(e){note(['throw',name,String(e)]);throw e;}
}
type Fixture={name:string;id:string;level:number;team?:Team;owner?:boolean;spawn?:{scale?:number};tag?:boolean;clock?:number;
 party?:number;realParty?:boolean;appearanceLedger?:boolean;appearanceThrow?:boolean;partyThrow?:boolean;sourceThrow?:string;core?:boolean};
let pairs=0,bodies=0,randomDraws=0,itemAllocations=0,sourceReads=0;
function run(f:Fixture,seed:number,old:boolean){
 const w:any=worlds[old?0:1],saved=new Map<string,PropertyDescriptor|undefined>();
 const save=(key:string)=>{saved.set(key,Object.getOwnPropertyDescriptor(w,key));};
 for(const key of ['stampMonsterLevel','applyPartyScale','armAmbush','nativeMonsterFactorySources','relayStatus','bombardMintRev','zoneGenTagging','npcDialogues','time','seats'])save(key);
 const existing=w.actors.slice(),ledgerBefore=w.account.ledger;
 if(f.appearanceLedger)w.account.ledger={...ledgerBefore,[questDoneKey(BRANDT_HAMMER_QUEST)]:1};
 const account=JSON.stringify(serializeAccount(w.account));
 resetActorIdCounter(61000);itemBase=nextItemUid()+1;
 const owner=f.owner?new Actor('actual-owner','player',vec(20,30)):undefined;
 if(owner){owner.sheet.setBase('minionDamage',1.4);owner.sheet.setBase('minionLife',1.7);}
 if(f.realParty){const human=new Actor('party human','player',vec(0,0)),merc=new Actor('party merc','player',vec(0,0)),dead=new Actor('party dead','player',vec(0,0));dead.dead=true;
  w.seats=[w.seats[0],{...w.seats[0],actor:human},{...w.seats[0],actor:merc,merc:{}},{...w.seats[0],actor:dead}];
  w.player.sheet.setSource('qaFactoryMercEase',[mod('mercEase','flat',.4)]);assert.equal(w.partyScaleCount(),2+MERC_CFG.partyScaleWeight*.6);}
 const created:Actor[]=[],baseStates:unknown[]=[],randoms:number[]=[],random=Math.random,next=mulberry32(seed);
 Math.random=()=>{const v=next();randoms.push(v);note(['draw',v]);return v;};
 const tracing=new WeakMap<object,any>();
 const traceData=(v:any,path:string):any=>{
  if(!v||typeof v!=='object'||v instanceof Actor||v instanceof Map||v instanceof Set)return v;
  const prior=tracing.get(v);if(prior)return prior;
  const out=new Proxy(v,{get(target,key,receiver){if(typeof key==='string')note(['data',path,key]);return traceData(Reflect.get(target,key,receiver),path+'.'+String(key));}});
  tracing.set(v,out);return out;
 };
 const actual=w.nativeMonsterFactorySources() as NativeMonsterFactorySources;
 // Constants and callbacks supplied by the classic owner must be the actual
 // independent modules/pinned values, rather than a self-consistent substitute.
 for(const key of Object.keys(baseline))if(key!=='random')assert.deepEqual((actual as any)[key],(baseline as any)[key],key+' source owner');
 const values=old?baseline:actual;
 const source=new Proxy(values,{get(target,key,receiver){
  note(['source',String(key)]);let value=Reflect.get(target,key,receiver);
  if(key==='random')return value;
  if(key==='Actor')return new Proxy(Actor,{construct(ctor,args){note(['construct',args]);const a=Reflect.construct(ctor,args) as Actor;created.push(a);baseStates.push(state(a));return a;}});
  if(typeof value==='function')return (...args:unknown[])=>invoke(String(key),args,()=>{
   if(f.sourceThrow===key)throw Error('fixture source '+String(key));return value(...args);
  });
  return traceData(value,String(key));
 }});
 const math=new Proxy(Math,{get(target,key,receiver){if(key==='random'){note(['source','random']);return Math.random;}return Reflect.get(target,key,receiver);}});
 const deps=new Proxy(Object.create(null),{has:(_t,k)=>k==='Math'||Object.hasOwn(baseline,k),get:(_t,k)=>typeof k==='symbol'?undefined:k==='Math'?math:(source as any)[k]});
 const archived=new Function('deps','with(deps){'+js+';return ArchivedFactory.prototype;}')(deps) as any;
 const originalStamp=w.stampMonsterLevel,originalParty=w.applyPartyScale,originalArm=w.armAmbush;
 w.nativeMonsterFactorySources=()=>source;
 w.stampMonsterLevel=(...args:unknown[])=>invoke('stampMonsterLevel',args,()=> (old?archived.stampMonsterLevel:originalStamp).apply(w,args));
 w.applyPartyScale=(a:Actor)=>invoke('applyPartyScale',[a],()=>{
  if(f.partyThrow)throw Error('fixture party');
  if(f.party===undefined)return originalParty.call(w,a);
  const s=coopScale(f.party);if(s.life>0||s.damage>0)a.sheet.setSource('partyScale',[mod('life','more',s.life),mod('damage','more',s.damage)]);else a.sheet.removeSource('partyScale');
 });
 w.armAmbush=(...args:unknown[])=>invoke('armAmbush',args,()=> (old?archived.armAmbush:originalArm).apply(w,args));
 let bombard=40;const relay=w.relayStatus,dialogues=w.npcDialogues;
 for(const[key,value]of Object.entries({relayStatus:relay,zoneGenTagging:f.tag??true,time:f.clock??123.5,npcDialogues:{appearanceFor:(id:string)=>invoke('appearanceFor',[id],()=>{
  if(f.appearanceThrow)throw Error('fixture appearance');return dialogues.appearanceFor(id);
 })}}))Object.defineProperty(w,key,{configurable:true,get(){note(['host',key]);return value;}});
 Object.defineProperty(w,'bombardMintRev',{configurable:true,get(){note(['host','bombardMintRev',bombard]);return bombard;},set(v){note(['host.set','bombardMintRev',v]);bombard=v;}});
 tape=[];recording=true;let result:Actor|undefined,outcome='returned';
 try{result=old?archived.createMonster.call(w,f.id,f.level,f.team??'enemy',owner,f.spawn)
  :f.core?createNativeMonster(w.nativeMonsterFactoryHost(),source,f.id,f.level,f.team??'enemy',owner,f.spawn)
  :w.createMonster(f.id,f.level,f.team??'enemy',owner,f.spawn);
 }catch(e){outcome=String(e);}
 recording=false;
 try {if(result)assert.equal(result.statusRelay,relay,'native relay capability attached');
  assert.deepEqual(w.actors,existing,'factory never publishes bodies');assert.equal(JSON.stringify(serializeAccount(w.account)),account,'factory leaves account unchanged');
  const resultState=result?state(result):undefined,partial=created.map(state),nextDraw=Math.random();
  return {outcome,result:resultState,base:baseStates,partial,tape,draws:randoms,next:nextDraw,bombard,look:result?.look,
   nextActorId:new Actor('sentinel','enemy',vec(0,0)).id,items:nextItemUid()-itemBase};
 }finally{recording=false;Math.random=random;w.account.ledger=ledgerBefore;w.player.sheet.removeSource('qaFactoryMercEase');for(const[key,descriptor]of saved){if(descriptor)Object.defineProperty(w,key,descriptor);else delete w[key];}}
}
function diff(a:any,b:any,p='root'):string {if(Object.is(a,b))return '';if(a&&b&&typeof a==='object'&&typeof b==='object'){const ak=Object.keys(a),bk=Object.keys(b);if(JSON.stringify(ak)!==JSON.stringify(bk))return p+' keys '+JSON.stringify(ak)+' vs '+JSON.stringify(bk);for(const k of ak){const d=diff(a[k],b[k],p+'.'+k);if(d)return d;}return '';}return p+': '+JSON.stringify(a)+' != '+JSON.stringify(b);}
function pair(f:Fixture,seed=713){const a=run(f,seed,true),b=run(f,seed,false);try{assert.deepEqual(b,a);}catch{assert.fail(f.name+' seed'+seed+' '+diff(a,b));}
 pairs++;bodies+=b.partial.length;randomDraws+=b.draws.length;itemAllocations+=b.items;sourceReads+=b.tape.length;return b;}
const shipped=Object.keys(MONSTERS);
for(let i=0;i<shipped.length;i++)pair({name:'shipped '+shipped[i],id:shipped[i],level:35,core:i%2===0},(i*2654435761+991)>>>0);
const featureKeys=['brainVariants','scaleVariance','plies','boss','carry','tune','boons','grants','skillTrees','reserves','ambush','bombard','worm','shellGuard','sympathy'] as const;
const selected=new Set<string>();for(const key of featureKeys){const row=Object.values(MONSTERS).find(d=>d[key]);if(row)selected.add(row.id);}
for(const id of selected)for(const level of [1,80])pair({name:'level branches '+id,id,level},991);
const common=shipped.find(id=>!MONSTERS[id].carry)!;
for(const f of [
 {name:'player body',id:common,level:20,team:'player' as const},
 {name:'enemy owned minion',id:common,level:20,owner:true,party:4},
 {name:'player owned minion',id:common,level:20,owner:true,team:'player' as const},
 {name:'untagged hostile',id:common,level:20,tag:false,clock:0},
 {name:'fractional party',id:common,level:20,party:2.375},
 {name:'actual human merc dead seat scaling',id:common,level:20,realParty:true},
 {name:'closed party source',id:common,level:20,party:1},
 {name:'missing native definition',id:'qa_missing_monster',level:20},
 {name:'party callback exception',id:common,level:20,partyThrow:true},
] satisfies Fixture[])pair(f);
const variance=Object.values(MONSTERS).find(d=>d.scaleVariance)!;
for(const scale of [undefined,.1,1.8,0,-1,NaN,Infinity])pair({name:'explicit scale '+String(scale),id:variance.id,level:25,spawn:{scale}},177);
const bombard=Object.values(MONSTERS).find(d=>d.bombard)!;
const failed=pair({name:'partial bombard then appearance exception',id:bombard.id,level:25,appearanceThrow:true});assert.equal(failed.bombard,41);assert.equal(failed.partial.length,1);
const carried=Object.values(MONSTERS).find(d=>d.carry&&d.carry.chance===undefined)!;
if(carried)pair({name:'item callback exception',id:carried.id,level:35,sourceThrow:'rollItem'});
// Appearance is a real campaign read: current authored smith appearance changes
// by account/run ledger, with no ledger write performed by construction.
if(MONSTERS.townsfolk_smith){const before=pair({name:'actual appearance owner',id:'townsfolk_smith',level:1,team:'player'});
 const after=pair({name:'actual completed account appearance',id:'townsfolk_smith',level:1,team:'player',appearanceLedger:true});
 assert.equal(before.look,'npc_smith_unarmed');assert.equal(after.look,'npc_smith');}
// Two explicit detached hosts own context/revisions and independent RNG scopes.
// This is source-compatible factory preparation, not publication or fresh IDs.
function isolated(which:number){
 const seed=which?991:713,random=Math.random,rng=mulberry32(seed),created:Actor[]=[];
 const sources={...baseline,get random(){return Math.random;}};let revision=which?100:20;
 const host:NativeMonsterFactoryHost={relayStatus:()=>false,get bombardMintRev(){return revision;},set bombardMintRev(v){revision=v;},
  stampMonsterLevel:(a,d,l)=>stampNativeMonsterLevel(a,d,l,sources),applyPartyScale:a=>{const s=coopScale(which?3:1);if(s.life||s.damage)a.sheet.setSource('partyScale',[mod('life','more',s.life),mod('damage','more',s.damage)]);},
  zoneGenTagging:!which,npcDialogues:{appearanceFor:()=>which?'npc_smith':undefined},armAmbush:(a,s)=>armNativeMonsterAmbush(a,s,sources),time:which?87:12};
 resetActorIdCounter(70000);itemBase=nextItemUid()+1;Math.random=rng;
 try{for(const id of [...selected].slice(0,14))created.push(createNativeMonster(host,sources,id,35,'enemy'));
  return {states:created.map(state),revision,next:rng(),items:nextItemUid()-itemBase};}finally{Math.random=random;}
}
const localA=isolated(0);isolated(1);assert.deepEqual(isolated(0),localA,'independent factory A/B/A');
console.log('PASS native factory',JSON.stringify({shipped:shipped.length,pairs,bodies,draws:randomDraws,itemAllocations,orderedEntries:sourceReads,
 original:ORIGINAL.revision,archive:ORIGINAL.methodsSHA256,independentABA:true}));
console.log('LIMIT complete explicit native factory operation only; source authority, birth-driver order and runtime admission remain caller obligations');
// Observe the actual original call receiver through a direct lexical archive.
// The main read-tape harness intentionally wraps helpers, so it cannot alone
// prove receiver identity for future callback implementations.
{
 const calls:string[]=[];let active=true;
 const sources:any={...baseline,get random(){return Math.random;}};
 for(const[key,fn]of Object.entries(baseline))if(typeof fn==='function'&&key!=='Actor'&&key!=='random')sources[key]=function(this:unknown,...args:unknown[]){
  assert.equal(this,undefined,'native imported helper receiver '+key);if(active)calls.push(key);return (fn as (...xs:unknown[])=>unknown)(...args);
 };
 const keys=Object.keys(baseline),archive=new Function(...keys,'"use strict";'+js+';return ArchivedFactory.prototype;')(...keys.map(k=>sources[k])) as any;
 function lexical(core:boolean){
  let revision=80;const host:NativeMonsterFactoryHost={relayStatus:()=>false,get bombardMintRev(){return revision;},set bombardMintRev(v){revision=v;},
   stampMonsterLevel:(a,d,l)=>{if(core)stampNativeMonsterLevel(a,d,l,sources);else archive.stampMonsterLevel.call(host,a,d,l);},
   applyPartyScale:()=>{},zoneGenTagging:true,npcDialogues:{appearanceFor:()=>undefined},
   armAmbush:(a,s)=>{if(core)armNativeMonsterAmbush(a,s,sources);else archive.armAmbush.call(host,a,s);},time:61};
  const previous=Math.random,rng=mulberry32(719);resetActorIdCounter(72000);itemBase=nextItemUid()+1;calls.length=0;
  Math.random=function(this:unknown){assert.ok(this===Math||this===undefined,'unexpected native random receiver');if(active)calls.push(this===Math?'random:Math':'random:undefined');return rng();};
  try {const actors=[...selected].map(id=>core?createNativeMonster(host,sources,id,80,'enemy'):archive.createMonster.call(host,id,80,'enemy'));
   active=false;const result={states:actors.map(state),calls:calls.slice(),items:nextItemUid()-itemBase,revision};active=true;return result;
  }finally{Math.random=previous;active=true;}
 }
 assert.deepEqual(lexical(true),lexical(false),'direct lexical native function receivers and births');
 assert.ok(calls.includes('random:Math')&&calls.includes('random:undefined')&&calls.includes('mod')&&calls.includes('rollItem'));
 console.log('PASS native factory direct lexical helper and Math.random receiver controls',calls.length);
}
