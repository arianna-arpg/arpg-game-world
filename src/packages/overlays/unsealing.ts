// ---------------------------------------------------------------------------
// UNSEALING FIELD — the four-talisman tomb ledger (pure overlay).
//
// The Unsealing lives entirely in the SEPULCHER SANDS side-zones (off-graph
// pockets — no graph mover, no clock): each pocket's SEED decides its role
// once and forever (roleFor — pure hash, the same answer on every client and
// every revisit). One role is THE REGENT'S TOMB: a sealed door behind four
// talisman braziers. Four are CANOPIC HOSTS: a jar-crowned seal-bearer keeps
// the vault, and slaying it FLARES its talisman on every Regent door in the
// world. This field is the durable ledger those pockets share — which wards
// burn, where the first-found tomb sits (the overworld marker's anchor), and
// whether the Regent has already been unmade. The ENGINE materializes all
// in-zone content (world.materializeUnsealing) and calls flare()/
// onRegentSlain() back from the kill rows; this field never spawns a thing.
//
// The gate fabric synthesis (the cleanest of the four): ward-seal FACE-SWAP
// visuals (cold brazier → lit), a lesson-door CHECK-AT-LOAD unlock keyed to
// this RUN-scoped ledger instead of the account, and the holdfast's
// roll-once-remember durability mold.
// ---------------------------------------------------------------------------

