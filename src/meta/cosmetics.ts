import '../data/cosmetics';
import { COSMETICS, COSMETIC_SLOTS, emptyCosmetics, emptyCosmeticLoadout,
  type CosmeticLoadout, type CosmeticSlot, type CosmeticState, type CosmeticGrant } from '../engine/cosmetics';
import type { Account } from './account';
import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';
import { gateMet, gateRowLabel } from './gates';

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const word = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 180
  && v !== 'prototype' && !Object.prototype.hasOwnProperty.call(Object.prototype, v);
export const ownsCosmetic = (state: CosmeticState, id: string): boolean =>
  COSMETICS[id]?.acquire.kind === 'starter' || !!COSMETICS[id]?.consume?.starterCharges || state.grants.some(g => g.id === id);

const colorHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const sameUnit = (a: CosmeticGrant, b: CosmeticGrant): boolean => a.id === b.id && a.source === b.source && a.reference === b.reference;
function cosmeticUnits(state: CosmeticState, id: string): CosmeticGrant[] {
  const def = COSMETICS[id];
  if (!def?.consume) return [];
  return [...Array.from({ length: def.consume.starterCharges }, (_, i) => ({ id, source: 'starter', reference: String(i) })),
    ...state.grants.filter(g => g.id === id && g.source !== 'starter')];
}
export function cosmeticCharges(state: CosmeticState, id: string): number {
  return cosmeticUnits(state, id).filter(g => !state.applications?.some(b => sameUnit(b, g))).length;
}
export function skillColorUnlocked(state: CosmeticState, id: string, skill: string): boolean {
  return cosmeticUnits(state, id).some(g => state.applications?.some(b => b.skill === skill && sameUnit(b, g)));
}
const canEquip = (state: CosmeticState, id: string, skill?: string): boolean => COSMETICS[id]?.consume
  ? !!skill && skillColorUnlocked(state, id, skill) : ownsCosmetic(state, id);
/** The caller supplies the current character's learned book; account unlocks also qualify.
 *  Consumption binds a receipt once. Unequipping never consumes or refunds that receipt. */
export function applySkillColorCosmetic(a: Account, id: string, skill: string, learned: readonly string[] = []): boolean {
  const def = COSMETICS[id];
  if (!def?.consume || !word(skill) || (def.skills && !def.skills.includes(skill))
    || (!a.unlockedSkills.has(skill) && !learned.includes(skill))
    || skillColorUnlocked(a.cosmetics, id, skill)) return false;
  const unit = cosmeticUnits(a.cosmetics, id).find(g => !a.cosmetics.applications?.some(b => sameUnit(b, g)));
  if (!unit) return false;
  // A refunded binding can be replaced by another owned unit, retaining the spent
  // receipt as a tombstone so restoring that receipt cannot create a spare charge.
  (a.cosmetics.applications ??= []).push({ ...unit, skill });
  (a.cosmetics.loadout.customColors ??= {})[skill] ??= def.paint.color ?? '#c4b2f2';
  return equipCosmetic(a, 'skillRecolor', id, skill);
}
export function setSkillCosmeticColor(a: Account, id: string, skill: string, color: string): boolean {
  if (!colorHex(color) || !word(skill) || !skillColorUnlocked(a.cosmetics, id, skill)) return false;
  if (!equipCosmetic(a, 'skillRecolor', id, skill)) return false;
  (a.cosmetics.loadout.customColors ??= {})[skill] = color.toLowerCase();
  return true;
}
export function cosmeticSkillColor(loadout: CosmeticLoadout | undefined, skill?: string): string | undefined {
  const def = cosmeticPick(loadout, 'skillRecolor', skill);
  return def?.consume ? (skill ? loadout?.customColors?.[skill] ?? def.paint.color : undefined) : def?.paint.color;
}

/** Follow summon attribution to its keeper. Possessed enemy bodies keep their identity.
 *  Wire appearances are already sanitized; only local/couch heroes read this account. */
export function cosmeticLoadoutFor(world: World, actor: Actor): CosmeticLoadout | undefined {
  if (actor.cosmeticLoadout) return actor.cosmeticLoadout;
  let root = actor;
  for (let depth = 0; root.owner && depth < 16; depth++) root = root.owner;
  if (root.cosmeticLoadout) return root.cosmeticLoadout;
  const seat = world.seats.find(s => (s.home ?? s.actor) === root);
  return seat && !seat.merc && (seat === world.localSeat || seat.couch)
    ? world.account.cosmetics.loadout : undefined;
}

