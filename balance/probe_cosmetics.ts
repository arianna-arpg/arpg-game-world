import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeAccount, serializeAccount, deserializeAccount } from '../src/meta/account';
import { COSMETICS, COSMETIC_SLOTS, registerCosmetic, type CosmeticSlot } from '../src/engine/cosmetics';
import { applySkillColorCosmetic, cosmeticCharges, cosmeticSkillColor, grantCosmetic, setSkillCosmeticColor, skillColorUnlocked,
  buyCosmetic, cosmeticLoadoutFor, cosmeticPick, cosmeticSkillPaint, equipCosmetic,
  ownsCosmetic, reconcileCosmeticEntitlements, sanitizeCosmetics, sanitizeCosmeticLoadout, settleCosmetics } from '../src/meta/cosmetics';
import { SKILLS } from '../src/data/skills';
import { MATERIALS } from '../src/render/vis/materials';
import { cosmeticBody, CosmeticTrails } from '../src/render/vis/cosmetics';
import { makeSkillInstance } from '../src/engine/skills';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { NullInput } from '../src/net/intent';
import { classById } from '../src/sim/arena';
import { SIM_TAP } from '../src/engine/tap';
import { CLASSES } from '../src/data/classes';
import { COSMETIC_MODELS } from '../src/data/cosmeticModels';
import { LOOKS } from '../src/data/looks';
import { PART_PAINTERS } from '../src/render/vis/parts';

let checks = 0;
const test = (label: string, run: () => void): void => { run(); checks++; console.log(`PASS ${label}`); };

test('Every category has authored content; material and skill references resolve', () => {
  for (const slot of Object.keys(COSMETIC_SLOTS)) assert(Object.values(COSMETICS).some(d => d.slot === slot));
  for (const d of Object.values(COSMETICS)) {
    if (d.paint.material) assert(MATERIALS[d.paint.material], d.id);
    if (d.paint.look) assert(LOOKS[d.paint.look], d.id);
    for (const id of d.skills ?? []) assert(SKILLS[id], `${d.id}: ${id}`);
  }
  assert.throws(() => registerCosmetic(COSMETICS.moon_tint));
});

test('Ink binds once to an eligible skill, repeats freely, and survives new lives', () => {
  const a = makeAccount(); const ink = 'prismatic_ink';
  assert.equal(cosmeticCharges(a.cosmetics, ink), 2);
  assert.equal(applySkillColorCosmetic(a, ink, 'fireball'), false, 'locked skill cannot consume');
  assert.equal(equipCosmetic(a, 'skillRecolor', ink), false, 'no account-wide consumable');
  assert.equal(equipCosmetic(a, 'skillRecolor', ink, 'fireball'), false, 'cannot equip before binding');
  a.unlockedSkills.add('fireball');
  assert(applySkillColorCosmetic(a, ink, 'fireball'));
  assert.equal(cosmeticCharges(a.cosmetics, ink), 1);
  assert.equal(applySkillColorCosmetic(a, ink, 'fireball'), false, 'duplicate does not spend');
  for (const color of ['#123ABC', '#ff0066', '#000000']) assert(setSkillCosmeticColor(a, ink, 'fireball', color));
  assert.equal(cosmeticSkillColor(a.cosmetics.loadout, 'fireball'), '#000000');
  assert.equal(cosmeticCharges(a.cosmetics, ink), 1);
  assert.equal(setSkillCosmeticColor(a, ink, 'cleave', '#ffffff'), false);
  assert(equipCosmetic(a, 'skillRecolor', 'rose_tint', 'fireball'));
  assert.equal(cosmeticSkillColor(a.cosmetics.loadout, 'fireball'), '#e8a8ca');
  let b = deserializeAccount(JSON.parse(JSON.stringify(serializeAccount(a))))!;
  assert(skillColorUnlocked(b.cosmetics, ink, 'fireball'));
  assert(equipCosmetic(b, 'skillRecolor', null, 'fireball'));
  b = deserializeAccount(serializeAccount(b))!;
  assert(equipCosmetic(b, 'skillRecolor', ink, 'fireball'));
  assert.equal(cosmeticSkillColor(b.cosmetics.loadout, 'fireball'), '#000000', 'remember color while native/preset is equipped');
  assert(applySkillColorCosmetic(b, ink, 'cleave', ['cleave']), 'current learned book qualifies');
  assert.equal(cosmeticCharges(b.cosmetics, ink), 0);
  assert.equal(applySkillColorCosmetic(b, ink, 'blink', ['blink']), false, 'no free third use');
});

