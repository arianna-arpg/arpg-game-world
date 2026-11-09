import type { Actor } from './actor';
import type { World } from './world';
import { instanceDelivery, instanceMods, makeSkillInstance, skillContextTags, type SkillInstance, type SummonDelivery } from './skills';
import type { AssemblyPact, AssemblyPart, GraveyardPact, PactSpawn, SummonPactCue, SummonPactDef } from './summonPactSpec';
import { SUMMON_PACTS, SUMMON_PACT_SUPPORT_GRANTS } from '../data/summonPacts';
import { SKILLS } from '../data/skills';
import { MONSTERS } from '../data/monsters';
import { sameStory } from './tiers';

type Pos = { x: number; y: number };
type CueFlash = { pos: Pos; radius: number; color: string; life: number; maxLife: number; fx: string; recoveryCueTier: number; summonPactCue: SummonPactCue };
interface Part { pos: Pos; tier: number; part: AssemblyPart; until: number; }
interface Grave { pos: Pos; tier: number; count: number; until: number; activeAt?: number; next: number; }
interface PactState {
  owner: Actor; def: SummonPactDef; bank: number; bag: AssemblyPart[]; parts: Part[]; graves: Grave[];
  next: number; echoAt: number; inst: SkillInstance;
}
const distance = (a: Pos, b: Pos): number => Math.hypot(a.x - b.x, a.y - b.y);
const roll = (a: number, b: number): number => a + Math.random() * (b - a);
const ids = SUMMON_PACTS.map(p => p.id);

/** Rebuildable innate crew admission. Kept separate from socketed Resonance so
 * mixed rosters forward only into eligible bodies; the ordinary gem still works. */
export function deriveSummonPactSupports(owner: Actor, inst: SkillInstance): void {
  const d = instanceDelivery(inst);
  if (d.type !== 'summon') { inst.nativeCrewFactions = undefined; return; }
  const tags = skillContextTags(inst), extra = instanceMods(inst);
  const grants = SUMMON_PACT_SUPPORT_GRANTS.filter(g => owner.sheet.get(g.stat, tags, extra) > 0);
  const factions = [...new Set(grants.flatMap(g => g.factions))];
  const forms = d.monsterId ? [d.monsterId] : d.pool?.map(p => p.id) ?? [];
  inst.nativeCrewFactions = factions.length && (d.fromCorpse || forms.some(id => factions.includes(MONSTERS[id]?.faction ?? '')))
    ? factions : undefined;
}

/** A bounded owner-scoped runtime. All births go through the normal minion
 * pipeline; this controller only owns reactions, collection and their receipts. */
export class SummonPacts {
  private states = new Map<Actor, Map<string, PactState>>();
  private cues = new Map<object, CueFlash>();
  constructor(private world: World,
    private spawn: (owner: Actor, inst: SkillInstance, opts: PactSpawn) => Actor | null) {}

  clear(): void {
    for (const cue of this.cues.values()) cue.life = 0;
    this.cues.clear(); this.states.clear();
    for (const body of [...this.world.actors]) if (!body.dead && body.summonPactReward) this.world.kill(body, true);
  }

  private state(owner: Actor, def: SummonPactDef): PactState {
    let byId = this.states.get(owner);
    if (!byId) this.states.set(owner, byId = new Map());
    let state = byId.get(def.id);
    if (!state) {
      const interval = def.kind === 'assembly' ? roll(...def.interval) : 0;
      state = { owner, def, bank: 0, bag: [], parts: [], graves: [], next: this.world.time + interval,
        echoAt: -Infinity, inst: makeSkillInstance(SKILLS[def.reward.skill], 1, 0) };
      byId.set(def.id, state);
    }
    return state;
  }

  private enabled(owner: Actor, def: SummonPactDef): boolean {
    return !owner.dead && !owner.downed && !owner.summonPactReward && owner.sheet.get(def.stat) > 0;
  }