export function cosmeticSkillPaint(world: World, actor: Actor, skill: string) {
  const loadout = cosmeticLoadoutFor(world, actor);
  return { color: cosmeticSkillColor(loadout, skill),
    motif: cosmeticPick(loadout, 'skillSkin', skill)?.paint.motif };
}

/** Unknown content stays in ownership receipts so temporarily absent mods do not erase purchases.
 *  Equipped content is resolved separately and always fails closed. */
export function sanitizeCosmetics(raw: unknown): CosmeticState {
  const state = emptyCosmetics();
  if (!record(raw)) return state;
  const seen = new Set<string>();
  if (Array.isArray(raw.grants)) for (const g of raw.grants) {
    if (!record(g) || !word(g.id) || !word(g.source) || !word(g.reference)) continue;
    const key = JSON.stringify([g.id, g.source, g.reference]);
    if (!seen.has(key)) { state.grants.push({ id: g.id, source: g.source, reference: g.reference }); seen.add(key); }
  }
  const used = new Set<string>();
  if (Array.isArray(raw.applications)) for (const b of raw.applications) {
    if (!record(b) || !word(b.id) || !word(b.source) || !word(b.reference) || !word(b.skill)) continue;
    const key = JSON.stringify([b.id, b.source, b.reference]);
    if (used.has(key)) continue;
    used.add(key); (state.applications ??= []).push({ id: b.id, source: b.source, reference: b.reference, skill: b.skill });
  }
  state.loadout = sanitizeCosmeticLoadout(raw.loadout, (id, skill) => canEquip(state, id, skill),
    skill => !!state.applications?.some(b => b.skill === skill && skillColorUnlocked(state, b.id, skill)));
  return state;
}
export function sanitizeCosmeticLoadout(raw: unknown, owned: (id: string, skill?: string) => boolean = () => true,
  colorAllowed: (skill: string) => boolean = () => true): CosmeticLoadout {
  const out = emptyCosmeticLoadout();
  if (!record(raw)) return out;
  if (record(raw.slots)) for (const slot of Object.keys(COSMETIC_SLOTS) as CosmeticSlot[]) {
    const id = raw.slots[slot];
    if (typeof id === 'string' && COSMETICS[id]?.slot === slot && !COSMETICS[id].consume && owned(id)) out.slots[slot] = id;
  }
  if (record(raw.skills)) for (const [skill, picks] of Object.entries(raw.skills).slice(0, 512)) {
    if (!word(skill) || !record(picks)) continue;
    const row: CosmeticLoadout['skills'][string] = {};
    for (const slot of ['skillSkin', 'skillRecolor'] as const) {
      const id = picks[slot];
      if (id === null) row[slot] = null;
      else if (typeof id === 'string' && COSMETICS[id]?.slot === slot && owned(id, skill)
        && (!COSMETICS[id].skills || COSMETICS[id].skills!.includes(skill))) row[slot] = id;
    }
    if (Object.keys(row).length) out.skills[skill] = row;
  }
  if (record(raw.customColors)) for (const [skill, color] of Object.entries(raw.customColors).slice(0, 512)) {
    if (word(skill) && colorHex(color) && colorAllowed(skill)) (out.customColors ??= {})[skill] = color.toLowerCase();
  }
  return out;
}
export function cosmeticPick(loadout: CosmeticLoadout | undefined, slot: CosmeticSlot, skill?: string) {
  if (!loadout) return undefined;
  const specific = skill && (slot === 'skillSkin' || slot === 'skillRecolor') ? loadout.skills[skill]?.[slot] : undefined;
  const id = specific === undefined ? loadout.slots[slot] : specific;
  const def = id ? COSMETICS[id] : undefined;
  return def?.slot === slot && (!def.consume || !!skill)
    && (!def.skills || (skill !== undefined && def.skills.includes(skill))) ? def : undefined;
}
export function equipCosmetic(a: Account, slot: CosmeticSlot, id: string | null | undefined, skill?: string): boolean {
  if (!Object.prototype.hasOwnProperty.call(COSMETIC_SLOTS, slot) || (skill && (!word(skill) || (slot !== 'skillSkin' && slot !== 'skillRecolor')))) return false;
  if (id && (COSMETICS[id]?.slot !== slot || !canEquip(a.cosmetics, id, skill)
    || (skill && COSMETICS[id].skills && !COSMETICS[id].skills!.includes(skill)))) return false;
  if (skill && (slot === 'skillSkin' || slot === 'skillRecolor')) {
    const row = a.cosmetics.loadout.skills[skill] ??= {};
    if (id === undefined) delete row[slot]; else row[slot] = id;
    if (!Object.keys(row).length) delete a.cosmetics.loadout.skills[skill];
  } else if (id) a.cosmetics.loadout.slots[slot] = id;
  else delete a.cosmetics.loadout.slots[slot];
  return true;
}

