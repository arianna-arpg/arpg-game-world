# Future skills and supports

This is the central backlog for playstyle gaps discovered during skill-tree
and class passes. Proposed names are working names, not promised content.
Each candidate stays paired with the support possibilities that make it useful.

The implementation order remains: finish complete class starting bars, audit
mastery skill swaps, then give the alternate skills equivalent trees. A small,
verified gap can ship alongside a starting-bar batch. See the
[starting-tree roadmap](class-starting-skill-trees.md).

## Candidate index

| ID | Playstyle | Possible skill | Possible support | Status |
|---|---|---|---|---|
| PS-01 | Ally cooldown assistance | Borrowed Second | Shared Seconds | Confirmed narrow catalog gap; design pending |
| PS-02 | Device salvage and relocation | Field Recovery | Packed Workshop | Relocation shipped; payment-ledger salvage deferred |
| PS-03 | Deliberately preserve lodged steel between hits | Set the Barbs | Patient Steel | Needs bank-growth and multiplayer design |
| PS-04 | Faster, shorter-lived deployed attackers | Existing totems and sentries | Overwound Mechanism | Shipped in the control batch |

## PS-01 — Ally cooldown assistance

The control pass found one authored `reduceCooldowns` skill, Time Dilation.
Its effect operates on the caster. This establishes a specific missing option:
spending your action to help another actor recover an ability sooner.

**Borrowed Second** could restore a bounded amount of one ally's running
cooldown. **Shared Seconds** could divide a fixed recovery budget among nearby
allies, trading concentrated help for party coverage.

Before implementation, define target selection, a shared recovery budget,
eligible cooldowns, self and reciprocal-loop exclusions, and treatment of
minions, downed actors, other stories and multiplayer ownership. A party must
not multiply a fixed recovery budget by adding recipients. Candidate for the
mastery swap audit; not implemented.

## PS-02 — Device salvage and relocation

**User preference:** prioritize active device management as a source of new
build routes. The comparison to Forge mastery was inspiration for this
preference, not a request to reproduce another game's mechanics.

**Shipped in the [duelist batch](duelist-starting-skill-trees.md): Packed
Workshop** grants a paid Shift action that repositions one native aimed totem
or sentry. It keeps the same actor, health, remaining lifetime, payload and
action clocks; it cancels the current cast and turns the device to face its
new lane. Supported devices last 15% less time. Available in the Trapper
bundle. Exact caster/host-instance ownership, a 600-unit search radius, normal
placement reach and same-story eligibility constrain the move. No refund,
replacement, arrival effect or death/expiry reward occurs. See the batch
contract and `balance/probe_deviceworkshop.ts` for the tested boundaries.

### Overlap and ownership audit

- **Unmoored** already permits construct movement through weight, shoves and
  collisions (`massGraft`, `World.spawnConstruct`, the mass/push pipeline).
  It remains the physical displacement route; Packed Workshop offers a
  deliberate paid placement action with a new facing.
- **Holy Relic / follows** continuously moves a follower toward its owner in
  `updateConstructs`. That is not a general commanded reposition of a sentry.
- **Convocation / recallMinions** explicitly excludes constructs and recalls
  mobile minions to a ring. **Command: Recall / commandMinions** also excludes
  constructs. Tame's whistle belongs to its persistent companion contract.
- **Detonate Mines** spends mines; **Self-Destruct / detonateMinions** spends
  eligible minions and excludes constructs. Neither is recovery. Recasting
  at capacity calls `kill(oldest, true)`; that is not quiet retirement, since
  breakable-object death bursts can fire even on replacement/expiry.
- **EmbedSpec** already supplies collect/run-over, detonation, timed emission
  and sibling beams. Its fixed collection payouts are not deployment-cost
  refunds. Pinning Spear really plants devices; Planted Banderilla despite
  its name only applies wounds/taunt. **Extraction / recallImpales** spends
  lodged wounds, not the device roster. None needs a duplicate collection or
  detonation verb.
- Construct bodies carry `owner`, `sourceSkillId` and `summonInst`. The latter
  is essential: skill ID alone conflates two copies held by the same caster.
  Existing respec cleanup uses instance identity and quiet retirement.

### Field Recovery: concrete deferred implementation

The narrow remaining gap is **recovering paid deployment investment**. It
requires payment provenance rather than a new name for existing pickup
rewards. `paidCost` follows cast execution today, but bodies do not carry an
allocation ledger. Moreover, the cast record starts from the nominal cost
object: payment may draw from different resource lanes. It is not sufficient
evidence of actual mana paid for a refund.

1. Have the payment seam return actual resource debits, after substitutions,
   with a cast receipt ID. Exclude ceremonial construct payments and unpaid
   executions. Never infer a receipt from current skill cost.
2. Carry the receipt through delayed casts and planting flights. Assign a
   bounded share of that one receipt to each successfully created device;
   repeats, multiple wall segments and projectile descendants cannot each
   claim the full payment. Prefer beginning with single native aimed-device
   casts; explicitly reject unsupported receipt shapes.
3. A first salvage rule could refund at most **40% of actual mana paid ×
   remaining-life fraction**, additionally capped by that device's receipt
   share and the receipt's unpaid balance. Life/energy-shield/other lanes do
   not become mana refunds. Track original lifetime as well as remaining
   lifetime; relocation preserves both. Values remain proposed tuning.
4. Consume the receipt share atomically, then retire through a dedicated
   quiet device-retirement helper. Cancel its pending payloads and exclude
   all death, expiry, hatch, healing, collection and replacement rewards.
   Unpaid, inherited, dead, expired, respec-retired or previously salvaged
   devices have no salvage entitlement. Preserve exact caster/instance,
   active story and multiplayer authority checks.
5. Verify actual payments with substitution/discounts, repeated and delayed
   casts, multi-object deployments, competing death/expiry/respec in one
   frame, full resource pools, cross-player/cross-instance access and
   repeated requests. Ship Field Recovery only with this ledger proven.

The refund work is deliberately deferred to keep this pass centered on
complete starting bars. Packed Workshop fills the smaller verified movement
gap now, without introducing refundable value or refreshing device lifetime.

## PS-03 — Preserve lodged steel between hits

The impact pass found that Skewer and impale supports already bank physical
damage, while Extraction supplies both a wound detonation and returning-shot
payoff. The existing `impaled` status discharges on the next top-level hit.
The Lancer trees now expand bank size, spreading and the returning-shot route.
Those are covered playstyles; another ordinary impaling attack would duplicate
them.

The narrower candidate is an intentional **leave-the-steel-in** route.
**Set the Barbs** might prepare a bounded number of hits that preserve an
existing bank. **Patient Steel** might trade immediate discharge for a capped
manual Extraction payoff. First audit status retention and discharge-related
supports. Do not call this a confirmed catalog gap yet.

Resolve bank capacity and expiry, whether preservation permits additional
bank growth, mixed sources, party hits, and who may spend whose investment.
Avoid indefinite accumulation, damage duplication, and changing other players'
hit behavior without a clear rule. Not implemented.

## PS-04 — Shipped: Overwound Mechanism

Native aimed totems and sentries with a repeatable skill payload act faster
and expire sooner. The support is in the Trapper unlock bundle and has a
verified support-matrix slice. See the
[control batch](control-starting-skill-trees.md#overwound-mechanism-support).

## Adding discoveries

Give each finding a stable ID and record its playstyle, existing adjacent
skills/supports, proposed skill/support pairing, evidence, status and next
decision. Move implemented ideas to a shipped entry with their implementation
and verification links. Update existing entries when a later audit disproves
the gap; keep rejected or superseded decisions visible with their reason.
