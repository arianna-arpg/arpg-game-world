// ---------------------------------------------------------------------------
// HOLDFAST — the locked-bonus-exit registry (DATA).
//
// On entering an UNCHARTED zone there's a chance a fortified, LOCKED bonus exit is
// raised in addition to the normal exits — a side path you must EARN. A guardian
// faction holds the gate (the Bandit toll-wardens are the first), and an UNLOCK
// condition opens it (pay a gem, pay currency, cull a faction, clear an adjacent
// event…). Each guardian + condition + reward is one HoldfastDef literal, so a new
// holdfast (a Goblin camp on a cave, a true coin toll, a temple gate) is PURE DATA.
//
// Pure leaf: only declarative types + the registry literals. The engine runtime
// (placeHoldfast / the dwell-pay / the unlock) lives on World; the persistent
// per-zone lock state lives on the HoldfastField overlay. Mirrors encounters.ts.
// ---------------------------------------------------------------------------

/** HOW a holdfast opens. v1 implements 'pay-gem'; the rest are typed for the data
 *  model (a future entry fills in one resolver branch, no type churn). */
export type UnlockKind = 'pay-gem' | 'pay-currency' | 'cull-faction' | 'event-adjacent';

export interface UnlockSpec {
  kind: UnlockKind;
  /** pay-gem: 'random-take' (a warden seizes one at random) or 'drop-to-choose'
   *  (you pick which to surrender, and the choice steers the hidden road). */
  payment?: 'random-take' | 'drop-to-choose';
  /** pay-gem: which loose gem pool to take from (default 'support'). */
  gemKind?: 'support' | 'skill';
  /** pay-currency (future): the currency + cost (a true toll booth). */
  currency?: 'offerings' | 'echoes'; cost?: number;
  /** cull-faction (future): slay N of this faction IN this zone to open. */
  cullFaction?: string; cullCount?: number;
  /** event-adjacent (future): a charted adjacent zone must carry this ledger key. */
  requiresLedger?: string;
}

/** A destination THEME override applied when the bonus exit mints (drop-to-choose:
 *  the surrendered gem dictates what lies beyond). Pure data — resolved at mint. */
export interface HoldfastDest {
  /** Force the minted zone's tileset (→ biome/theme/packs). */
  tileset?: string;
  /** Force a faction's full roster as the minted zone's packs. */
  faction?: string;
  /** Level delta vs the radial difficulty field. */
  levelDelta?: number;
}

export interface RewardSpec {
  /** v1 implements 'open-exit'; the rest are typed for the data model. */
  kind: 'open-exit' | 'open-cave-sidezone' | 'temp-vendor';
  /** open-exit: bias the bonus zone's level vs the heat-map field (default 0 = obey). */
  destLevelDelta?: number;
  /** drop-to-choose: the surrendered gem's primary TAG → a destination theme. The
   *  "which gem you give dictates what spawns" lever. Keyed by SupportDef.requiresTags. */
  gemTagToDest?: Record<string, HoldfastDest>;
  /** temp-vendor (future): a guard who stands a stall instead of barring a path. */
  vendorMonsterId?: string;
  vendorStock?: { supportId?: string; skillId?: string }[];
}

/** WHO holds the gate. The guards are NEUTRAL until provoked — a wounding strike
 *  (past woundFrac) rouses the whole gang within rouseRadius (so accidental splash
 *  never starts a fight). The keeper is the designated dwell-target you pay. */
export interface GuardianSpec {
  factionId: string;
  keeperId: string;
  /** Extra guards posted around the gate (rolled from the faction roster if omitted). */
  rosterIds?: string[];
  count: [number, number];
  /** Actor tag → the AI dormancy gate + the resolveHit rouse (DORMANT_TAGS). */
  neutralTag: string;
  rouseRadius: number;
  woundFrac: number;
}

/** One guardian-at-a-gate definition — the extensible unit. */
export interface HoldfastDef {
  id: string;
  name: string;
  /** STRUCTURES key stamped around the bonus-exit portal (the fortification). */
  structure: string;
  guardian: GuardianSpec;
  unlock: UnlockSpec;
  reward: RewardSpec;
  /** Bulletin shown when the player nears the sealed exit. */
  sealedHint: string;
  /** Relative likelihood this guardian is the one rolled at a hosting zone. */
  weight: number;
  /** Zone-level band this guardian appears in (bandits = low; a temple = high). */
  minLevel: number; maxLevel?: number;
  /** On the LAST guard's death while unpaid: chance the gate bursts open (0 = always
   *  reroute / stays sealed; a small value = a risk/reward gamble). */
  slaughterOpensChance: number;
  /** Map marker for a sealed holdfast (fog:'charted'). */
  marker?: { glyph: string; color: string };
  /** Per-instance VISUAL VARIANTS rolled at placement (so gates aren't all identical):
   *  a gravel ROAD running through the gate aligned to the exit (the toll reads as a
   *  maintained, deliberate waypost), and/or a campfire. Each is an independent chance. */
  decor?: { roadChance?: number; campfireChance?: number };
}