test('Additional inks use repeatable attributed receipts with exactly-once consumption', () => {
  const a = makeAccount(), ink = 'prismatic_ink', cost = COSMETICS[ink].acquire;
  assert(cost.kind === 'credits'); a.credits = cost.cost * 2;
  assert(buyCosmetic(a, ink)); assert(buyCosmetic(a, ink)); assert.equal(a.credits, 0);
  assert.equal(buyCosmetic(a, ink), false); assert.equal(cosmeticCharges(a.cosmetics, ink), 4);
  assert.equal(new Set(a.cosmetics.grants.map(g => g.reference)).size, 2);
  assert(grantCosmetic(a.cosmetics, { id: ink, source: 'quest', reference: 'reward-1' }));
  assert.equal(grantCosmetic(a.cosmetics, { id: ink, source: 'quest', reference: 'reward-1' }), false);
  for (const skill of Object.keys(SKILLS).slice(0, 5)) assert(applySkillColorCosmetic(a, ink, skill, [skill]));
  assert.equal(cosmeticCharges(a.cosmetics, ink), 0);
  const b = deserializeAccount(serializeAccount(a))!;
  assert.equal(cosmeticCharges(b.cosmetics, ink), 0);
  assert.equal(b.cosmetics.applications!.length, 5);
});

test('Picker input and wire data reject malformed colors and duplicated spent units', () => {
  const a = makeAccount(), ink = 'prismatic_ink';
  applySkillColorCosmetic(a, ink, 'fireball', ['fireball']);
  const before = JSON.stringify(a.cosmetics);
  for (const color of ['red', '#fff', '#12345678', 'url(x)', '#12345g', '']) assert.equal(setSkillCosmeticColor(a, ink, 'fireball', color), false);
  assert.equal(JSON.stringify(a.cosmetics), before);
  const wire = sanitizeCosmeticLoadout(JSON.parse('{"slots":{"skillRecolor":"prismatic_ink"},"customColors":{"fireball":"#12AB34","cleave":"url(x)","__proto__":"#ffffff"}}'));
  assert.equal(wire.slots.skillRecolor, undefined);
  assert.deepEqual(wire.customColors, { fireball: '#12ab34' });
  const application = a.cosmetics.applications![0];
  a.cosmetics.applications!.push({ ...application, skill: 'cleave' });
  const b = sanitizeCosmetics(a.cosmetics);
  assert.equal(b.applications!.length, 1); assert.equal(cosmeticCharges(b, ink), 1);
  assert.equal(skillColorUnlocked(b, ink, 'cleave'), false);
  assert.equal(sanitizeCosmetics({ loadout: { skills: { fireball: { skillRecolor: ink } }, customColors: { fireball: '#123456' } } }).loadout.customColors, undefined);
});

test('Refunded ink loses its binding; replay cannot create a spare used charge', () => {
  const a = makeAccount(), ink = 'prismatic_ink', products = [{ sku: 'ink', cosmetics: [ink] }];
  const receipts = [{ transaction: 'ink-1', sku: 'ink' }];
  applySkillColorCosmetic(a, ink, 'fireball', ['fireball']);
  applySkillColorCosmetic(a, ink, 'cleave', ['cleave']);
  assert(reconcileCosmeticEntitlements(a, 'test-ink', products, receipts));
  assert(applySkillColorCosmetic(a, ink, 'blink', ['blink']));
  assert(reconcileCosmeticEntitlements(a, 'test-ink', products, receipts));
  assert.equal(cosmeticCharges(a.cosmetics, ink), 0);
  assert(reconcileCosmeticEntitlements(a, 'test-ink', products, []));
  assert(!skillColorUnlocked(a.cosmetics, ink, 'blink'));
  assert(skillColorUnlocked(a.cosmetics, ink, 'fireball'));
  assert.equal(a.cosmetics.loadout.skills.blink, undefined);
  const b = deserializeAccount(serializeAccount(a))!;
  assert(reconcileCosmeticEntitlements(b, 'test-ink', products, receipts));
  assert(skillColorUnlocked(b.cosmetics, ink, 'blink'));
  assert.equal(cosmeticCharges(b.cosmetics, ink), 0);
});

