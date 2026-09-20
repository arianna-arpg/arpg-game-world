import type { Actor } from './actor';
import type { DamagePacket } from './damage';

/** Recipient-scoped: a whole pack shares one retaliation window against a
 * body. The world clock keeps this independent of frame rate and attack rate.
 * Weak keys let departed actors disappear without a persistent/save ledger. */
export class ParryDamageWindow {
  private until = new WeakMap<Actor, number>();

  ready(target: Actor, now: number): boolean {
    return now >= (this.until.get(target) ?? -Infinity);
  }

  spend(target: Actor, now: number): void {
    this.until.set(target, now + target.sheet.get('parryDamageCooldown'));
  }
}

/** Original typed payload, captured once. Re-parries replace power rather
 * than multiplying it repeatedly; the current projectile caster owns credit. */
export interface ParryDamage {
  packet: DamagePacket;
  power: number;
  reflections: number;
}

export function parryCounter(payload: ParryDamage, scale = 1): DamagePacket {
  const amounts = { ...payload.packet.amounts };
  for (const type of Object.keys(amounts) as (keyof typeof amounts)[]) {
    amounts[type]! *= payload.power * scale;
  }
  return { ...payload.packet, amounts, tags: new Set(payload.packet.tags) };
}
