// ---------------------------------------------------------------------------
// REPUTATION — a per-faction favor ledger.
//
// Who owes the player. Earned by defending a faction's caravan, breaking a
// siege laid against it, or slaying a rival's warlord; a standing hook for
// future faction vendors and "favor buys safe passage" (a high-favor faction's
// patrols could one day ignore you). Pure data — no engine import.
// ---------------------------------------------------------------------------

import { factionShortName } from './traits';

export class Reputation {
  private favor = new Map<string, number>();

  /** Grant (or dock) favor; returns the new standing. */
  add(faction: string, n: number): number {
    const v = (this.favor.get(faction) ?? 0) + n;
    this.favor.set(faction, v);
    return v;
  }

  get(faction: string): number {
    return this.favor.get(faction) ?? 0;
  }

  /** Spend favor (a future vendor / passage cost); false if you can't afford it. */
  spend(faction: string, n: number): boolean {
    const v = this.get(faction);
    if (v < n) return false;
    this.favor.set(faction, v - n);
    return true;
  }

  /** Standings, strongest first, zeroes pruned. */
  entries(): [string, number][] {
    return [...this.favor.entries()].filter(([, v]) => v !== 0).sort((a, b) => b[1] - a[1]);
  }

  /** WORLDSTATE: who owes you survives a relaunch (meta/worldstate.ts). */
  snapshot(): unknown {
    return Object.fromEntries(this.favor);
  }

  restore(snap: unknown): void {
    if (!snap || typeof snap !== 'object') return;
    this.favor.clear();
    for (const [f, v] of Object.entries(snap as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v)) this.favor.set(f, v);
    }
  }

  /** Short HUD blurb for the faction you stand best with ('' if none yet). */
  hud(): string {
    const top = this.entries()[0];
    if (!top) return '';
    return `${factionShortName(top[0])} favor ${Math.round(top[1])}`;
  }
}