  private reward(state: PactState, pos: Pos, learned?: SkillInstance, parts: AssemblyPart[] = []): Actor | null {
    const { owner, def } = state;
    if (!this.enabled(owner, def)) return null;
    const alive = this.world.actors.filter(a => !a.dead && a.owner === owner && a.summonPactReward === def.id);
    if (alive.length >= def.reward.maxActive) return null;
    const inst = learned ?? state.inst;
    const base = instanceDelivery(inst);
    if (base.type !== 'summon') return null;
    const form = def.reward.forms?.find(f => owner.sheet.get(f.stat) > 0);
    // Echo guests retain native lessons and socket investment, but never reserve,
    // respawn, replace a contracted body, or inherit automatic death-born heirs.
    const delivery: SummonDelivery = { ...base, persistent: undefined, replenish: undefined,
      poolGroup: undefined, exclusiveGroup: undefined, decay: undefined, shell: undefined,
      strikeRelease: undefined, crewOnDeath: undefined, duration: def.reward.duration,
      crewMods: [...(base.crewMods ?? []), ...parts.flatMap(p => p.mods)],
      crewSkills: [...new Set([...(base.crewSkills ?? []), ...(form?.crewSkills ?? []), ...parts.flatMap(p => p.skills ?? [])])],
      crewAuras: [...(base.crewAuras ?? []), ...(form?.crewAuras ?? [])],
    };
    if (form) {
      delivery.monsterId = form.monster; delivery.pool = undefined;
      if (form.replaceSkills && form.crewSkills?.length) delivery.crewRules = [{ monsterIds: [form.monster],
        replace: (MONSTERS[form.monster]?.skills ?? []).map(from => ({ from, to: form.crewSkills![0] })) }];
    }
    const body = this.spawn(owner, inst, { pact: def.id, delivery, monsterId: form?.monster, pos: { ...pos },
      noReplace: true, offspring: { maxActive: def.reward.maxActive, size: 1, life: 1, damage: 1 } });
    if (body && parts.length) {
      body.summonPactParts = parts.map(p => p.id);
      body.name = inst.def.name;
    }
    return body;
  }

  /** One final death receipt, after Undying Loyalty and downed interception.
   * Silent replacement/dismissal is excluded; natural expiry is an explicit cause. */
  death(body: Actor, cause: 'slain' | 'expire' | 'dismiss'): void {
    const owner = body.owner;
    if (!owner || body.construct || body.summonPactReward || cause === 'dismiss' || !body.isMinion()) return;
    const temporary = body.summonPactTemporary ?? (body.lifespan > 0 || !!body.decay || (cause === 'expire' && !body.undyingSpent));
    cause = body.summonPactDeathCause ?? cause;
    for (const def of SUMMON_PACTS) {
      if ((def.kind !== 'deathBank' && def.kind !== 'graveyard') || !this.enabled(owner, def)) continue;
      if (cause === 'expire' && !def.expiry) continue;
      if (def.kind === 'deathBank' && def.temporaryOnly && !temporary) continue;
      const state = this.state(owner, def);
      if (def.kind === 'deathBank') {
        state.bank = Math.min(def.threshold, state.bank + 1);
        if (state.bank >= def.threshold && this.reward(state, owner.pos)) state.bank -= def.threshold;
      } else {
        if (!sameStory(owner, body) || distance(owner.pos, body.pos) > def.ownerRadius) continue;
        // Active graves cannot charge themselves or stack another site beneath them.
        const nearest = state.graves.filter(g => g.until > this.world.time && g.tier === body.tier && distance(g.pos, body.pos) <= def.radius)
          .sort((a, b) => distance(a.pos, body.pos) - distance(b.pos, body.pos))[0];
        if (nearest?.activeAt !== undefined) continue;
        let grave = nearest;
        if (!grave) {
          if (state.graves.filter(g => g.until > this.world.time).length >= def.maxSites) continue;
          grave = { pos: { ...body.pos }, tier: body.tier, count: 0, until: this.world.time + def.gatherDuration, next: 0 };
          state.graves.push(grave);
        }
        grave.count++;
        if (grave.count >= def.threshold) {
          grave.activeAt = this.world.time; grave.until = this.world.time + def.activeDuration;
          grave.next = this.world.time; // first wave rises on the next simulation tick
        }
      }
    }
  }

