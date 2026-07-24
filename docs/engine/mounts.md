# The Mount Fabric — cavalry as one state pair

Riding is TWO sovereign bodies sharing a saddle: `Actor.mountId` (the beast
I ride) / `Actor.riderIds` (who rides me, one per seat). Everything else —
pairing, the pin, the severance beats — is `World.updateMounts`, one sweep
that runs late among the movers (beside the cling/grab slaves) so the seat
wins the frame. Pure math and data shapes live in `engine/mounts.ts`
(`MOUNT_CFG`, `seatPos`, `seatCount`, `mountAccepts`); the verbs live in
`aiActions.ts` (`{do:'mount'}` / `{do:'dismount'}`).

## The vocabulary law

Composite **parts** are organs — rigid, xp-less, break-lesson turrets fused
to a platform (the beastkin's siegeback aurochs, the hell trebuchet). Mount
**links** are cavalry — either half may die first, tumble, flee, or ride
again. A faction that fields parts speaks *siege*; a faction that fields
links speaks *horsemanship*. Both exist on purpose; pick by what the death
of one half should mean.

## Data shapes (all on MonsterDef)

**Steed side — `mountSlot`** (`MountSlotSpec`):

```ts
mountSlot: {
  kinds: ['goblin_wolfrider'],        // who may sit: tag | def id | faction
  seats: [{ dx: -0.2, lift: 1.0 }],   // capacity IS the roster (default one)
  onRiderDeath: 'fight',              // 'fight' (default) | 'rout'
  crew: { riders: ['demonkin_darter'], count: [0, 2], chance: 0.6 },
}
```

- `seats[]` sit in the steed's **facing frame** in radius units (the
  composite-parts math: `+dx` toward the snout), then `lift` perches the
  rider **screen-up** — "on top" is a presentation truth and never rotates.
  Legacy `offsetY` (px, straight up) keeps its exact geometry until `seats`
  is authored.
- `onRiderDeath` answers the **last** rider's death: `'fight'` trusts the
  steed's own brain (the empty-saddle warg forages — its hunger drives ARE
  the feral turn), `'rout'` breaks its nerve through the morale machinery
  (a long `horrified`; a def that also carries `refuge` turns the rout into
  a true exit from the field).
- `crew` is the steed-side pairing lever: the beast **arrives manned**,
  riders minted into free seats at spawn. Crew are full actors — they
  fight, die, and pay xp as themselves.

**Rider side — `mount`** (`MountSpec`):

```ts
mount: { on: 'warg', chance: 0.5 }    // arrives mounted; the rest walk
```

Spawning this body mints its steed beneath it — any spawn path (tables,
packs, events, summons, zone-memory restores) pairs free through the lazy
sweep, the composite-parts idiom. Minted kin inherit team / faction / level
/ owner; minted bodies never pair further, so a rider-minted steed that
also declares `crew` fills its remaining seats and the depth is bounded by
construction.

## The laws

- **The pin**: rider position IS `seatPos(steed, slot, seat)` every frame —
  drawn == seated through the one resolver; dash/push stilled; the idle
  rider wears the steed's bearing, a fighting one keeps its own aim (the
  parts law). Saddle pairs are exempt from the shoulder pass (the grab-pair
  law made structural) and mounted riders cast no shadow — the steed's is
  the pair's ground contact.
- **Paint order**: the renderer paints in array order, so pairing splices
  the steed **before** its rider (and `mountSeatRider` re-files any vaulting
  rider directly behind its steed). No y-sort was harmed.
- **THE UNHORSED BEAT**: a steed dying under a live rider throws them —
  casterless tumble + the `unhorsed` status (hard CC + a damage-taken
  window, `STATUS_DEFS` row, power-inert). Killing the mount first is a
  tactic; the daze is its payoff. Dials in `MOUNT_CFG.unhorse`.
- **Severance**: links self-heal (dead/vanished partners free the other);
  a landed **grip** tears the rider from the saddle (the grab seat wins the
  frame it lands); a **willed step** through `moveActor` quits the saddle
  first, then walks (monster riders in the `'hold'` kernel never call the
  mover — a real move is deliberate: a possessed rider's stick, a command).
- **The footwork gate**: movement-tagged skills refuse from the saddle
  (`useSkill`, beside the gnaw gate) — the pin would stomp the dash the
  same frame it fired. A rider's dashes are its DISMOUNTED craft; the
  unhorse beat hands them back.
- **The remount rule is pure data**: `when: { mounted: false }` (the
  `AICondition.mounted` trigger) + `{do:'mount'}` puts an unhorsed lancer
  back on the first free saddle its kin left standing. Riderless steeds in
  the tables are the warband's spare horses.
- **Zone memory**: a paired steed never snapshots (`fromZoneGen false` —
  the remembered rider implies its steed and re-pairs fresh on restore, the
  parts law); the moment its last rider dies it turns snapshot-real
  (keep-what-stands: the widow is part of the zone's story now).
- **Two fights stacked**: each half keeps its own life, kit, brain, and
  bounty. Kill either first and the pair degrades differently — that
  asymmetry is the fabric's whole texture.

## Who rides (the faction identities)

- **Goblins — THE cavalry culture (wide)**: `goblin_wolfrider` on `warg`
  (the fused body split true; the empty-saddle look was built for this),
  `gnasher_hopper` on `cave_gnasher` (the herd as transport), the
  `goblin_warboss` astride a `great_gnasher` half his arrivals — and every
  rider remounts. Their camps keep **gnasher pens** (below).
- **Demons — the towers, deepened**: `siege_hulk` / `pyre_titan` seat two
  and arrive crewed (`crew`) — the walking-tower promise made literal.
- **Undead — one lance, in order**: `barrow_lancer` on `bone_steed`;
  spare steeds march riderless. Discipline as identity.
- **Rimebound — the coursing lance**: `hoarfrost_lancer` on `rime_hound`;
  the hound's own skirmish brain IS the cavalry maneuver.
- **Beastkin — the contrast**: the siegeback aurochs stays a `parts`
  composite. They build towers; they do not ride.

## The gnasher pen (the ambush fabric's herd face)

`data/landmarks.ts 'gnasher_pen'`: the pit builder with a `palisade` rim
(the fence IS the pen doodad-work), churned-mud floor, a rim gap for a
gate, and `spawns` armed through **`LandmarkSpawns.ambush`** — the ambush
fabric's new instance lane. The spec's new dials: `visible: true` waits in
the open (targetable, unhidden — a readable threat that simply hasn't moved
yet) and `pack` chain-springs every armed same-team kin in radius, so the
pen empties as ONE event when you stray to the fence — or put an arrow
through it (wounds spring instantly; `World.springAmbush`). Seated in every
`goblin_warren_camp` (compositions.ts), stampable anywhere goblins keep
livestock, and open to any future nest/kennel/roost. Restored zones respawn
the herd from memory un-armed — the ambush is a first-visit drama.

## Probe

`npx tsx balance/probe_mount.ts` — registry weave, seat/acceptance laws,
pairing + crew (order, ghost-snapshot state, bounded depth), the pin, the
unhorse + widow policies, the remount rule live under real AI, grip/step
severance, the footwork gate, the pen's ambush laws, no-orphans, and
determinism.
