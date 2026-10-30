import { DAMAGE_TEXT_CFG, type DamageTextPopup } from '../../world/damageText';

/** A pure view over authoritative receipts. Rendering twice or receiving the
 *  same snapshot twice cannot add damage, and viewers can switch instantly. */
export function damageTextRows(texts: readonly DamageTextPopup[], summed: boolean): readonly DamageTextPopup[] {
  if (!summed) return texts;
  const latest = new Map<number, DamageTextPopup>();
  for (const text of texts) {
    const d = text.damage;
    if (d && text.life > 0 && d.count >= (latest.get(d.burst)?.damage?.count ?? 0)) latest.set(d.burst, text);
  }
  const rows: DamageTextPopup[] = [];
  for (const text of texts) {
    const d = text.damage;
    if (!d) { rows.push(text); continue; }
    if (latest.get(d.burst) !== text) continue;
    const age = Math.max(0, text.maxLife - text.life);
    const released = Math.max(0, age - DAMAGE_TEXT_CFG.gapSec);
    const fadeSec = Math.max(0.001, text.maxLife - DAMAGE_TEXT_CFG.gapSec);
    rows.push({
      ...text,
      text: String(Math.round(d.total)),
      kind: 'dmg',
      // A combined amount is neutral, so one crit cannot label a mixed total
      // as entirely critical. A lone hit retains its original visual identity.
      color: d.count > 1 ? DAMAGE_TEXT_CFG.totalColor : text.color,
      size: d.count > 1 ? DAMAGE_TEXT_CFG.totalSize : text.size,
      pos: { x: d.at.x, y: d.at.y - DAMAGE_TEXT_CFG.lift - released * DAMAGE_TEXT_CFG.risePerSec },
      life: Math.max(0, fadeSec - released), maxLife: fadeSec,
    });
  }
  return rows;
}
