// ---------------------------------------------------------------------------
// TARGET PANELS — named rosters of "what the build fights", as data. A panel
// is to the ENEMY axis what src/sim/data/builds.ts is to the player axis: the
// unit a matchup sweep enumerates, so "how does this skill do against every
// defense texture" is one command instead of a hand-typed monster list.
//
// Entries come in two shapes, freely mixed:
//   literal — { id: 'tide_whelk' }            pin an exact monster
//   query   — { pick: { texture: 'evasion' } } resolved at run time through
//              the live classifier (src/sim/textures.ts), so the panel keeps
//              pointing at the CURRENT bestiary as content ships. An empty
//              pole resolves to a warning, not a silent shrink.
//
// `claim` marks what a curated literal is supposed to exemplify —
// `audit textures --check-panels` re-derives it and exits 2 on drift, so a
// rebalanced monster can't quietly keep an obsolete seat on a panel.
// ---------------------------------------------------------------------------

import type { MonsterRarity } from '../../engine/rarity';
import type { World } from '../../engine/world';
import { defenseProfiles, TEXTURE_CFG, type DefenseProfile, type TextureId } from '../textures';

/** Query shape: which monsters qualify, ranked by how hard they express the
 *  asked-for texture. All filters are optional and AND-composed. */
export interface PanelPick {
  /** Texture pole the classifier must have assigned. */
  texture?: TextureId;
  /** Monster must carry at least one of these MonsterDef.tags. */
  tagAny?: string[];
  /** Restrict to bosses (true) / non-bosses (false). Default: non-bosses. */
  boss?: boolean;
  /** How many qualifying monsters to take (default 1), strongest pole first. */
  limit?: number;
}

export interface TargetPanelEntry {
  /** Literal monster id (exactly one of id | pick). */
  id?: string;
  /** Classifier query (exactly one of id | pick). */
  pick?: PanelPick;
  /** Monster level override (default: the panel's level, then the sweep's). */
  level?: number;
  count?: number;
  /** Promote via the real promoteMonster path — elite-texture probes. */
  rarity?: MonsterRarity;
  /** The texture this curated literal is meant to exemplify (drift-checked). */
  claim?: TextureId;
  note?: string;
}

export interface TargetPanel {
  id: string;
  label: string;
  /** Default specimen level for entries that don't pin one. */
  level?: number;
  notes?: string;
  entries: TargetPanelEntry[];
}

export const PANELS: Record<string, TargetPanel> = {};
function add(p: TargetPanel): void { PANELS[p.id] = p; }

// --- the library -------------------------------------------------------------

add({
  id: 'parity_early',
  label: 'Early parity trash, one at a time',
  level: 5,
  notes: 'The canonical crossroads trio as duels — the per-monster view of the parity pack.',
  entries: [
    { id: 'zombie', claim: 'plain' },
    { id: 'skeleton_warrior' },
    { id: 'blood_mite' },
  ],
});

add({
  id: 'textures_l8',
  label: 'One representative per defense texture @ L8',
  level: TEXTURE_CFG.probeLevel,
  notes: 'THE matchup panel: a build/skill measured across every defensive answer the bestiary '
    + 'poses. Poles resolve through the live classifier; an unpopulated pole warns (that is a '
    + 'content finding, not a sweep bug).',
  entries: [
    { id: 'zombie', claim: 'plain', note: 'the no-texture baseline' },
    { pick: { texture: 'armor' } },
    { pick: { texture: 'evasion' } },
    { pick: { texture: 'es' }, note: 'ES-glass — empty until the bestiary grows one' },
    { pick: { texture: 'poise' } },
    { id: 'tide_whelk', claim: 'shell', note: 'the directional-plate lesson' },
    { pick: { texture: 'apex' }, note: 'the rare full-shell + poise wall' },
  ],
});

add({
  id: 'shells_l8',
  label: 'The shell family @ L8',
  level: TEXTURE_CFG.probeLevel,
  notes: 'Directional-guard coverage: rear/front/full plates reward opposite positioning rhythms.',
  entries: [
    { id: 'tide_whelk', claim: 'shell' },
    { id: 'bulwark_scuttler', claim: 'shell', note: 'rear plate — punishes the orbit, not the face' },
    { pick: { texture: 'shell', limit: 3 } },
  ],
});

// --- expansion ----------------------------------------------------------------

/** A panel entry resolved to something a wave can spawn. */
export interface ResolvedTarget {
  monsterId: string;
  level: number;
  count: number;
  rarity?: MonsterRarity;
  /** Where this seat came from — 'literal' or the pick's texture. */
  via: string;
  profile?: DefenseProfile;
}

/** Resolve a panel against the LIVE bestiary. Deterministic: picks rank by
 *  pole strength (then id) and dedupe against seats already taken, so the
 *  same panel resolves the same roster every run at the same content. */
export function expandPanel(
  world: World,
  panel: TargetPanel,
  atLevel?: number,
): { targets: ResolvedTarget[]; warnings: string[] } {
  const targets: ResolvedTarget[] = [];
  const warnings: string[] = [];
  const taken = new Set<string>();
  const profilesAt = new Map<number, DefenseProfile[]>();
  const profiles = (level: number): DefenseProfile[] => {
    let p = profilesAt.get(level);
    if (!p) { p = defenseProfiles(world, level); profilesAt.set(level, p); }
    return p;
  };

  for (const e of panel.entries) {
    const level = e.level ?? atLevel ?? panel.level ?? TEXTURE_CFG.probeLevel;
    if (e.id) {
      const prof = profiles(level).find(p => p.id === e.id);
      if (!prof) { warnings.push(`panel ${panel.id}: unknown monster '${e.id}' — skipped`); continue; }
      if (taken.has(e.id)) continue;
      taken.add(e.id);
      targets.push({ monsterId: e.id, level, count: e.count ?? 1, rarity: e.rarity, via: 'literal', profile: prof });
    } else if (e.pick) {
      const q = e.pick;
      const pool = profiles(level).filter(p =>
        !p.passive && !p.spawner && !p.untargetable && !p.immortal
        && (q.boss ?? false) === p.boss
        && (!q.texture || p.textures.includes(q.texture))
        && (!q.tagAny || q.tagAny.some(t => p.tags.includes(t)))
        && !taken.has(p.id));
      // Strongest expression of the asked-for pole first; stable id tiebreak.
      const strength = (p: DefenseProfile): number =>
        q.texture === 'armor' || q.texture === 'evasion' || q.texture === 'poise' ? p.poles[q.texture]
          : q.texture === 'es' ? (p.pool > 0 ? p.es / p.pool : 0)
            : q.texture === 'shell' || q.texture === 'apex' ? (p.shell?.fracAuthored ?? 0)
              : p.pool;
      pool.sort((a, b) => strength(b) - strength(a) || (a.id < b.id ? -1 : 1));
      const picked = pool.slice(0, Math.max(1, q.limit ?? 1));
      if (!picked.length) {
        warnings.push(`panel ${panel.id}: pick ${JSON.stringify(q)} matched nothing — the pole may be unpopulated`);
        continue;
      }
      for (const p of picked) {
        taken.add(p.id);
        targets.push({ monsterId: p.id, level, count: e.count ?? 1, rarity: e.rarity, via: q.texture ?? 'pick', profile: p });
      }
    } else {
      warnings.push(`panel ${panel.id}: entry with neither id nor pick — skipped`);
    }
  }
  return { targets, warnings };
}