export function grantCosmetic(state: CosmeticState, g: CosmeticGrant): boolean {
  if (!word(g.id) || !word(g.source) || !word(g.reference) || g.source === 'starter'
    || !COSMETICS[g.id] || state.grants.some(x => sameUnit(x, g))) return false;
  state.grants.push(g); return true;
}
/** Durable milestone claims use the existing ledger, never a second progression counter. */
export function settleCosmetics(a: Account, ledger = a.ledger): string[] {
  const earned: string[] = [];
  for (const def of Object.values(COSMETICS)) {
    if (def.acquire.kind !== 'achievement' || a.cosmetics.grants.some(g => g.id === def.id && g.source === 'achievement')) continue;
    if (gateMet({ ...a, ledger }, def.acquire.rows, def.acquire.mode, () => false)
      && grantCosmetic(a.cosmetics, { id: def.id, source: 'achievement', reference: def.id })) earned.push(def.id);
  }
  return earned;
}
export function cosmeticAcquisition(id: string): string {
  const d = COSMETICS[id];
  if (!d) return 'Unavailable';
  switch (d.acquire.kind) {
    case 'starter': return 'Included with your account';
    case 'achievement': return d.acquire.rows.map(gateRowLabel).join(d.acquire.mode === 'all' ? ' + ' : ' or ');
    case 'credits': return `${d.acquire.cost} Mortal Essence · spend at the run’s Reckoning`;
    case 'external': return 'Available through an external entitlement';
  }
}
export function buyCosmetic(a: Account, id: string): boolean {
  const d = COSMETICS[id];
  if (!d || d.acquire.kind !== 'credits' || (!d.consume && ownsCosmetic(a.cosmetics, id))
    || !Number.isFinite(a.credits) || a.credits < d.acquire.cost) return false;
  const source = 'mortal-essence';
  let reference = id;
  if (d.consume) {
    const used = new Set([...a.cosmetics.grants, ...(a.cosmetics.applications ?? [])]
      .filter(g => g.id === id && g.source === source).map(g => g.reference));
    let n = 1; while (used.has(`purchase:${n}`)) n++;
    reference = `purchase:${n}`;
  }
  if (!grantCosmetic(a.cosmetics, { id, source, reference })) return false;
  a.credits -= d.acquire.cost;
  return true;
}

export interface CosmeticProduct { sku: string; cosmetics: readonly string[] }
export interface VerifiedCosmeticReceipt { transaction: string; sku: string }
/** Integration seam, NOT receipt verification. A trusted provider must verify identity,
 *  payment/refund state and supply its COMPLETE active entitlement set. No provider or
 *  paid product is connected by default. Reconciliation is idempotent and atomic;
 *  revoking a purchase preserves the same item's independently earned ownership. */
export function reconcileCosmeticEntitlements(a: Account, provider: string,
  products: readonly CosmeticProduct[], verified: readonly VerifiedCosmeticReceipt[]): boolean {
  if (!word(provider) || provider.length > 171) return false;
  const catalogue = new Map(products.map(p => [p.sku, p]));
  if (catalogue.size !== products.length || products.some(p => !word(p.sku) || !p.cosmetics.length || p.cosmetics.some(id => !COSMETICS[id]))) return false;
  const next: CosmeticGrant[] = [], seen = new Set<string>();
  for (const receipt of verified) {
    const product = catalogue.get(receipt.sku);
    if (!product || !word(receipt.transaction) || seen.has(receipt.transaction)) return false;
    seen.add(receipt.transaction);
    for (const id of new Set(product.cosmetics)) next.push({ id, source: `external:${provider}`, reference: receipt.transaction });
  }
  a.cosmetics.grants = [...a.cosmetics.grants.filter(g => g.source !== `external:${provider}`), ...next];
  a.cosmetics = sanitizeCosmetics(a.cosmetics);
  return true;
}