/** Global Holdfast knobs carried by the package (the gate config + the registry). */
export interface HoldfastSurge {
  /** Per uncharted-zone base chance a holdfast is raised (×ignitionMul ×encounterDensity). */
  openChance: number;
  /** The OFF-CENTER locales the bonus exit may roll along its wall (fractions
   *  of the side's span — deliberately never 0.5, so a holdfast reads as a
   *  side path, not the main road). */
  exitLocales: number[];
  /** The guardian registry — add an entry, get a new holdfast (pure data). */
  defs: HoldfastDef[];
}

// --- the BANDIT TOLL-GATE: the first guardian (two payment flavours so both the
//     random-take AND the drop-to-choose paths ship live + tested) ----------------

const BANDIT_GUARDIAN: GuardianSpec = {
  factionId: 'bandit', keeperId: 'bandit_keeper',
  rosterIds: ['bandit_cutthroat', 'bandit_bruiser'],
  count: [2, 3], neutralTag: 'toll_bandit',
  rouseRadius: 230, woundFrac: 0.66, // only a real wound rouses them — and then the whole gang
};

const BANDIT_MARKER = { glyph: '⚑', color: '#c8a04a' };

/** A warden seizes ONE of your loose support gems at random; the gate opens. */
export const BANDIT_TOLLGATE: HoldfastDef = {
  id: 'bandit_tollgate', name: 'Roadwarden Toll',
  structure: 'toll_gate', guardian: BANDIT_GUARDIAN,
  unlock: { kind: 'pay-gem', payment: 'random-take', gemKind: 'support' },
  reward: { kind: 'open-exit', destLevelDelta: 0 },
  sealedHint: 'the toll-gate bars the way — pay the wardens, or find another road',
  weight: 2, minLevel: 1, slaughterOpensChance: 0.1, marker: BANDIT_MARKER,
  decor: { roadChance: 0.5, campfireChance: 0.55 },
};

/** The wardens let you CHOOSE which gem to surrender — and the gem you give steers
 *  what waits down the road (a martial gem → a brute warren, an arcane gem → a crypt…). */
export const BANDIT_TOLLGATE_CHOICE: HoldfastDef = {
  id: 'bandit_tollgate_choice', name: "Roadwarden's Bargain",
  structure: 'toll_gate', guardian: BANDIT_GUARDIAN,
  unlock: { kind: 'pay-gem', payment: 'drop-to-choose', gemKind: 'support' },
  reward: {
    kind: 'open-exit', destLevelDelta: 0,
    // The surrendered gem's primary tag picks the hidden road's flavour (any tag not
    // listed → the default heat-map mint). Resolved against SupportDef.requiresTags.
    gemTagToDest: {
      melee: { faction: 'gnoll' }, physical: { faction: 'gnoll' }, attack: { faction: 'gnoll' },
      spell: { faction: 'elemental' }, fire: { faction: 'elemental' }, cold: { faction: 'elemental' }, lightning: { faction: 'elemental' },
      summon: { faction: 'undead' },
      projectile: { faction: 'wild' }, aoe: { faction: 'wild' },
    },
  },
  sealedHint: 'the wardens will bargain — offer a gem of your choosing',
  weight: 1, minLevel: 1, slaughterOpensChance: 0.1, marker: BANDIT_MARKER,
  decor: { roadChance: 0.5, campfireChance: 0.55 },
};

/** The guardian registry (the open seam — Goblin-cave / coin-toll / temple are
 *  future literals here, each pure data once its one resolver branch is filled). */
export const HOLDFAST_DEFS: HoldfastDef[] = [BANDIT_TOLLGATE, BANDIT_TOLLGATE_CHOICE];

export const HOLDFAST_SURGE: HoldfastSurge = {
  openChance: 0.22, // ~1 in 5 uncharted zones raises a holdfast (×density ×pressure)
  exitLocales: [0.2, 0.32, 0.68, 0.8],
  defs: HOLDFAST_DEFS,
};
