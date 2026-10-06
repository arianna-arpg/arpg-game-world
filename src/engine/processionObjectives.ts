import type { Actor } from './actor';
import { angleTo, dist, type Vec2 } from '../core/math';
import { PROCESSION_CFG } from '../data/processions';
import { transitDwell, transitRadius, transitReach, transitOf, type DwellReach, type TransitRing } from '../data/transit';
import type { ExitRoadSpec, ObjectiveSpec, PackTableEntry } from '../data/zones';
import type { NativeHoldRandom } from './holdObjectives';

export type NativeProcessionSpec = Extract<ObjectiveSpec, { kind: 'procession' }>;
type Frozen<T> = T extends readonly (infer U)[] ? readonly Frozen<U>[]
  : T extends object ? { readonly [K in keyof T]: Frozen<T[K]> } : T;

/** Native registry values are copied at birth, never re-read by a saved owner.
 * The owning definition separately retains the complete resolved ZoneDef,
 * ObjectiveSpec, physical route and source/birth proofs. */
export interface NativeProcessionConfig {
  readonly cartId: string;
  readonly lifeBase: number;
  readonly lifePerLevel: number;
  readonly speedMul: number;
  readonly arriveDist: number;
  readonly entryGraceSec: number;
  readonly rallyDwell: number;
  readonly rallyRadius: number;
  readonly rallyReach: DwellReach;
  readonly rallyRing?: Frozen<TransitRing>;
  readonly robRadius: number;
  readonly lureRadius: number;
  readonly lurePace: number;
  readonly lureStandoff: number;
  readonly lureLinger: number;
  readonly puffEvery: readonly [number, number];
  readonly puffCount: readonly [number, number];
  readonly puffCap: number;
  readonly puffLead: number;
  readonly puffJitter: number;
  readonly fixation: Readonly<{ stickiness: number; decay: number; seedThreat: number }>;
  readonly robbers: readonly Frozen<PackTableEntry>[];
  /** Authored road policy. The route compiler must also freeze the native
   * carveApproachRoad/layTraveledWay output and resolved geometry defaults. */
  readonly road: Frozen<ExitRoadSpec>;
  readonly accent: string;
  readonly smoke: string;
  readonly rallyFlare: Readonly<{ radius: number; life: number }>;
  readonly arrivalFlare: Readonly<{ radius: number; life: number }>;
  readonly wreckFlare: Readonly<{ radius: number; life: number }>;
  readonly ambushFlare: Readonly<{ radius: number; life: number }>;
}

/** Validate a historical frozen native configuration without substituting the
 * current registry. Saved tuning remains authoritative across data changes. */
export function validateNativeProcessionConfig(c:NativeProcessionConfig):void {
  const positive=['lifeBase','speedMul','arriveDist','rallyDwell','rallyRadius','robRadius','lureRadius','lureLinger'] as const;
  const nonnegative=['lifePerLevel','entryGraceSec','lurePace','lureStandoff','puffLead','puffJitter'] as const;
  const band=(v:readonly number[],integer=false)=>Array.isArray(v)&&v.length===2&&v.every(n=>Number.isFinite(n)&&n>0&&(!integer||Number.isSafeInteger(n)))&&v[0]<=v[1];
  if(!c||!c.cartId||positive.some(k=>!Number.isFinite(c[k])||c[k]<=0)||nonnegative.some(k=>!Number.isFinite(c[k])||c[k]<0)
    ||!['radius','sight','roof'].includes(c.rallyReach)||!band(c.puffEvery)||!band(c.puffCount,true)
    ||!Number.isSafeInteger(c.puffCap)||c.puffCap<1||c.puffCap>64
    ||!c.fixation||Object.values(c.fixation).some(v=>!Number.isFinite(v)||v<0)
    ||!Number.isFinite(c.fixation.stickiness)||!Number.isFinite(c.fixation.decay)||!Number.isFinite(c.fixation.seedThreat)
    ||!Array.isArray(c.robbers)||!c.robbers.length||c.robbers.some(e=>!e.id||!Number.isFinite(e.weight)||e.weight<=0)
    ||!c.road||c.road.from!=='entry'||c.road.overgrowth!==0||typeof c.accent!=='string'||!c.accent||typeof c.smoke!=='string'||!c.smoke
    ||[c.rallyFlare,c.arrivalFlare,c.wreckFlare,c.ambushFlare].some(f=>!f||!Number.isFinite(f.radius)||f.radius<=0||!Number.isFinite(f.life)||f.life<=0))
    throw Error('Invalid frozen native procession configuration');
  if(c.rallyRing&&Object.values(c.rallyRing).some(v=>typeof v==='number'&&(!Number.isFinite(v)||v<0)))throw Error('Invalid frozen procession rally ring');
}

