# Skeleton Warrior: the ossuary vanguard

Summon Skeleton Warrior raises **one Warrior per cast, with a base cap of two**.
The fifteen-node tree retains two exclusive trunks and the four-point ability
budget. Tempered Bones remains the four-rank neutral life/damage investment.
Sentinels, Duelists, Assassins and Spellswords all start with the two-body cap;
Dueling Pairs adds two slots without changing bodies per cast.

## Grave Phalanx

The trunk creates shield Sentinels with 25% increased life, 15% less damage
taken and 15% block chance. They use Cleave and Challenge; **Rally!** replaces
the ordinary assault command and directs the cohort to hold a position.

| Node | Prerequisite | Behavior |
| --- | --- | --- |
| Barbed Reprisal | Grave Phalanx | A block prepares a sweeping counterattack, once per 1.5 base seconds. Adds 50% of Sentinel Thorns; inherits 35% of the keeper's Thorns. |
| Interlocking Shields | Barbed Reprisal | Nearby Sentinels grant one another 5% block and 10% increased poise per neighbor, capped at two. Shield Contact pulses against nearby enemies every 0.4 seconds. |
| Oath Banner | Barbed Reprisal | Challenges leave five-second protective ground. Rally assembles the active line, then launches shield charges in one direction. Charges leave banners on arrival. The base shared recovery is eight seconds. |
| Veteran Watch | Grave Phalanx | The eligible Sentinel with lowest percentage life intercepts 30% of an ally's incoming life wound from a hit. Range is 160; each Sentinel has a replenishing budget of 25% of its maximum life per second. |
| Last Watch | Veteran Watch | Combat death leaves a mobile spectral Sentinel for six base seconds, at 30% life and 50% damage. Four separate heir slots; heirs cannot create heirs. |
| Relief Guard | Veteran Watch | Interceptions bank 30% of the diverted wound, up to 12% of Sentinel maximum life. Relief Pulse spends the reserve every two seconds. Quiet Vigil also heals nearby allies for 0.1% of the Sentinel's maximum life each second. |

Barbed Reprisal and Interlocking Shields have exchanged tree positions.
Rally finishes assembling before charging; it waits for casting and attack
recovery instead of spending its shared clock on a busy unit. An obstructed
line has a bounded assembly window. Ordinary taunts retain priority.

An intercepted wound is already past the protected actor's mitigation. The
Sentinel then applies its own defenses to its share. Redirected packets cannot
redirect again; damage over time does not enter this hit-only path. The
original attacker remains the source, and flat on-hit sustain is paid only
once. Relief uses a shared recipient ceiling of 6% maximum life per second;
healing power can improve the payout, and full-health recipients do not waste
the reserve.

Specters retain the original summon instance, inherited defenses, support
routing and the rest of the tree. They have a spectral overlay on the Sentinel
body, use ordinary movement and Rally behavior, and remain outside the adult
cap. Silent dismissal and lifespan expiry cannot raise heirs.

## Ossuary Duelists

The trunk creates mobile Duelists using Twin Cut. **Pursue!** commands a visible
quarry or location.

| Node | Prerequisite | Behavior |
| --- | --- | --- |
| Flensing Cadence | Ossuary Duelists | Every third completed primary attack becomes Rending Cut, a wider bleeding slash. Native swings and supported repeats do not advance the counter again. |
| Death Warrant | Flensing Cadence | Commanding an enemy applies an eight-second mark. The next landed Rending Cut from this cohort consumes it for 150% more damage. |
| Ossuary Assassins | Flensing Cadence | Converts Duelists to Assassins with Backstab and Grave Veil. They assess actual rear openings, attempt bounded flanking, retain normal attack cadence, and cloak to reposition or retreat at low life. |
| Line Breakers | Ossuary Duelists | Grants Bone Lunge and an instant Bone Shuriken. The AI strongly prefers lunging into melee; shuriken covers the approach while the lunge recovers. |
| Runebound Blades | Line Breakers | Choose Fire, Cold, Lightning, Venom, or a mixture. Spellswords convert 60% of physical ability damage and receive an elemental art. |
| Dueling Pairs | Line Breakers | Adds two cap slots. Stable pairs invite one Pincer Strike after a successful lunge, with a five-second shared recovery and a bounded wait through attack recovery. |

Death Warrant uses the ordinary attributed status path, with curse tags for
potency and duration scaling, without a curse-zone slot. Immunity, cleansing
and actual status expiry govern the bonus. Marks are separate by owner and
cohort; one completed attack's repeats cannot consume a newly applied warrant.

Spellsword schools provide **Cinder Crescent**, **Wintersteel Ring**,
**Arcing Edge** and **Miasmic Edge** respectively. Conversion and tint apply
to Twin Cut, Rending Cut, Bone Lunge and Bone Shuriken, plus any compatible
physical payload present in the kit. School choices favor underrepresented
selected forms when summoning.

## Node choices and ability supports

Click **Grave Conclave** in the Mage tree or **Runebound Blades** in the
Warrior tree to open an anchored multi-choice popup using the passive tree's
presentation. Apply a nonempty selection; Close or Escape cancels the draft.
Changes retire that skill's existing minions and captured fields.
Applying an unchanged selection preserves them. Choices persist through saves
and authoritative co-op intents, and the node tooltip lists the selection.

Every active art has its own SkillDef, tags, timing, delivery and compatible
support lane. The existing Resonance requirement still governs crew forwarding.
The summon census includes auxiliary arts and each selected elemental variant;
the actual instances use that same conversion. Live socket changes update the
auxiliary kit and healing aura. Rending Cut is selected before payment and
windup, so its own supports and use time apply.

## Authoring and verification

- skeletonWarriorTree.ts authors the tree and school choices.
- skeletonWarriorSkills.ts authors abilities and forms.
- CohortSpec contains the tactical parameters; CohortArts resolves them
  without branching on node or species IDs.
- Shared GroundDelivery.domain.stackGroup prevents overlapping banners from
  stacking. Normal field retirement removes protection on respec.
- AuraPulse.healAllies.base = 'casterMaxLife' exposes the source-life healing
  basis for other configurable auras.
- ActorW.spectralVeil carries the paint-only spectral overlay to peers.

Run npm run check, the skeletonwarrior/skeletonmage/skeletonarcher probes,
necromancercourts, nestednecromancer, supportfabric, companionstance, guardbash,
stealth, skillmodes and the affected visual catalogues; then sim smoke and build.
Run balance/skeleton-mage-ui.cjs and balance/skeleton-warrior-ui.cjs
sequentially in hidden Electron clients after building.
