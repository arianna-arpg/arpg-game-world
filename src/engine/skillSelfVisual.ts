import type { Actor } from './actor';
import { poolCueRows } from './reserveCues';
import { selfProfile } from '../data/skillSelfVisuals';

/** Read-only bank silhouettes: fill is stored power, never a release timer. */
export interface SelfBankCue { skillId: string; fill: number; color: string; }
export function selfBankCuesOf(a: Actor, now: number): SelfBankCue[] {
  if (a.dead || a.downed) return [];
  if (a.selfBankCues !== undefined) return a.selfBankCues;
  const rows: SelfBankCue[] = [], seen = new Set<string>();
  for (const p of poolCueRows(a)) {
    if (p.banked <= 0 || p.profile === false || seen.has(p.id) || !selfProfile(p.skillId)) continue;
    seen.add(p.id); rows.push({ skillId: p.skillId, fill: Math.max(0, Math.min(1, p.banked / Math.max(1, p.cap))), color: p.color });
    if (rows.length === 2) break;
  }
  const iw = a.ironWard;
  if (iw && iw.until > now && iw.stored > 0)
    rows.push({ skillId: 'iron_ward', fill: Math.max(0, Math.min(1, iw.stored / Math.max(1, iw.cap))), color: iw.visualColor ?? '#c8c0a8' });
  return rows;
}
