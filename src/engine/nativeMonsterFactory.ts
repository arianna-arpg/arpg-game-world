import type { Actor, Team, AmbushSpec } from './actor';
import type { MonsterDef } from '../data/monsters';
import type { Modifier } from './stats';

/** Complete native birth operation dependencies. Sources retain their actual
 * transitive registries and RNG behavior; this seam is not a source issuer. */
export interface NativeMonsterFactorySources {
  readonly Actor: typeof import('./actor').Actor;
  readonly MONSTERS: typeof import('../data/monsters').MONSTERS;
  readonly vec: typeof import('../core/math').vec;
  readonly mod: typeof import('./stats').mod;
  readonly sympathyStat: typeof import('./sympathy').sympathyStat;
  readonly rand: typeof import('../core/math').rand;
  readonly tellSpecsOf: typeof import('./tells').tellSpecsOf;
  readonly DEFENSE_CFG: typeof import('./defense').DEFENSE_CFG;
  readonly defDensity: typeof import('../data/monsters').defDensity;
  readonly defBreathes: typeof import('../data/monsters').defBreathes;
  readonly squishSpecOf: typeof import('./squish').squishSpecOf;
  readonly makeReserve: typeof import('./reserves').makeReserve;
  readonly rollStartTone: typeof import('./tuning').rollStartTone;
  readonly attunedStatus: typeof import('./tuning').attunedStatus;
  readonly TUNE_CFG: typeof import('./tuning').TUNE_CFG;
  readonly chance: typeof import('../core/math').chance;
  readonly rollItem: typeof import('./itemgen').rollItem;
  readonly monsterTurnSpeed: typeof import('./handling').monsterTurnSpeed;
  readonly makeSkillInstance: typeof import('./skills').makeSkillInstance;
  readonly SKILLS: typeof import('../data/skills').SKILLS;
  readonly SUPPORTS: typeof import('../data/supports').SUPPORTS;
  readonly validTreeNodes: typeof import('./skills').validTreeNodes;
  readonly CHOICE_GROUPS: typeof import('../data/passiveChoices').CHOICE_GROUPS;
  readonly plyCountOf: typeof import('./plies').plyCountOf;
  readonly MONSTER_LEVEL_SCALE: Readonly<Record<string, number>>;
  readonly XP_SCALE: number;
  monsterSkillLevelOf(level: number): number;
  readonly random: () => number;
}
/** A birth host owns its revision/tag/clock/party and appearance context.
 * No zone or placement state is borrowed. Classic readers stay live and lazy. */
export interface NativeMonsterFactoryHost {
  readonly relayStatus: NonNullable<Actor['statusRelay']>;
  bombardMintRev: number;
  stampMonsterLevel(actor: Actor, def: MonsterDef, level: number): void;
  applyPartyScale(actor: Actor): void;
  readonly zoneGenTagging: boolean;
  readonly npcDialogues: { appearanceFor(defId: string): string | undefined };
  armAmbush(actor: Actor, spec: AmbushSpec): void;
  readonly time: number;
}

export function stampNativeMonsterLevel(a: Actor, def: MonsterDef, level: number, sources: NativeMonsterFactorySources): void {
    a.level = level;
    const lv = level - 1;
    // THE PLY FABRIC (engine/plies.ts): hit-counted durability stamped at
    // mint — the life pool underneath stays authored and fully live.
    if (def.plies) {
      a.plySpec = def.plies;
      a.pliesMax = (0, sources.plyCountOf)(def.plies, level);
    }
    // Monsters grow with wave level through the same modifier system. The
    // baseline (life/damage/accuracy/evasion) is a global lever; per-stat
    // scaling is opt-in below.
    a.sheet.setSource('level',
      Object.entries(sources.MONSTER_LEVEL_SCALE).map(([stat, c]) => (0, sources.mod)(stat, 'increased', c * lv)));
    // OPT-IN per-stat scaling (StatScale): flat/increased per-level (× lv^pow) +
    // a geometric MORE term — layered on the baseline, applied ONLY where noted.
    if (def.scaling) {
      const scaleMods: Modifier[] = [];
      for (const [stat, s] of Object.entries(def.scaling)) {
        const lvp = Math.pow(lv, s.pow ?? 1); // 0 at level 1 ⇒ base is the lv-1 value
        if (s.flatPerLevel) scaleMods.push((0, sources.mod)(stat, 'flat', s.flatPerLevel * lvp));
        if (s.incPerLevel) scaleMods.push((0, sources.mod)(stat, 'increased', s.incPerLevel * lvp));
        if (s.rate) scaleMods.push((0, sources.mod)(stat, 'more', Math.pow(1 + s.rate, lv) - 1));
      }
      if (scaleMods.length) a.sheet.setSource('scaling', scaleMods);
    }
    // Bosses hold their ground: a default poise pool (levels with them)
    // unless the def declares one.
    if (def.boss && def.base.poise === undefined) {
      a.sheet.setBase('poise',
        sources.DEFENSE_CFG.poise.bossBase + sources.DEFENSE_CFG.poise.bossPerLevel * lv);
    }
  }