function frozenCopy<T>(source: T): T {
  const value = JSON.parse(JSON.stringify(source)) as T;
  const freeze = (v: unknown): void => {
    if (!v || typeof v !== 'object') return;
    for (const child of Object.values(v)) freeze(child);
    Object.freeze(v);
  };
  freeze(value);
  return value;
}

/** Ordinary finite callers may resolve on their active native source; a
 * geographic caller resolves once and saves the full result. No RNG draw. */
export function nativeProcessionConfig(spec: NativeProcessionSpec): NativeProcessionConfig {
  const c = PROCESSION_CFG, ring = transitOf('procession')?.ring;
  return frozenCopy({
    cartId: c.cartId, lifeBase: c.lifeBase, lifePerLevel: c.lifePerLevel,
    speedMul: spec.speedMul ?? c.speedMul, arriveDist: c.arriveDist,
    entryGraceSec: c.entryGraceSec,
    rallyDwell: transitDwell('procession', 0.9),
    rallyRadius: transitRadius('procession', 96), rallyReach: transitReach('procession'),
    ...(ring ? { rallyRing: ring } : {}),
    robRadius: c.robRadius, lureRadius: c.lureRadius, lurePace: c.lurePace,
    lureStandoff: c.lureStandoff, lureLinger: 0.6,
    puffEvery: [spec.puffEvery?.[0] ?? c.puffEvery[0], spec.puffEvery?.[1] ?? c.puffEvery[1]],
    puffCount: [...c.puffCount], puffCap: c.puffCap, puffLead: c.puffLead,
    puffJitter: c.puffJitter, fixation: c.fixation, robbers: spec.robbers ?? c.robbers,
    road: c.road, accent: c.accent, smoke: c.smoke,
    rallyFlare: { radius: 80, life: 0.5 }, arrivalFlare: { radius: 110, life: 0.7 },
    wreckFlare: { radius: 90, life: 0.7 }, ambushFlare: { radius: 42, life: 0.5 },
  } satisfies NativeProcessionConfig);
}

/** Live scene-frame coordinates only. A geographic save encodes these points
 * as MassAddress values, then reprojects on mount; do not persist a rebased
 * numeric frame as though it were a durable geographic address. */
export interface NativeProcessionState {
  cartId: number | null;
  rolling: boolean;
  started: boolean;
  startPos: Vec2;
  dest: Vec2;
  /** Ordinary scene crossing index; geographic owners use their frozen route. */
  destIdx: number | null;
  dwellStart: number;
  puffAt: number;
  heading: number;
  /** Finite adapter forwards World.zoneEnteredAt. */
  enteredAt: number;
  done: boolean;
  lost: boolean;
}

export interface NativeProcessionAmbushHost {
  random: NativeHoldRandom;
  /** Native tag census across the same physical objective zone, including
   * dormant living owner rows. Do not count unrelated far-away processions. */
  robbersAlive(): number;
  /** Detached native factory/publication boundary. Capacity for the native
   * maximum MUST be secured by admission before rally; never truncate a
   * scheduled request, consume it without bodies, or re-roll it next frame.
   *
   * Native loop for each of count bodies: weightedPick(config.robbers,level),
   * skip unknown MONSTERS in the finite caller, createMonster(enemy), draw
   * X/Y jitter at cart + heading*puffLead, findFreeSpot(radius+2) or
   * clampNear(cart,150), clampPos(radius), tag/eventKey, exact fixation tuning
   * and addThreat(cart.id)/aiTargetId, enroll, native smoke flash42/.5.
   * Geographic admission refuses unknown source species before this point.
   * Return the actual published count; the shared driver preserves the old
   * presentation draw only for a nonempty group, without narrating it.
   */
  spawnAmbush(cart: Actor, heading: number, count: number, config: NativeProcessionConfig): number;
}