  summoned(body: Actor): void {
    const owner = body.owner, source = body.summonInst;
    if (!owner || !source || body.summonPactReward || owner.summonPactReward) return;
    for (const def of SUMMON_PACTS) {
      if (def.kind !== 'echo' || !this.enabled(owner, def)) continue;
      const state = this.state(owner, def);
      if (this.world.time < state.echoAt) continue;
      const seat = this.world.seatOf(owner);
      const learned = seat ? [...seat.meta.knownSkills.values()] : owner.skills.filter((s): s is SkillInstance => !!s);
      const pool = learned.filter(inst => {
        if (inst.def.id === source.def.id || inst.def.hivecall || inst.def.throng || this.world.castReqRefusal(owner, inst)) return false;
        const d = instanceDelivery(inst);
        return d.type === 'summon' && !d.fromCorpse && !d.channelFormation && !d.shell && !!(d.monsterId || d.pool?.length);
      }).sort((a, b) => a.def.id.localeCompare(b.def.id));
      if (!pool.length) continue;
      state.echoAt = this.world.time + def.cooldown; // commit before entering the birth pipeline
      this.reward(state, body.pos, pool[Math.floor(Math.random() * pool.length)]);
    }
  }

  /** Reconcile immediately on allocation/refund as well as on world ticks. */
  reconcile(owner: Actor): void {
    const byId = this.states.get(owner);
    if (!byId) return;
    for (const [id, state] of byId) if (!this.enabled(owner, state.def) || !this.world.actors.includes(owner)) {
      for (const key of [state, ...state.parts, ...state.graves]) this.dropCue(key);
      for (const body of [...this.world.actors]) if (!body.dead && body.owner === owner && body.summonPactReward === id) this.world.kill(body, true);
      byId.delete(id);
    }
    if (!byId.size) this.states.delete(owner);
  }

  update(dt: number): void {
    for (const owner of this.states.keys()) this.reconcile(owner);
    // Only actors carrying a grant enter the registry sweep; no all-actor × pact
    // stat resolution cost in ordinary worlds. The armed-family index is cached.
    for (const owner of this.world.actors) {
      if (owner.dead || owner.downed || owner.construct || owner.summonPactReward) continue;
      for (const id of owner.sheet.armedFamily('summonPact_', ids)) {
        const def = SUMMON_PACTS.find(p => p.id === id)!;
        if (this.enabled(owner, def)) this.state(owner, def);
      }
    }
    for (const [owner, states] of this.states) {
      if (!this.world.actors.includes(owner)) { this.states.delete(owner); continue; }
      for (const state of states.values()) {
        const def = state.def;
        if (def.kind === 'deathBank') {
          if (state.bank >= def.threshold && this.reward(state, owner.pos)) state.bank -= def.threshold;
          this.paint(state, owner.pos, owner.tier, 27, def.color, { kind: 'bank', fill: state.bank / def.threshold, count: def.threshold }, dt);
        } else if (def.kind === 'graveyard') this.updateGraves(state, def, dt);
        else if (def.kind === 'assembly') this.updateAssembly(state, def, dt);
      }
    }
  }