test('All class and cosmetic-only models compose with skins without replacing mechanics', () => {
  const w = makeSimWorld('warrior', 18), a = w.player;
  const base = { shape: a.shape, radius: a.radius, color: a.color, look: a.look, material: a.material };
  const original = JSON.stringify(base), skills = a.skills.map(s => s?.def.id);
  for (const c of CLASSES) if (c.look) assert.equal(COSMETICS[`model_${c.id}`].paint.look, c.look);
  assert(COSMETIC_MODELS.length >= 4);
  for (const m of COSMETIC_MODELS) for (const part of m.body.parts) assert(PART_PAINTERS[part.kind], `${m.id}: ${part.kind}`);
  assert(equipCosmetic(w.account, 'playerModel', 'model_necromancer'));
  const model = cosmeticBody(base, w.account.cosmetics.loadout);
  assert.equal(model.look, 'class_necromancer'); assert.equal(model.radius, a.radius);
  assert(equipCosmetic(w.account, 'playerSkin', 'moon_glass'));
  const skinned = cosmeticBody(base, w.account.cosmetics.loadout);
  assert.equal(skinned.look, 'class_necromancer'); assert.equal(skinned.color, '#8fd8e6');
  assert.equal(skinned.adorn, 'wings'); assert.equal(JSON.stringify(base), original);
  assert.equal(a.look, 'class_warrior'); assert.deepEqual(a.skills.map(s => s?.def.id), skills);
  assert.equal(cosmeticBody(base, w.account.cosmetics.loadout, true).look, base.look, 'summons retain their own model');
  assert(equipCosmetic(w.account, 'playerSkin', null));
  assert.equal(cosmeticBody(base, w.account.cosmetics.loadout).color, classById('necromancer').color);
});

test('Legacy accounts retain progression; malformed ownership and wrong slots fail closed', () => {
  const a = makeAccount(); a.credits = 91;
  const old = serializeAccount(a); delete old.cosmetics;
  const loaded = deserializeAccount(old)!;
  assert.equal(loaded.credits, 91); assert(ownsCosmetic(loaded.cosmetics, 'moon_tint'));
  const malformed = sanitizeCosmetics({ grants: [null, 7, {}, { id: 'absent_mod', source: 'quest', reference: 'kept' }],
    loadout: { slots: { playerSkin: 'gold_tint', skillRecolor: 'gold_tint', avatar: 'constructor' }, skills: { fireball: { skillSkin: 3 } } } });
  assert.deepEqual(malformed.loadout, { slots: {}, skills: {} });
  assert.equal(malformed.grants.length, 1, 'retain absent mod receipt');
  assert.deepEqual(sanitizeCosmeticLoadout(JSON.parse('{"skills":{"__proto__":{"skillSkin":"starlit_skills"}}}')).skills, {});
  assert.equal(equipCosmetic(a, 'constructor' as CosmeticSlot, null), false);
  assert.equal(equipCosmetic(a, 'skillRecolor', 'moon_tint', 'toString'), false);
});

test('Selections persist and per-skill overrides support native, default, and incompatible content', () => {
  const a = makeAccount();
  assert(equipCosmetic(a, 'skillRecolor', 'moon_tint'));
  assert(equipCosmetic(a, 'skillRecolor', 'rose_tint', 'fireball'));
  assert.equal(cosmeticPick(a.cosmetics.loadout, 'skillRecolor', 'fireball')?.id, 'rose_tint');
  assert(equipCosmetic(a, 'skillRecolor', null, 'fireball'));
  assert.equal(cosmeticPick(a.cosmetics.loadout, 'skillRecolor', 'fireball'), undefined);
  const loaded = deserializeAccount(JSON.parse(JSON.stringify(serializeAccount(a))))!;
  assert.equal(loaded.cosmetics.loadout.skills.fireball.skillRecolor, null);
  assert(equipCosmetic(loaded, 'skillRecolor', undefined, 'fireball'));
  assert.equal(cosmeticPick(loaded.cosmetics.loadout, 'skillRecolor', 'fireball')?.id, 'moon_tint');
  assert.equal(equipCosmetic(a, 'playerSkin', 'moon_tint'), false);
  assert.equal(equipCosmetic(a, 'skillRecolor', 'gold_tint'), false);
  registerCosmetic({ ...COSMETICS.starlit_skills, id: 'probe_scoped', skills: ['fireball'] });
  assert(equipCosmetic(a, 'skillSkin', 'probe_scoped'));
  assert.equal(cosmeticPick(a.cosmetics.loadout, 'skillSkin', 'cleave'), undefined);
  assert.equal(equipCosmetic(a, 'skillSkin', 'probe_scoped', 'cleave'), false);
});

