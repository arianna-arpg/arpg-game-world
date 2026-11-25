import { DAMAGE_TEXT_CFG as cfg, type DamageTextPopup } from '../../world/damageText';

function fadeProgress(t: DamageTextPopup): number {
  const hold = Math.min(cfg.holdSec, t.maxLife / 2);
  return 1 - Math.max(0, Math.min(1, t.life / Math.max(0.001, t.maxLife - hold)));
}

export function damageTextAlpha(t: DamageTextPopup): number {
  const p = fadeProgress(t);
  return 1 - p * p * (3 - 2 * p);
}

/** No renderer-side accumulation. The newest receipt owns each visible total. */
export function damageTextRows(texts: readonly DamageTextPopup[], summed: boolean, labels = false, scale = 1): readonly DamageTextPopup[] {
  if (!summed && !labels && scale === 1) return texts;
  const latest = new Map<number, DamageTextPopup>();
  if (summed) for (const text of texts) {
    const d = text.damage;
    if (!d || text.life <= 0) continue;
    const id = labels ? d.sourceBurst ?? d.burst : d.burst;
    if (d.count >= (latest.get(id)?.damage?.count ?? 0)) latest.set(id, text);
  }
  const rows: DamageTextPopup[] = [];
  for (const t of texts) {
    const d = t.damage;
    if (!d) {
      rows.push(t.kind === 'dmg' && scale !== 1 ? { ...t, size: t.size * scale } : t);
      continue;
    }
    const label = labels && d.source ? ' · ' + d.source : '';
    if (!summed) {
      rows.push({ ...t, text: t.text + label, size: t.size * scale });
      continue;
    }
    if (latest.get(labels ? d.sourceBurst ?? d.burst : d.burst) !== t) continue;
    const total = labels ? d.sourceTotal ?? d.total : d.total;
    const size = cfg.totalSize * scale;
    const lane = labels ? d.sourceLane ?? 0 : 0;
    rows.push({ ...t, text: Math.round(total) + label, kind: 'dmg', size,
      color: (labels ? d.sourceCount ?? d.count : d.count) > 1 ? cfg.totalColor : t.color,
      pos: { x: d.at.x, y: d.at.y - cfg.lift - lane * (size + 4) - fadeProgress(t) * cfg.releaseRise },
    });
  }
  return rows;
}
