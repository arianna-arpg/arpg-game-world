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
| PS-02 | Device salvage and relocation | Field Recovery | Packed Workshop | Needs overlap and ownership audit |
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

**Field Recovery** could retire an owned device and refund part of its unused
deployment investment. **Packed Workshop** could trade active device capacity
for easier redeployment. Overwound Mechanism already encourages rebuilding,
but does not itself relocate devices or refund their cost.

Audit existing recalls, construct movement, detonations, planted objects and
Extraction before choosing a new verb. The impact pass confirmed that Pinning
Spear's planted shafts and Extraction's lodged impales are distinct resources:
Extraction consumes wounds, not the planted device roster. This distinction
is evidence for further investigation, not proof that every relocation tool
is absent.

Any refund must use actual payment, have a bounded lifetime-based share, and
exclude unpaid, inherited or already retired devices. Retirement must not
also award a death burst or expiry reward. Decide whether relocation preserves
remaining life and duration, and which objects qualify. Not implemented.

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