test('Achievements claim once and remain owned after the run ledger is gone', () => {
  const a = makeAccount();
  assert.deepEqual(settleCosmetics(a), []);
  const earned = settleCosmetics(a, { zones_explored: 5, 'quest_done:test': 1 });
  assert(earned.includes('gold_tint') && earned.includes('astral_kin'));
  assert.deepEqual(settleCosmetics(a, { zones_explored: 5, 'quest_done:test': 1 }), []);
  const restored = deserializeAccount(JSON.parse(JSON.stringify(serializeAccount(a))))!;
  assert(ownsCosmetic(restored.cosmetics, 'gold_tint'));
  assert.equal(restored.ledger.zones_explored, undefined);
});

test('Currency purchases debit exactly once, refuse insufficient funds, and persist', () => {
  const a = makeAccount(); a.credits = 34;
  assert.equal(buyCosmetic(a, 'star_steps'), false); assert.equal(a.credits, 34);
  a.credits = 35; assert(buyCosmetic(a, 'star_steps')); assert.equal(a.credits, 0);
  a.credits = 50; assert.equal(buyCosmetic(a, 'star_steps'), false); assert.equal(a.credits, 50);
  assert.equal(buyCosmetic(a, 'gold_tint'), false);
  assert(ownsCosmetic(deserializeAccount(serializeAccount(a))!.cosmetics, 'star_steps'));
  a.credits = NaN; assert.equal(buyCosmetic(a, 'bloom_skills'), false);
});

test('Verified entitlement reconciliation is atomic, replay safe, and refund aware', () => {
  const a = makeAccount(), products = [{ sku: 'test.bundle', cosmetics: ['gold_tint', 'star_steps'] }];
  const receipt = [{ transaction: 'transaction-1', sku: 'test.bundle' }];
  assert(reconcileCosmeticEntitlements(a, 'test-provider', products, receipt));
  assert(equipCosmetic(a, 'skillRecolor', 'gold_tint'));
  const first = JSON.stringify(a.cosmetics);
  assert(reconcileCosmeticEntitlements(a, 'test-provider', products, receipt));
  assert.equal(JSON.stringify(a.cosmetics), first);
  assert.equal(reconcileCosmeticEntitlements(a, 'test-provider', products, [{ transaction: 'bad', sku: 'missing' }]), false);
  assert.equal(JSON.stringify(a.cosmetics), first);
  // Completing a milestone while already owning a purchased item still banks the earned source.
  settleCosmetics(a, { zones_explored: 3 });
  assert(reconcileCosmeticEntitlements(a, 'test-provider', products, []));
  assert(ownsCosmetic(a.cosmetics, 'gold_tint'));
  assert(!ownsCosmetic(a.cosmetics, 'star_steps'));
  assert.equal(a.cosmetics.loadout.slots.skillRecolor, 'gold_tint');
  assert(reconcileCosmeticEntitlements(a, 'test-provider', products, receipt));
  assert(equipCosmetic(a, 'footprints', 'star_steps'));
  assert(reconcileCosmeticEntitlements(a, 'test-provider', products, []));
  assert.equal(a.cosmetics.loadout.slots.footprints, undefined);
});

test('Owner attribution does not dress enemies or remote players in host cosmetics', () => {
  const w = makeSimWorld('magician', 52);
  equipCosmetic(w.account, 'skillRecolor', 'moon_tint');
  equipCosmetic(w.account, 'summonSkin', 'verdant_kin');
  const minion = w.createMonster('skeleton_warrior', 1, 'player', w.player);
  const nested = w.createMonster('skeleton_warrior', 1, 'player', minion);
  const enemy = w.createMonster('zombie', 1, 'enemy');
  assert.equal(cosmeticSkillPaint(w, nested, 'fireball').color, '#91d6ef');
  assert.equal(cosmeticLoadoutFor(w, enemy), undefined);
  const remote = w.addSeat('p1', classById('warrior'), new NullInput());
  assert.equal(cosmeticLoadoutFor(w, remote.actor), undefined);
  const native = { shape: minion.shape, radius: minion.radius, color: minion.color };
  const painted = cosmeticBody(native, cosmeticLoadoutFor(w, minion), true);
  assert.equal(painted.color, '#89bc82'); assert.equal(painted.radius, minion.radius);
  assert.equal(native.color, minion.color);
});

