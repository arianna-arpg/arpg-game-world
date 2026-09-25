import { Rng } from '../core/rng';
import { tutorialFactionOf } from '../data/commanders';
import { ODYSSEY_CFG, ODYSSEY_FACTIONS, ODYSSEY_TUTORIAL_RELEASE } from '../data/odyssey';
import { restoreRisingClocks, type OdysseyRisingClocks } from './odysseyRisings';
import { odysseyPressureTier } from './odysseyPressure';
import { ODYSSEY_RISINGS } from '../data/odysseyRisings';

export interface OdysseyBody {
  id: string; x: number; y: number; life: number;
}
export interface OdysseyScout extends OdysseyBody {
  zoneId: string; phase: 'watch' | 'spotted' | 'flee'; exitX?: number; exitY?: number;
  exitTo?: string; fleeAt?: number;
  seenX?: number; seenY?: number;
}
export interface OdysseyState {
  risings?: OdysseyRisingClocks;
  version: 1; roster: string[]; defeated: string[]; prepared: string[];
  leads: string[]; kills: Record<string, number>; surveyDone: boolean;
  nextScoutAt: number; scoutInterval?: number; scout?: OdysseyScout;
  report?: { zoneId: string; arrivesAt: number; remaining: string[]; bodies?: OdysseyBody[]; x: number; y: number };
  siege?: { phase: 'warning' | 'active' | 'raided'; deadline: number; wave: number;
    waves: number; remaining: string[]; nextWaveAt: number; level: number; bodies?: OdysseyBody[] };
  nextSiegeAt: number; siegeInterval?: number; defenses: number; raids: number; initialized: boolean;
}

export function newOdyssey(seed: number, ledger: Record<string, number>): OdysseyState {
  const rng = new Rng((seed ^ 0x0d155e7) >>> 0);
  const pool = ODYSSEY_FACTIONS.map(f => f.id);
  const tutorial = tutorialFactionOf(ledger) ?? 'goblin';
  const roster: string[] = [];
  if (!ledger[ODYSSEY_TUTORIAL_RELEASE] && pool.includes(tutorial)) roster.push(tutorial);
  while (roster.length < ODYSSEY_CFG.rosterSize) {
    const available = pool.filter(f => !roster.includes(f));
    roster.push(available[Math.floor(rng.range(0, available.length))]);
  }
  return { version: 1, roster, defeated: [], prepared: [], leads: [], kills: {}, surveyDone: false,
    nextScoutAt: 0, nextSiegeAt: 0, defenses: 0, raids: 0, initialized: false };
}

/** Saves are world-owned. Never reconstruct defeat order from account kills. */
export function restoreOdyssey(raw: OdysseyState | undefined, seed: number, ledger: Record<string, number>): OdysseyState {
  if (!raw || raw.version !== 1 || !Array.isArray(raw.roster)
    || raw.roster.length !== ODYSSEY_CFG.rosterSize || new Set(raw.roster).size !== raw.roster.length
    || raw.roster.some(id => !ODYSSEY_FACTIONS.some(f => f.id === id))) return newOdyssey(seed, ledger);
  const s = structuredClone(raw);
  if (s.risings !== undefined) s.risings = restoreRisingClocks(s.risings);
  const subset = (a: string[]): string[] => Array.isArray(a) ? [...new Set(a.filter(id => s.roster.includes(id)))] : [];
  s.defeated = subset(s.defeated); s.prepared = subset(s.prepared); s.leads = subset(s.leads);
  s.kills = Object.fromEntries(Object.entries(s.kills ?? {}).filter(([id, n]) => s.roster.includes(id) && Number.isFinite(n) && n >= 0));
  for (const k of ['nextScoutAt', 'nextSiegeAt', 'defenses', 'raids'] as const) if (!Number.isFinite(s[k]) || s[k] < 0) s[k] = 0;
  for (const k of ['scoutInterval', 'siegeInterval'] as const)
    if (!Number.isFinite(s[k]) || s[k]! <= 0) delete s[k];
  s.initialized = s.initialized === true; s.surveyDone = s.surveyDone === true;
  if (s.scout && (s.scout.id !== 'odyssey_messenger'
    || !Number.isFinite(s.scout.x) || !Number.isFinite(s.scout.y) || !Number.isFinite(s.scout.life)
    || !['watch', 'spotted', 'flee'].includes(s.scout.phase) || typeof s.scout.zoneId !== 'string'
    || (s.scout.phase !== 'watch' && (!Number.isFinite(s.scout.exitX) || !Number.isFinite(s.scout.exitY)
      || !Number.isFinite(s.scout.fleeAt) || typeof s.scout.exitTo !== 'string')))) delete s.scout;
  if (s.report && (!Number.isFinite(s.report.arrivesAt) || !Number.isFinite(s.report.x) || !Number.isFinite(s.report.y)
    || typeof s.report.zoneId !== 'string' || !Array.isArray(s.report.remaining))) delete s.report;
  if (s.siege && (!Number.isFinite(s.siege.deadline) || !Number.isFinite(s.siege.wave) || !Number.isFinite(s.siege.waves)
    || !Number.isFinite(s.siege.level) || !Number.isFinite(s.siege.nextWaveAt)
    || !['warning', 'active', 'raided'].includes(s.siege.phase) || !Array.isArray(s.siege.remaining))) delete s.siege;
  for (const group of [s.report, s.siege]) {
    if (!group) continue;
    group.remaining = [...new Set(group.remaining.filter(id => typeof id === 'string'
      && /^odyssey_(hunt|siege):[0-9:]+$/.test(id)))].slice(0, 64);
    group.bodies = Array.isArray(group.bodies) ? group.bodies.filter(b => b && group.remaining.includes(b.id)
      && Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.life) && b.life > 0)
      .map(b => ({ id: b.id, x: b.x, y: b.y, life: Math.min(1, b.life) })) : undefined;
  }
  if (s.siege) {
    s.siege.waves = Math.max(1, Math.min(20, Math.floor(s.siege.waves)));
    s.siege.wave = Math.max(0, Math.min(s.siege.waves, Math.floor(s.siege.wave)));
    s.siege.level = Math.max(1, Math.min(100, s.siege.level));
  }
  clearDormantOdysseyPressure(s);
  return s;
}

export const odysseyAct = (s: OdysseyState): number => s.defeated.length;
export const odysseySurvives = (s: OdysseyState, id: string): boolean => s.roster.includes(id) && !s.defeated.includes(id);
export const odysseyReadiness = (s: OdysseyState): number => ODYSSEY_CFG.readiness[Math.min(3, odysseyAct(s))];

/** Old deadlines cannot bank pressure before its unlock or after elimination.
 * Existing ordinary night-risen enemies remain owned by zone memory. */
export function clearDormantOdysseyPressure(s: OdysseyState): void {
  if (odysseyPressureTier(s, ODYSSEY_CFG.bandit) === null) {
    delete s.scout; delete s.report; delete s.scoutInterval; s.nextScoutAt = 0;
  }
  if (odysseyPressureTier(s, ODYSSEY_CFG.goblin) === null) {
    delete s.siege; delete s.siegeInterval; s.nextSiegeAt = 0;
  }
  for (const def of ODYSSEY_RISINGS)
    if (s.risings && odysseyPressureTier(s, def) === null) delete s.risings[def.id];
}

/** A world milestone receipt. The caller pays only when this returns true. */
export function defeatOdysseyLeader(s: OdysseyState, id: string): boolean {
  if (!odysseySurvives(s, id)) return false;
  s.defeated.push(id);
  clearDormantOdysseyPressure(s);
  return true;
}