export function armNativeMonsterAmbush(a: Actor, spec: AmbushSpec, sources: NativeMonsterFactorySources): void {
    a.ambushArmed = true;
    if (!spec.visible) {
      a.untargetable = true;
      a.sheet.setSource('ambush', [(0, sources.mod)('invisible', 'flat', 1)]);
    }
  }

export function createNativeMonster(host: NativeMonsterFactoryHost, sources: NativeMonsterFactorySources,
  defId: string, level: number, team: Team, owner?: Actor, spawn?: { scale?: number }): Actor {
    const def: MonsterDef = sources.MONSTERS[defId];
    const a = new sources.Actor(def.name, team, (0, sources.vec)(0, 0));
    a.statusRelay = host.relayStatus;
    a.defId = defId;
    // THE GUN CENSUS: a bombard-wearing mint re-keys updateBombardment's
    // presence flag the same frame — the one signal a push can't carry.
    if (def.bombard) host.bombardMintRev++;
    a.color = def.color;
    a.shape = def.shape;
    a.radius = def.radius;
    a.level = level;
    a.invulnerable = !!def.invulnerable;
    a.untargetable = !!def.untargetable;
    a.levitates = !!def.levitates;
    for (const [stat, value] of Object.entries(def.base)) a.sheet.setBase(stat, value);
    // Innate mods + an optional per-monster detection multiplier (one source).
    const innate = def.mods ? [...def.mods] : [];
    if (def.detection !== undefined && def.detection !== 1) {
      innate.push((0, sources.mod)('detectionRange', 'more', def.detection - 1));
    }
    // Born-with SYMPATHY LINKS fold as potency-1 stats through the same
    // innate source — the fabric reads monsters and players identically.
    if (def.sympathy) {
      for (const link of def.sympathy) innate.push((0, sources.mod)((0, sources.sympathyStat)(link), 'flat', 1));
    }
    if (innate.length) a.sheet.setSource('innate', innate);
    // THE LATCH (engine/cling.ts): any monster can be a clinger — stamped
    // at mint so summons, claims and wild spawns all wear it identically.
    if (def.cling) a.cling = def.cling;
    // THE GRAB FABRIC's victim-side policy override (engine/grab.ts):
    // per-body word over the rarity tiers — the Winter King is never
    // luggage; a fat unique toad may opt back in.
    if (def.grabbable !== undefined) a.grabbable = def.grabbable;
    // ROOTED BODIES (the siegebreaker lane, damage.ts): a def that cannot
    // walk is a STRUCTURE to the slayer fold — stamped at mint like cling,
    // so summons, spawner objects and wild engines all wear it identically.
    if (def.base.moveSpeed === 0) a.stationary = true;
    // THE PLY FABRIC (engine/plies.ts): hit-counted durability stamped at
    // mint — the life pool underneath stays authored and fully live.
    // THE LEVEL STAMP (stampMonsterLevel — ONE fold): plies, the baseline
    // growth source, opt-in per-stat scaling and the boss poise pool, shared
    // with the in-place relevel a growing bond rides (relevelActor). A fresh
    // mint stands at full plies.
    const lv = level - 1;
    host.stampMonsterLevel(a, def, level);
    a.plies = a.pliesMax;
    // CO-OP: scale HOSTILE monsters (never player-side minions) by the live party
    // size. coopScale returns 0 at 1 player ⇒ the source is never set ⇒ single-
    // player identical. Lands in starting life via fillResources() below.
    if (team === 'enemy' && !owner) host.applyPartyScale(a);
    if (owner) {
      a.owner = owner;
      a.kind = 'minion';
      // Minions inherit the owner's minion-scaling stats as multipliers.
      a.sheet.setSource('owner', [
        (0, sources.mod)('damage', 'more', owner.sheet.get('minionDamage') - 1),
        (0, sources.mod)('life', 'more', owner.sheet.get('minionLife') - 1),
      ]);
    }
    // Behavior & body plan from the definition. BRAIN VARIANTS roll a
    // per-spawn PERSONALITY (pack-runner / loner / tide-cycler from one def)
    // — the same body, a different mind each time it walks in.
    a.brain = def.brain;
    if (def.brainVariants?.length) {
      let total = 0;
      for (const v of def.brainVariants) total += v.weight;
      let roll = (0, sources.rand)(0, total);
      for (let vi = 0; vi < def.brainVariants.length; vi++) {
        const v = def.brainVariants[vi];
        roll -= v.weight;
        if (roll <= 0) { a.brain = v.brain; a.brainVariant = vi; break; }
      }
    }
    // THE TELL FABRIC (engine/tells.ts): the binding list this body wears —
    // def rows + the rolled temperament's rows. Stamped once; the sweep
    // (updateTells) and the renderer both read it. Undefined = null-cost.
    a.tellSpecs = (0, sources.tellSpecsOf)(def, a.brainVariant);
    // THE WATCH FABRIC (engine/watch.ts): the ladder posture, stamped the
    // same way — undefined keeps every gate/sweep/draw hook null-cost.
    a.watch = def.watch;
    // Def-level role tag (ambient wildlife etc.) — spawners may still
    // overwrite it for event roles (patrols, sieges).
    if (def.tag) a.tag = def.tag;
    // DUTY POST (brain.ts PostSpec), the def-level lane: every spawn of this
    // def keeps a station — its first-tick anchor — walking back whenever
    // idle drift, a shove or a gale strays it. Spawners stamp Actor.aiPost /
    // postSpec directly for site-exact posts (a holdfast's gate crew).
    if (def.post) a.postSpec = def.post === true ? {} : def.post;
    a.passive = !!def.passive;
    a.driven = !!def.driven; // engine-wheeled — movementLocked's passive lock stands aside

    // aims:false — facing-is-noise bodies (data lever): no aim tick.
    if (def.aims === false) a.aims = false;
    if (def.spawnFacing !== undefined) a.facing = def.spawnFacing;
    // SCALE VARIANCE: a herd reads as a mix of big adults and small young. Roll a
    // per-spawn body-scale (sizing the body + — with scaleStats — its life/damage),
    // and below the juvenile cut SWAP to the juvenile brain (the young flee, never
    // gore). Harmless on any monster without the lever (no source set).
    if (def.scaleVariance) {
      const s = spawn?.scale !== undefined && Number.isFinite(spawn.scale) && spawn.scale > 0
        ? spawn.scale : (0, sources.rand)(def.scaleVariance[0], def.scaleVariance[1]);
      a.spawnScale = s;
      a.radius = def.radius * s;
      if (def.scaleStats) a.sheet.setSource('scaleVar', [(0, sources.mod)('life', 'more', s - 1), (0, sources.mod)('damage', 'more', s - 1)]);
      // THE YOUNG (engine/pack.ts): the roll is RECORDED, not merely acted
      // on. Before this flag a juvenile was a one-way brain swap nothing
      // could ask about afterwards — so the matriarch could not know whom
      // she was guarding and the den could not show its young as young.
      if (def.juvenileBelow !== undefined && s <= def.juvenileBelow) {
        a.juvenile = true;
        if (def.juvenileBrain) a.brain = def.juvenileBrain;
      }
    }
    // WEIGHT defaults from the BODY: mass grows with the (post-variance)
    // radius × the material's DENSITY (MATERIAL_NATURE — a knee-high iron
    // thrall anchors, a man-high wisp flies from a slap) × the def's HEFT
    // multiplier, unless the def brings its own base.weight — so the
    // bestiary gets honest heft for free and any monster can still pin or
    // scale it as data (engine/mass.ts; docs/engine/mass.md).
    if (def.base.weight === undefined) {
      a.sheet.setBase('weight',
        Math.pow(a.radius / sources.DEFENSE_CFG.weight.refRadius, sources.DEFENSE_CFG.weight.radiusPow)
        * (0, sources.defDensity)(def) * (def.heft ?? 1));
    }
    // (Bosses hold their ground: the default poise pool — levels with them —
    // is part of THE LEVEL STAMP above; rank-and-file keep the registry base,
    // which ships EMPTY: poise is a defense TEXTURE a def authors, never
    // ambience — a rabbit has none; a knight declares his.)
    // BREATH: does this body tire? The material's nature (MATERIAL_NATURE,
    // data/monsters.ts) with the def's own override — read once here so
    // the AI's default-kite gate is a field test, not a registry walk.
    a.breathes = (0, sources.defBreathes)(def);
    // Zone Memory: flag the zone's BASE population (spawned inside the tagging
    // window in loadZone) so it can be snapshotted + restored on re-entry. Overlay
    // and event spawns fall outside the window, so they stay live (untouched).
    if (host.zoneGenTagging && team === 'enemy' && !owner) a.fromZoneGen = true;
    // moveSpeed 0 in the DEF means rooted — the stat itself floors at 30,
    // which is exactly how barrels learned to walk. Never again. Breakables
    // (orbDrops) stay shovable; spawners, caches and townsfolk hold their ground.
    a.anchored = (def.base.moveSpeed ?? 1) <= 0 && !def.orbDrops;
    a.movementTetherSpec = def.movementTether;
    a.faction = def.faction;
    a.adorn = def.adorn;
    a.material = def.material;
    a.look = host.npcDialogues.appearanceFor(a.defId!) ?? def.look;
    if (def.worm) {
      a.worm = {
        length: def.worm.length,
        spacing: def.worm.spacing ?? def.radius * 1.1,
        taper: def.worm.taper ?? 0.88,
        segments: [],
        // THE SEGMENT FABRIC (engine/segments.ts): hittable chains, wound
        // states, kit-part looks — all data off the def, absent = legacy.
        ...(def.worm.hittable ? { hittable: true } : {}),
        ...(def.worm.looks ? { looks: def.worm.looks } : {}),
        ...(def.worm.wounds ? { wounds: def.worm.wounds } : {}),
      };
    }
    if (def.explodeOnDeath) a.explodeOnDeath = def.explodeOnDeath;
    if (def.deathBurst) a.deathBurst = def.deathBurst;
    if (def.refuge) a.refuge = def.refuge;
    // THE SQUISH FABRIC (engine/squish.ts): normalized once at spawn — the
    // tread sweep and the separation exemption read a field, never the registry.
    const squishSpec = (0, sources.squishSpecOf)(def);
    if (squishSpec) a.squish = squishSpec;
    if (def.habitat) a.habitat = def.habitat; // confine derives lazily (update sweep)
    if (def.wake) a.wake = def.wake; // the body-wake odometer arms on first move
    // THE RESERVES (engine/reserves.ts): the body arrives with its pools
    // filled to their authored share — one live row per spec, minted here
    // so EVERY spawn path (packs, events, zone-memory restores, summons)
    // carries the same fuel economy.
    if (def.reserves?.length) {
      a.reserves = new Map(def.reserves.map(r => [r.id, (0, sources.makeReserve)(r)]));
      a.reserveSpecs = def.reserves;
    }
    if (def.rooted) a.rootedSpec = def.rooted; // the claim, stamped for the slayer fold
    if (def.volatile) a.volatile = def.volatile; // the poked nest arms
    if (def.onHitByType) { a.onHitByType = def.onHitByType; a.onHitTypeIcd = def.onHitTypeIcd; } // the body's element grammar
    // TUNABLE (the attunement fabric): the body wakes in its ground state —
    // or, for riddle hearts, a rolled one — and WEARS the tone from tick one.
    if (def.tune) {
      a.tune = def.tune;
      a.tone = (0, sources.rollStartTone)(def.tune, () => (0, sources.rand)(0, 1));
      a.applyStatus((0, sources.attunedStatus)(a.tone), 0, sources.TUNE_CFG.holdScale, 'attunement');
    }
    // CARRIED GEAR (MonsterDef.carry — the Hollowborn): mint the real piece
    // the body walks in wearing; its credited kill drops exactly this.
    if (def.carry && (def.carry.chance === undefined || (0, sources.chance)(def.carry.chance))) {
      const worn = (0, sources.rollItem)({
        ilvl: Math.max(1, level),
        ...(def.carry.rarity !== undefined ? { rarity: def.carry.rarity } : {}),
        ...(def.carry.category !== undefined ? { category: def.carry.category } : {}),
      });
      if (worn) a.carriedGear = worn;
    }
    if (def.immuneGround) a.immuneGround = def.immuneGround; // the insured (lava natives)
    if (def.pathCosts) a.pathCosts = def.pathCosts; // the wayfaring overrides (the magma worm's bath)
    // ARMED AMBUSH (the ambush fabric): born as waiting scenery — the
    // update sweep springs it on proximity, a wound springs it instantly.
    if (def.ambush) host.armAmbush(a, def.ambush);
    // SHELL GUARD worn as anatomy: the directional absorb, pool full at birth.
    if (def.shellGuard) {
      const sg = def.shellGuard;
      a.shellGuard = {
        side: sg.side, arcDeg: sg.arcDeg ?? 180,
        max: sg.max, pool: sg.max,
        regenDelay: sg.regenDelay ?? 4,
        regenRate: sg.regenRate ?? sg.max / 6,
        lastHitAt: -999, broken: false,
        color: sg.color ?? '#c8b87a',
        shellVisual: sg.shellVisual,
        breathe: sg.breathe, // the tidal shell's opening rides along
      };
    }
    // TURN SPEED: derive innate handling from anatomy unless explicitly
    // authored. Seat control bypasses this innate rate at the steering seam.
    a.turnSpeed = (0, sources.monsterTurnSpeed)(def);
    a.facingPrev = a.facing; // the first acquired target also pays the turn
    if (def.flier) { a.flying = true; a.flyingBase = true; }
    a.spawnedAt = host.time;
    // Monsters' skills level up with them — same leveling system as the player.
    const skillLevel = (0, sources.monsterSkillLevelOf)(level);
    a.skills = def.skills.map(id => (0, sources.makeSkillInstance)(sources.SKILLS[id], skillLevel));
    // LEVEL-GATED GRANTS (MonsterGrant): once the monster is high enough, its kit
    // evolves — gain a new skill, or socket a support into an existing one (riding
    // the skill instances' default 3 sockets; the cast pipeline reads them).
    if (def.grants) {
      const supLevel = 1 + Math.floor(lv / 5);
      for (const g of def.grants) {
        if (level < g.atLevel) continue;
        if (g.chance !== undefined && sources.random.call(Math) >= g.chance) continue; // per-spawn variant roll
        if (g.skill && sources.SKILLS[g.skill]) a.skills.push((0, sources.makeSkillInstance)(sources.SKILLS[g.skill], skillLevel));
        if (g.support && sources.SUPPORTS[g.support]) {
          const target = g.on ? a.skills.find(s => s?.def.id === g.on) : a.skills[0];
          if (target) {
            const slot = target.sockets.findIndex(x => x === null);
            if (slot >= 0) target.sockets[slot] = { def: sources.SUPPORTS[g.support], level: supLevel };
          }
        }
      }
    }
    // THE MONSTER PIN (skill-mode trees, M1): a kit may pin spent tree
    // nodes per skill — the ONE validation seam applies (structure only;
    // an authored pin is the def's warrant, no level budget), and every
    // cast-path read resolves through the views, so the telegraph draws
    // exactly what the resolve fires. Capability only: no def wears it yet.
    if (def.skillTrees) {
      for (const inst of a.skills) {
        const pin = inst ? def.skillTrees[inst.def.id] : undefined;
        if (inst && pin?.length) inst.treeNodes = (0, sources.validTreeNodes)(inst.def, pin);
      }
    }
    // BOONS (MonsterBoon): spawn-rolled options from the SAME choice pools
    // the player's tree deals (data/passiveChoices.ts) — mods fold as a
    // sheet source, an option's graft rides the first skill's graft lane
    // (the player's mutator seam, verbatim). Attributes are player-pipeline
    // payloads and deliberately skip the bestiary.
    for (const b of def.boons ?? []) {
      if (level < (b.minLevel ?? 1)) continue;
      const group = sources.CHOICE_GROUPS[b.group];
      if (!group) continue;
      if (b.chance !== undefined && sources.random.call(Math) >= b.chance) continue;
      const pool = [...group.options];
      const picks = Math.min(Math.max(1, b.pick ?? 1), pool.length);
      const mods: Modifier[] = [];
      for (let i = 0; i < picks; i++) {
        const opt = pool.splice(Math.floor(sources.random.call(Math) * pool.length), 1)[0];
        if (opt.mods) mods.push(...opt.mods);
        if (opt.graft && sources.SUPPORTS[opt.graft.support] && a.skills[0]) {
          (a.skills[0].grafts ??= []).push({ def: sources.SUPPORTS[opt.graft.support], level: opt.graft.level ?? 1 });
        }
        // A boon-rolled WORN CONDUIT rides the same actor-level lane the
        // player's allocations use — parity by construction.
        if (opt.conduit) (a.wornConduits ??= []).push(opt.conduit);
      }
      if (mods.length) a.sheet.setSource(`boon:${group.id}`, mods);
    }
    a.xpValue = Math.round(def.xp * sources.XP_SCALE * (1 + 0.15 * lv));
    a.fillResources();
    return a;
  }