test('Real skill execution preserves combat, resource, collision and RNG results', () => {
  const run = (dressed: boolean) => {
    const reset = seedGlobalRandom(129);
    const oldTap = SIM_TAP.current;
    try {
      const w = makeSimWorld('magician', 129), p = w.player;
      if (dressed) {
        applySkillColorCosmetic(w.account, 'prismatic_ink', 'fireball', ['fireball']);
        setSkillCosmeticColor(w.account, 'prismatic_ink', 'fireball', '#12ff76');
        equipCosmetic(w.account, 'playerModel', 'model_veilweaver');
        equipCosmetic(w.account, 'skillSkin', 'starlit_skills');
        equipCosmetic(w.account, 'playerSkin', 'moon_glass');
      }
      const dummy = w.createMonster('target_dummy', 1, 'enemy');
      dummy.pos = { x: p.pos.x + 100, y: p.pos.y }; w.actors.push(dummy);
      const inst = makeSkillInstance(SKILLS.fireball);
      const nativeDef = JSON.stringify(inst.def);
      const hits: number[] = [];
      SIM_TAP.current = { onHit: (_attacker, target, result) => { if (target === dummy) hits.push(result.total); } };
      const cast = w.useSkill(p, inst, dummy.pos);
      assert(cast, 'the parity test actually casts');
      for (let i = 0; i < 120; i++) w.update(1 / 60);
      assert(hits.some(n => n > 0), 'the parity test actually lands damage');
      const color = w.projectiles[0]?.color;
      assert.equal(JSON.stringify(inst.def), nativeDef);
      const metrics = { cast, hits, life: dummy.life, hp: p.life, mana: p.mana, cooldown: [...p.cooldowns],
        projectiles: w.projectiles.map(x => [x.pos, x.radius, x.shape, x.age, x.speed]), rng: Math.random() };
      return { metrics, color };
    } finally { SIM_TAP.current = oldTap; reset(); }
  };
  assert.deepEqual(run(true).metrics, run(false).metrics);
});

test('Co-op snapshot carries appearances and VFX without ownership or account leakage', () => {
  const host = makeSimWorld('magician', 9);
  equipCosmetic(host.account, 'playerSkin', 'moon_glass');
  equipCosmetic(host.account, 'skillSkin', 'starlit_skills');
  equipCosmetic(host.account, 'skillRecolor', 'rose_tint');
  equipCosmetic(host.account, 'playerModel', 'model_moon_duelist');
  applySkillColorCosmetic(host.account, 'prismatic_ink', 'fireball', ['fireball']);
  setSkillCosmeticColor(host.account, 'prismatic_ink', 'fireball', '#34ef90');
  host.spawnProjectile(host.player, makeSkillInstance(SKILLS.fireball), host.player.pos, 0);
  const snapshot = serializeSnapshot(host, 1);
  assert.equal(snapshot.projectiles[0].c, '#34ef90');
  assert.equal(snapshot.projectiles[0].cosmeticMotif, 'stars');
  assert(!JSON.stringify(snapshot.actors).includes('grants'));
  assert(!JSON.stringify(snapshot.actors).includes('applications'));
  const client = makeSimWorld('magician', 9);
  applySnapshot(client, snapshot);
  assert.equal(cosmeticPick(cosmeticLoadoutFor(client, client.player), 'playerSkin')?.id, 'moon_glass');
  assert.equal(client.projectiles[0].cosmeticMotif, 'stars');
  assert.equal(cosmeticSkillPaint(client, client.player, 'fireball').color, '#34ef90');
  assert.equal(cosmeticPick(cosmeticLoadoutFor(client, client.player), 'playerModel')?.id, 'model_moon_duelist');
  assert.equal(client.account.cosmetics.loadout.slots.playerSkin, undefined);
});

test('Footprint sampling is bounded, paused, reset on teleports and cleared on removal', () => {
  const w = makeSimWorld('warrior', 23); equipCosmetic(w.account, 'footprints', 'petal_steps');
  const trail = new CosmeticTrails();
  const ctx = new Proxy({ globalAlpha: 1 }, { get: (o, key) => key in o ? o[key as keyof typeof o] : () => {} }) as unknown as CanvasRenderingContext2D;
  const loadout = w.account.cosmetics.loadout;
  trail.draw(ctx, w, w.player, loadout);
  for (let i = 0; i < 100; i++) { w.time += 0.02; w.player.pos.x += 16; trail.draw(ctx, w, w.player, loadout); }
  const inspect = trail as unknown as { trails: WeakMap<object, { steps: unknown[] }> };
  assert.equal(inspect.trails.get(w.player)!.steps.length, 24);
  trail.draw(ctx, w, w.player, loadout); assert.equal(inspect.trails.get(w.player)!.steps.length, 24);
  w.player.pos.x += 500; trail.draw(ctx, w, w.player, loadout); assert.equal(inspect.trails.get(w.player)!.steps.length, 0);
  equipCosmetic(w.account, 'footprints', null); trail.draw(ctx, w, w.player, loadout);
  assert.equal(inspect.trails.get(w.player), undefined);
});

console.log(`COSMETICS: ${checks} checks passed`);