export interface NativeProcessionHost extends NativeProcessionAmbushHost {
  now: number;
  player: Actor;
  actorById(id: number): Actor | null;
  /** Actual World.dwellReachable(player.pos,cart.pos,reach,storyPair(...)). */
  reachable(player: Actor, cart: Actor, reach: DwellReach): boolean;
  /** Actual World.enemiesOf(cart). Driver retains native !dead/!passive and
   * radius110 rule; do not quietly replace it with owner-only bandit census. */
  enemiesOf(cart: Actor): readonly Actor[];
  /** Finite host uses nativeProcessionSteering below. Geographic host follows
   * certified adjacent waypoints inside the native bounded path field. It
   * must never snap/teleport the Actor or assume the final destination is a
   * locally searchable goal. Dynamic blocking remains native movement. */
  steering(cart: Actor, destination: Vec2): Vec2;
  move(cart: Actor, dx: number, dy: number, dt: number): void;
  /** Ordinary host uses 'procession'; geographic host uses a stable owner ID.
   * Forward cart.tier, radius/pace/standoff and native0.6s lease unchanged. */
  lure(cart: Actor, config: NativeProcessionConfig): void;
  flash(pos: Vec2, radius: number, color: string, life: number): void;
  /** Source-context native dropGemAt; owning receipt makes the wreck pay once.
   * Missing cart causes loss but NO invented wreck drop, exactly as native. */
  wreck(cart: Actor): void;
  /** Must call ordinary native completion before copying state.done onto
   * World.objectiveDone (completeObjective refuses an already-done scene).
   * Geographic host owns its receipt and sets state.done before actual reward
   * publication, so a synchronous checkpoint sees a coherent terminal owner.
   * No kill rewards for the cart's successful disappearance. */
  win(state: NativeProcessionState): void;
  /** Latches forfeiture BEFORE wreck payout, preserving native branch order;
   * never opens a sealed road or resets an attempt. No narration. */
  lose(): void;
}

/** Native finite path-field selection, including its existing straight
 * fallback. The geographic adapter must provide bounded certified waypoints
 * instead of using this helper with a distant country destination. */
export function nativeProcessionSteering(cart: Actor, destination: Vec2, field: {
  pathStep?(from: Vec2, to: Vec2): Vec2 | null;
  lineWalkable?(from: Vec2, to: Vec2): boolean;
} | null): Vec2 {
  if (field?.pathStep && !(field.lineWalkable?.(cart.pos, destination) ?? false))
    return field.pathStep(cart.pos, destination) ?? destination;
  return destination;
}

/** Called only after the native driver advances the due deadline. Cap-full
 * skips the count draw, and successful groups draw count before species or
 * factory draws. No first-frame instant ambush and no catch-up while loop. */
export function driveNativeProcessionAmbush(heading: number, cart: Actor,
  config: NativeProcessionConfig, host: NativeProcessionAmbushHost): void {
  const alive = host.robbersAlive();
  if (alive >= config.puffCap) return;
  const count = Math.min(host.random.int(config.puffCount[0], config.puffCount[1]), config.puffCap - alive);
  if (host.spawnAmbush(cart, heading, count, config) > 0) host.random.range(-10, 10);
}

/** Exact native order: loss → dormant rally → lure → wheel-stop/move →
 * due ambush → arrival. In particular, an arrival frame may first spawn its
 * due ambush; a mobbed cart can still arrive when already within84px.
 * No render-chunk lifecycle or enrollment work belongs in this function. */
export function driveNativeProcession(dt: number, state: NativeProcessionState,
  config: NativeProcessionConfig, host: NativeProcessionHost): void {
  if (state.done || state.lost || state.cartId == null) return;
  const cart = host.actorById(state.cartId);
  if (!cart || cart.dead) {
    state.lost = true;
    host.lose();
    if (cart) {
      host.wreck(cart);
      host.flash({ ...cart.pos }, config.wreckFlare.radius, config.smoke, config.wreckFlare.life);
    }
    state.cartId = null;
    return;
  }
  if (!state.rolling) {
    if (host.now - state.enteredAt < config.entryGraceSec) { state.dwellStart = 0; return; }
    const engaged = !host.player.dead && dist(host.player.pos, cart.pos) <= config.rallyRadius
      && host.reachable(host.player, cart, config.rallyReach);
    if (!engaged) { state.dwellStart = 0; return; }
    if (state.dwellStart === 0) state.dwellStart = host.now;
    if (host.now - state.dwellStart >= config.rallyDwell) {
      state.rolling = true;
      state.started = true;
      state.puffAt = host.now + host.random.range(config.puffEvery[0], config.puffEvery[1]);
      cart.untargetable = false;
      cart.invulnerable = false;
      // The removed local text consumed one jitter draw here. Preserve the
      // native stream without recreating its redundant narration.
      host.random.range(-10, 10);
      host.flash({ ...cart.pos }, config.rallyFlare.radius, config.accent, config.rallyFlare.life);
    }
    return;
  }
  host.lure(cart, config);
  const robbed = host.enemiesOf(cart).some(e => !e.dead && !e.passive && dist(e.pos, cart.pos) <= config.robRadius);
  if (!robbed) {
    const to = host.steering(cart, state.dest);
    state.heading = angleTo(cart.pos, to);
    cart.facing = state.heading;
    host.move(cart, to.x - cart.pos.x, to.y - cart.pos.y, dt * config.speedMul);
  }
  if (host.now >= state.puffAt) {
    state.puffAt = host.now + host.random.range(config.puffEvery[0], config.puffEvery[1]);
    driveNativeProcessionAmbush(state.heading, cart, config, host);
  }
  if (dist(cart.pos, state.dest) <= config.arriveDist) {
    host.flash({ ...cart.pos }, config.arrivalFlare.radius, config.accent, config.arrivalFlare.life);
    cart.dead = true; // Native disappearance, deliberately NOT World.kill.
    state.cartId = null;
    // Native completeObjective sets its own latch before paying. Setting an
    // aliased latch before this callback would silently suppress its reward.
    host.win(state);
    state.done = true;
  }
}

