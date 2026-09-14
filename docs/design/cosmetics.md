# Account cosmetics and the Wardrobe

The Wardrobe is available from Menu → Wardrobe, Escape → Wardrobe, and the
Vault/Reckoning footer. It previews locked and owned choices without equipping
them. Equip saves immediately; Original appearance clears one slot. Skill
skins and colors have an account default plus optional choices per skill.
An explicit Original appearance on a skill suppresses the account default;
Use account default removes that override.

The debut catalogue has 17 entries across character skins, character effects,
footprints, avatars, skill skins, skill colors and summon skins. Ten are
included at account creation, five are earned through exploration/quests,
and two cost Mortal Essence. Purchases use the existing account credits at
the Reckoning, before its normal seal discards unassigned essence. Opening
the Wardrobe from that screen retains the original seal closure. Nothing
introduces a second wallet, gameplay power, a payment provider or a checkout.

## Content and ownership

- `engine/cosmetics.ts` defines the presentation schema, slot vocabulary,
  registry and checked `registerCosmetic` entry point.
- `data/cosmetics.ts` authors the collection, creator attribution,
  acquisition rules and visual budgets. A new entry in an existing category
  uses the same UI and resolver. Optional `skills` restricts compatibility.
- `meta/cosmetics.ts` owns equipment validation, achievement settlement,
  purchase debits, grant provenance and external entitlement reconciliation.
- `Account.cosmetics` holds receipts and equipment independently of a run.
  Save/load is additive: existing accounts keep their progression. Unknown
  mod receipts are retained; unavailable or unowned equipment is omitted
  on load. Receipts contain an item, a source and a reference.

Achievements use the existing GateRow vocabulary and account/run ledger
union. The normal progression sweep banks them while playing; opening the
Wardrobe also reconciles the durable account ledger. Use existing stamped
ledger or quest keys. A new `level`/`classLevel` condition outside the unlock
catalogue must also be enrolled in the existing milestone derivation;
the cosmetics catalogue does not manufacture those progression events.
Catalogue unlock references are not currently supported as cosmetic gates
(the resolver intentionally refuses them).

Appearance is not gameplay equipment. The paint schema contains color,
material, adornment and decorative motif. It has no modifiers, damage,
collision, targeting, delivery overrides, charge or timing fields. The
renderers derive a BodyLook copy and never mutate Actor or SkillDef combat
properties. Summons follow their owner chain, including nested summons.
Mercenaries and unowned enemies do not inherit the local account's choices;
possession keeps the foreign body's identity.

## Visual implementation

`render/vis/cosmetics.ts` supplies the same star, petal and ember painters to
the world and the Wardrobe's animated preview. Character skins reuse the
existing body/material bake and add explicit cosmetic adornments over
part-grammar bodies. Avatar sigils sit beside visible heroes. Skill skins
decorate cast releases and projectile bodies, preserving their real shape.
Recolors feed the shared execution path's direct flashes, projectiles,
tethers and fields; their child effects inherit the existing visual color
where that pipeline already carries it. Native status colors, damage-type
hit flashes and bespoke secondary effect voices retain their own color.
This is an initial coverage boundary, not a promise that every secondary
effect is recolored. Future effect-specific artwork belongs in this same
presentation vocabulary, with explicit source-skill attribution.

Footprints use renderer-owned weak actor keys, simulation time, distance
spacing, a 24-mark cap and a 2.4-second lifetime. Pause produces no marks;
teleports, zone changes, clock rewinds and equipment changes clear trails.
Flight, leaps, sailing and fallen bodies suppress them. Actor visibility
and fades govern the whole cosmetic pass. Cosmetic cast sparkles do not
enter the combat light budget. No visual painter consumes gameplay RNG.

## Co-op and future purchases

Local couch players share the account's outfit. Online guests send their
own sanitized equipment IDs at join and on Wardrobe changes. The host binds
updates to the sending seat, retains them for reseating, and snapshots
resolved appearances plus projectile/cast motifs to other clients. Missing
appearance data means native visuals, never the viewer's personal outfit.
Ownership records and wallets do not travel in appearance messages.

`reconcileCosmeticEntitlements(account, provider, products, verified)` is the
provider adapter boundary. Products map a SKU to a bundle of registered
cosmetic IDs. A trusted adapter supplies the **complete active receipt set**
for that provider; validation finishes before mutation. Replaying it is
idempotent, absent/refunded receipts are removed, independently earned
grants survive, and no longer owned equipment falls back to native. A failed
catalogue/receipt validation leaves the prior state intact. The caller must
persist successful reconciliation through the normal account save API.

This API does not verify payment. The current offline account and peer
appearance packets are user-controlled, like the rest of this prototype.
An actual paid launch needs authenticated account identity, server-side
receipt/signature verification, provider SKU mapping, durable transaction
storage, refund synchronization and entitlement validation on the host or
service. Never treat a browser flag, peer outfit or local save as evidence
of payment. There are no configured paid products or connected providers.

## Verification

`npm run probe -- cosmetics` covers category references, malformed saves,
ownership and slot checks, per-skill native/default selection, permanent
achievement claims, exactly-once currency debits, receipt replay/refunds,
owner attribution, real seeded combat parity, wire round trips and bounded
footprints. The probe is enrolled in the normal gate.

After `npm run build`, `npx electron balance/cosmetics-ui.cjs` checks the
real Wardrobe, preview/equip separation, purchases, disk reload, retained
Reckoning seal, individual skills, world rendering and compact layouts.
It uses a hidden window and disposable `balance/reports/` saves; screenshots
are written there. Run `npm run check`, the normal probe gate, balance smoke,
and game smoke when changing this integration.
