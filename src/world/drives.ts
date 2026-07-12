// ---------------------------------------------------------------------------
// WORLD DRIVES — the wants layer at FACTION and WORLD scope.
//
// The per-actor drives (BrainDef.drives) give one body an appetite; these
// give a whole PEOPLE one. A WorldDriveSpec is a named slow meter keyed by
// faction (or one global key): it drifts on its own clock, events feed it
// (today: a member's death, via the faction_drive_feed kill row), and any
// monster rule can read it (AICondition.drive with scope 'faction'/'global')
// — so expansion, contraction and nerve become METER-driven rather than
// timer-driven. Event packages (warbands, crusades, incursions, rituals)
// read and feed the same ledger through sim.drives: the seam is open.
//
// Pure data + a small ledger class — no engine imports (the Reputation
// pattern). Registered specs are the vocabulary; registering is open.
// ---------------------------------------------------------------------------

export interface WorldDriveSpec {
  id: string;
  /** 'faction' mints one meter per faction (lazily, on first touch);
   *  'global' is a single world-wide meter. */
  scope: 'faction' | 'global';
  /** Signed drift per second (dread cools at -0.008 between culls). */
  rise?: number;
  /** A fresh meter's value (default 0). */
  start?: number;
  /** Clamp bounds (default 0..1). */
  min?: number;
  max?: number;
  /** Faction scope: a member's death moves the meter (the kill feed —
   *  killHandlers' faction_drive_feed row applies it). */
  onMemberDeath?: number;
}

/** The open spec registry — packages and data files add faction/global
 *  meters here; the sim ticks whatever is registered. */
export const WORLD_DRIVES: Record<string, WorldDriveSpec> = {};

export function registerWorldDrive(spec: WorldDriveSpec): void {
  WORLD_DRIVES[spec.id] = spec;
}

/** The run-scoped ledger (lives on WorldSim, like Reputation). Meters mint
 *  lazily on first touch, so an unbothered faction simply sits at `start`. */
export class WorldDrives {
  private meters = new Map<string, number>();

  private key(id: string, faction: string | undefined): string {
    const spec = WORLD_DRIVES[id];
    return spec?.scope === 'global' ? `*:${id}` : `${faction ?? '*'}:${id}`;
  }

  get(id: string, faction?: string): number {
    const spec = WORLD_DRIVES[id];
    if (!spec) return 0;
    return this.meters.get(this.key(id, faction)) ?? spec.start ?? 0;
  }

  bump(id: string, add: number, faction?: string): number {
    const spec = WORLD_DRIVES[id];
    if (!spec) return 0;
    const v = Math.min(spec.max ?? 1, Math.max(spec.min ?? 0,
      this.get(id, faction) + add));
    this.meters.set(this.key(id, faction), v);
    return v;
  }

  /** The drift tick (WorldSim.update): only touched meters move — an
   *  unbothered faction never pays for the machinery. */
  update(dt: number): void {
    for (const [key, v] of this.meters) {
      const id = key.slice(key.indexOf(':') + 1);
      const spec = WORLD_DRIVES[id];
      if (!spec?.rise) continue;
      this.meters.set(key, Math.min(spec.max ?? 1,
        Math.max(spec.min ?? 0, v + spec.rise * dt)));
    }
  }

  /** Live meters, for dev inspection (__game.world().sim.drives). */
  entries(): [string, number][] {
    return [...this.meters.entries()];
  }

  /** WORLDSTATE: a people's wants survive a relaunch (meta/worldstate.ts).
   *  Restore drops meters whose spec was unregistered since the save — an
   *  unknown key would never drift or be readable anyway. */
  snapshot(): unknown {
    return Object.fromEntries(this.meters);
  }

  restore(snap: unknown): void {
    if (!snap || typeof snap !== 'object') return;
    this.meters.clear();
    for (const [key, v] of Object.entries(snap as Record<string, unknown>)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      const spec = WORLD_DRIVES[key.slice(key.indexOf(':') + 1)];
      if (!spec) continue;
      this.meters.set(key, Math.min(spec.max ?? 1, Math.max(spec.min ?? 0, v)));
    }
  }
}

// --- Core specs -------------------------------------------------------------

// DREAD: a faction's accumulated grief — every member's death feeds it, quiet
// days cool it. Rules read it per monster ("while my people's dread runs
// high, my nerve thins"), so culling a warband CHANGES the survivors without
// a script ever firing. ~9 deaths tops the meter; ~2 minutes of peace clears it.
registerWorldDrive({
  id: 'dread',
  scope: 'faction',
  rise: -0.008,
  onMemberDeath: 0.11,
});