/** Native scene absence policy: rerally where the cart was left, without
 * repairing its wounds or advancing its road. Used only after true absence
 * or Continue, never just because an adjacent render chunk was evicted.
 * The caller first reconstructs the actual saved cart and complete owned
 * robber graph, and rejects terminal states before any actor allocation. */
export function pauseNativeProcession(state: NativeProcessionState, cart: Actor): void {
  if (state.done || state.lost || cart.dead) throw Error('Cannot rerally a terminal native procession');
  state.cartId = cart.id;
  state.rolling = false;
  state.dwellStart = 0;
  state.puffAt = 0;
  state.heading = angleTo(cart.pos, state.dest);
  cart.untargetable = true;
  cart.invulnerable = true;
  // started, startPos, destination, source config, life/resources and native
  // survivor receipts intentionally remain untouched. Next rally takes one
  // fresh native beat draw from this owner's saved stream, as finite re-entry.
}

/** Return starts native entry grace even when foreign dependencies kept the
 * waiting Actor resident throughout the absence. */
export function rerallyNativeProcession(state: NativeProcessionState, cart: Actor, now: number): void {
  pauseNativeProcession(state, cart);
  state.enteredAt = now;
}

/* Integration acceptance before publication:
 * - Independent transcription compares branch/event trace AND next RNG draw
 *   for grace/reset, exact dwell edge, robbed clocks, cap-full, missing cart,
 *   dead cart, due+arrival same frame, and no completion on rally frame.
 * - Compare actual World ambush factory stats/species/position/fixation/target
 *   against original loop, preserving retired narration jitter draws too.
 * - Finite objective suite retains X7–X14 sealed/open win/loss policy.
 * - Mass route is complete and body-swept before birth; actual cart crosses
 *   >=3chunks on native movement without world/zone replacement or teleport.
 * - Real wounded cart + threatening robbers survive CharacterSave/cellar
 *   Continue with ID remap and native rerally; streaming refuses open refs.
 * - Once arrival XP/chest vs once wreck gem/no XP, no evict/reload retry.
 * - Two owners retain separate lure IDs/receipt graphs; foreign effects pin.
 * - On-screen rally/ambush/arrival/loss narration absent; native flares, ring,
 *   actual bodies, road ground and reward presentation remain.
 *
 * Integration risks identified during draft review:
 * - State.done may alias World.objectiveDone: never latch before win callback.
 *   Mass win owns its receipt/latch before payout; finite uses completeObjective.
 * - Capacity reservation is a real upstream requirement, not implemented here:
 *   secure cart+native living-robber cap before publishing/rallying, and have
 *   every other population consumer respect it. The native own-cap truncation
 *   (e.g.8 living ->1 birth) remains valid; a foreign shared-cap truncation is not.
 * - This helper owns no save codec. Native memo only stores loss/start/location/
 *   life/destination index, discarding rolling/dwell/puff and active actor timers.
 *   Rerally must not be sold as exact active-combat resumption or applied per chunk.
 * - Generic enemy dormancy refuses a player-team cart; prove its exact driven
 *   owner and full robber/foreign-reference closure, never flip its team or omit it.
 * - Removing native text removes global jitter draws, intentionally. Mechanical
 *   parity compares silent native callbacks; old global post-text RNG identity is
 *   not promised. Source roster/presence and native factory draw order still are.
 * - Full route/arrival apron must support cart18px plus escort; current12px
 *   local hold proofs do not. No invalid distant straight-steering fallback.
 * - Sealed loss, quest hooks and memory-TTL retry require their actual owners;
 *   first open geographic admission refuses those unsupported source contexts.
 */