  private updateGraves(state: PactState, def: GraveyardPact, dt: number): void {
    const now = this.world.time;
    for (let i = state.graves.length - 1; i >= 0; i--) {
      const g = state.graves[i];
      if (now >= g.until) {
        this.dropCue(g); state.graves.splice(i, 1);
        this.world.flashes.push({ pos: { ...g.pos }, radius: def.radius, color: def.color, life: 0.6, maxLife: 0.6, fx: 'summon_pact_dust', recoveryCueTier: g.tier });
        continue;
      }
      if (g.activeAt !== undefined && now >= g.next && g.tier === state.owner.tier) {
        this.reward(state, g.pos);
        g.next = now + def.interval; // no catch-up explosion after a stall
      }
      this.paint(g, g.pos, g.tier, def.radius, def.color, { kind: 'graveyard', count: g.count,
        fill: g.activeAt === undefined ? g.count / def.threshold : (g.until - now) / def.activeDuration, active: g.activeAt !== undefined }, dt);
    }
  }

  private updateAssembly(state: PactState, def: AssemblyPact, dt: number): void {
    const { owner } = state, now = this.world.time;
    if (this.world.zone.objective.kind === 'safe') { state.next = now + def.interval[0]; return; }
    for (let i = state.parts.length - 1; i >= 0; i--) {
      const p = state.parts[i];
      const take = state.bag.length < def.required && p.tier === owner.tier
        && distance(p.pos, owner.pos) <= def.pickupRadius && this.world.lineOfSight(owner.pos, p.pos, owner.tier, p.tier);
      if (take || now >= p.until) {
        if (take) state.bag.push(p.part);
        this.dropCue(p); state.parts.splice(i, 1); continue;
      }
      this.paint(p, p.pos, p.tier, 12, p.part.color, { kind: 'part', fill: 1, count: 1, shape: p.part.shape }, dt);
    }
    if (state.bag.length === def.required && this.reward(state, owner.pos, undefined, state.bag)) state.bag = [];
    if (now >= state.next) {
      state.next = now + roll(...def.interval);
      if (state.parts.length < def.maxParts) {
        for (let tries = 0; tries < 8; tries++) {
          const a = roll(0, Math.PI * 2), r = roll(...def.scatter);
          const pos = this.world.clampPos({ x: owner.pos.x + Math.cos(a) * r, y: owner.pos.y + Math.sin(a) * r }, 12, undefined, { mover: owner });
          if (distance(owner.pos, pos) < def.scatter[0] || !this.world.lineOfSight(owner.pos, pos, owner.tier, owner.tier)) continue;
          if (state.parts.some(p => p.tier === owner.tier && distance(p.pos, pos) < def.pickupRadius * 2)) continue;
          state.parts.push({ pos, tier: owner.tier, part: def.parts[Math.floor(Math.random() * def.parts.length)], until: now + def.partDuration });
          break;
        }
      }
    }
    this.paint(state, owner.pos, owner.tier, 38, def.color, { kind: 'assembly', fill: state.bag.length / def.required, count: def.required,
      parts: state.bag.map(p => ({ shape: p.shape, color: p.color })) }, dt);
  }

  private paint(key: object, pos: Pos, tier: number, radius: number, color: string, cue: SummonPactCue, dt: number): void {
    let flash = this.cues.get(key);
    if (!flash) {
      flash = { pos: { ...pos }, radius, color, life: 1, maxLife: 1, fx: 'summon_pact', recoveryCueTier: tier, summonPactCue: cue };
      this.cues.set(key, flash); this.world.flashes.push(flash);
    }
    flash.pos = { ...pos }; flash.recoveryCueTier = tier; flash.summonPactCue = cue;
    flash.life = flash.maxLife = Math.max(0.25, dt * 2);
  }
  private dropCue(key: object): void { const f = this.cues.get(key); if (f) f.life = 0; this.cues.delete(key); }

  /** Inspection only; callers cannot mutate simulation state through this view. */
  view(owner: Actor) {
    return [...(this.states.get(owner)?.values() ?? [])].map(s => ({ id: s.def.id, bank: s.bank,
      bag: s.bag.map(p => p.id), parts: s.parts.map(p => ({ pos: { ...p.pos }, tier: p.tier, id: p.part.id })),
      graves: s.graves.map(g => ({ ...g, pos: { ...g.pos } })) }));
  }
}