import type { World } from '../../engine/world';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { NO_BIAS, type MapLayer, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import type { OverlayBuildCtx } from '../types';
import type { UnsealingRole, UnsealingSurge } from '../unsealing';

/** Integer hash (the blend/biome family) — the pure per-pocket role die. */
function hashSeed(seed: number, salt: number): number {
  let h = (salt ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (seed | 0), 0x85ebca6b) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; h ^= h >>> 16;
  return h >>> 0;
}

export class UnsealingField implements WorldOverlay {
  readonly id = 'unsealing';
  /** Durable: the flared wards + the found tomb ARE the feature — a talisman
   *  lit on Tuesday burns across every relaunch until the Regent falls. */
  readonly persistence = 'durable' as const;

  private readonly cfg: UnsealingSurge;
  /** Ward ids currently aflame (⊆ cfg.wards ids). */
  private flaredWards = new Set<string>();
  /** The FIRST-FOUND tomb: the on-graph zone hosting the pocket's mouth (the
   *  marker anchor — pockets are off-graph) + the pocket id itself. Later
   *  tomb-rolled pockets still function; the map names the first. */
  private tomb: { parentZoneId: string; pocketId: string } | null = null;
  private regentDown = false;

  constructor(_ctx: OverlayBuildCtx, surge: UnsealingSurge) {
    this.cfg = surge;
  }

  // --- WorldOverlay (a STATE STORE; the engine drives every runtime beat) ----
  update(): void { /* nothing ticks — the ledger only moves on kills/entries */ }
  onNodeCharted(): void { /* pockets are off-graph; nothing to chart */ }
  affectSpawns(): SpawnBias { return NO_BIAS; }
  renderMap(): MapLayer { return { under: '', over: '' }; } // the marker rides registerMarkerSource

  /** A found, still-sealed tomb keeps its HOST zone restless (the bloom's
   *  activity read — the door below is a standing promise). */
  activityAt(zoneId: string): number {
    return this.tomb && this.tomb.parentZoneId === zoneId && !this.regentDown ? 0.5 : 0;
  }

  // --- engine-facing API ------------------------------------------------------

  /** Live config (every count/chance/radius the materializer reads). */
  surge(): UnsealingSurge { return this.cfg; }

  /** THE ROLE DIE: what this pocket seed hosts — pure + stateless, so mints,
   *  revisits, and both co-op sides always agree. Tomb and canopic rolls are
   *  exclusive; everything else is an ordinary pocket. */
  roleFor(seed: number): UnsealingRole {
    const h = hashSeed(seed, 0x7e3b) / 0x100000000;
    if (h < this.cfg.tombChance) return { kind: 'tomb' };
    if (h < this.cfg.tombChance + this.cfg.canopicChance) {
      const w = hashSeed(seed, 0x19c7) % this.cfg.wards.length;
      return { kind: 'canopic', ward: this.cfg.wards[w].id };
    }
    return { kind: 'none' };
  }

  /** Flare a ward's talisman (idempotent). True if it JUST lit. */
  flare(wardId: string): boolean {
    if (!this.cfg.wards.some(w => w.id === wardId) || this.flaredWards.has(wardId)) return false;
    this.flaredWards.add(wardId);
    return true;
  }

  flared(wardId: string): boolean { return this.flaredWards.has(wardId); }
  flaredCount(): number { return this.flaredWards.size; }
  allFlared(): boolean { return this.flaredWards.size >= this.cfg.wards.length; }

  /** The first UNFLARED ward starting from a seed pick (deterministic walk in
   *  ward order) — a canopic host whose rolled ward already burns keeps its
   *  vault useful instead of hosting a moot fight. Null once all burn. */
  nextWard(fromWardId: string): string | null {
    const ids = this.cfg.wards.map(w => w.id);
    const start = Math.max(0, ids.indexOf(fromWardId));
    for (let i = 0; i < ids.length; i++) {
      const id = ids[(start + i) % ids.length];
      if (!this.flaredWards.has(id)) return id;
    }
    return null;
  }

  /** Latch the first-found tomb (the marker's anchor). True on the FIRST find. */
  foundTomb(parentZoneId: string, pocketId: string): boolean {
    if (this.tomb) return false;
    this.tomb = { parentZoneId, pocketId };
    return true;
  }

  tombFound(): boolean { return !!this.tomb; }
  tombAt(): { parentZoneId: string; pocketId: string } | null { return this.tomb; }

  onRegentSlain(): void { this.regentDown = true; }
  regentSlain(): boolean { return this.regentDown; }

  // --- worldstate (the persistence pledge) ------------------------------------

  /** Pure JSON: the flared set, the found tomb, the Regent's fate. */
  snapshot(): unknown {
    return {
      flared: [...this.flaredWards],
      tomb: this.tomb ? { ...this.tomb } : null,
      regentDown: this.regentDown,
    };
  }

  /** Rebuild tolerantly: unknown ward ids drop (a renamed ward degrades to
   *  unlit — never a phantom flare), a malformed tomb row drops to unfound. */
  restore(snap: unknown): void {
    const s = snap as { flared?: unknown; tomb?: unknown; regentDown?: unknown } | null;
    if (!s || typeof s !== 'object') return;
    this.flaredWards.clear();
    if (Array.isArray(s.flared)) {
      for (const w of s.flared) {
        if (typeof w === 'string' && this.cfg.wards.some(x => x.id === w)) this.flaredWards.add(w);
      }
    }
    this.tomb = null;
    const t = s.tomb as { parentZoneId?: unknown; pocketId?: unknown } | null;
    if (t && typeof t === 'object' && typeof t.parentZoneId === 'string' && typeof t.pocketId === 'string') {
      this.tomb = { parentZoneId: t.parentZoneId, pocketId: t.pocketId };
    }
    this.regentDown = !!s.regentDown;
  }

  /** The tomb's HOST zone was culled from the graph → the find un-latches
   *  (the next tomb-rolled pocket entered re-marks the map; the flare ledger
   *  is world-wide and rides untouched). */
  pruneZones(has: (zoneId: string) => boolean): void {
    if (this.tomb && !has(this.tomb.parentZoneId)) this.tomb = null;
  }

  /** DEV (the Events tab): stage the endgame — every talisman flares and the
   *  tomb marks on the given zone, so QA can walk straight into the wake. */
  devIgnite(zoneId: string): void {
    for (const w of this.cfg.wards) this.flaredWards.add(w.id);
    if (!this.tomb) this.tomb = { parentZoneId: zoneId, pocketId: `dev_${zoneId}` };
    this.regentDown = false;
  }
}

// --- map marker + zone-info (registered on import — zero panel edits) ----------
//
// The FOUND tomb pins the funerary urn on its HOST zone (fog:'always' — once
// found, the map never loses it; the title counts the flares out loud, the
// "map says everything" doctrine).
registerMarkerSource((world: World): MapMarker[] => {
  const uf = world.sim.unsealingField;
  const tomb = uf?.tombAt();
  if (!uf || !tomb) return [];
  const total = uf.surge().wards.length;
  const title = uf.regentSlain()
    ? 'The Regent\'s Tomb — the throne stands empty'
    : uf.allFlared()
      ? 'The Regent\'s Tomb — the door stands OPEN'
      : `The Regent's Tomb — ${uf.flaredCount()}/${total} talismans aflame`;
  return [{
    id: 'unsealing_tomb', zoneId: tomb.parentZoneId,
    glyph: '⚱', fill: '#241c10', stroke: '#e8c060', text: '#f0dca0', r: 9,
    title, fog: 'always', z: 17,
  }];
});

registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const uf = world.sim.unsealingField;
  const tomb = uf?.tombAt();
  if (!uf || !tomb || tomb.parentZoneId !== zoneId || uf.regentSlain()) return [];
  const total = uf.surge().wards.length;
  return [{
    kind: 'event', icon: '⚱', color: '#e8c060',
    label: 'The Regent\'s Tomb',
    detail: uf.allFlared()
      ? 'below this ground, an open door waits'
      : `below this ground — ${uf.flaredCount()}/${total} talismans aflame`,
    z: 13,
  }];
});
