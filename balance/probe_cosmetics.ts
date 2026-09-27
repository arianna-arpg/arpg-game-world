import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeAccount, serializeAccount, deserializeAccount } from '../src/meta/account';
import { COSMETICS, COSMETIC_SLOTS, registerCosmetic, type CosmeticSlot } from '../src/engine/cosmetics';
import { applySkillColorCosmetic, cosmeticCharges, cosmeticSkillColor, grantCosmetic, setSkillCosmeticColor, skillColorUnlocked,
  buyCosmetic, cosmeticLoadoutFor, cosmeticSummonSkill, cosmeticPick, cosmeticSkillPaint, equipCosmetic,
  ownsCosmetic, reconcileCosmeticEntitlements, sanitizeCosmetics, sanitizeCosmeticLoadout, settleCosmetics } from '../src/meta/cosmetics';
import { SKILLS } from '../src/data/skills';
import { MATERIALS } from '../src/render/vis/materials';
import { cosmeticBody, CosmeticTrails, cosmeticPreviewSummon, cosmeticPreviewSummons } from '../src/render/vis/cosmetics';
import { makeSkillInstance } from '../src/engine/skills';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { NullInput } from '../src/net/intent';
import { classById } from '../src/sim/arena';
import { SIM_TAP } from '../src/engine/tap';
import { CLASSES } from '../src/data/classes';
import { COSMETIC_MODELS } from '../src/data/cosmeticModels';
import { LOOKS } from '../src/data/looks';
import { PART_PAINTERS, paintGlyph, lookPalette, type GlyphDef, type PartSpec } from '../src/render/vis/parts';
import { withAlpha } from '../src/render/vis/color';
import { COSMETIC_WISPS } from '../src/data/cosmeticExpansionModels';
import { COSMETIC_PROJECTILES, COSMETIC_PORTALS, COSMETIC_HOTBARS, cosmeticStyle } from '../src/data/cosmeticStyles';
import { cosmeticPortalColor, drawCosmeticPortal, drawCosmeticProjectile, cosmeticProjectileExtent, cosmeticHotbar, drawCosmeticHotbar } from '../src/render/vis/cosmeticEffects';
import { MU_CFG } from '../src/data/mu';
import { sceneBegin } from '../src/engine/scenes';
import { menuFold } from '../src/engine/menu';
import { TOWN_PORTAL_CFG } from '../src/data/townportals';
import '../src/data/menu';
import { MONSTERS } from '../src/data/monsters';
import { GOLEM_LOOKS } from '../src/data/golemLooks';
import { GLYPH_PARTS } from '../src/data/glyphParts';
import { SUMMON_LOOKS } from '../src/data/summonLooks';
import { SUMMON_LEGACY_COSMETICS } from '../src/data/summonCosmetics';
import { SKELETAL_MAGE_LOOKS } from '../src/data/skeletalMageLooks';
import { SKELETAL_MAGE_LEGACY } from '../src/data/skeletalMageCosmetics';
import { UNDEAD_COURT_LOOKS } from '../src/data/undeadCourtLooks';
import { UNDEAD_COURT_LEGACY } from '../src/data/undeadCourtCosmetics';
import { AVIAN_LOOKS } from '../src/data/avianLooks';
import { AVIAN_LEGACY } from '../src/data/avianCosmetics';
import { CANINE_LOOKS } from '../src/data/canineLooks';
import { CANINE_LEGACY } from '../src/data/canineCosmetics';
import { ARACHNID_LOOKS } from '../src/data/arachnidLooks';
import { ARACHNID_LEGACY } from '../src/data/arachnidCosmetics';
import { STALKER_LOOKS } from '../src/data/stalkerLooks';
import { STALKER_LEGACY } from '../src/data/stalkerCosmetics';
import { updateAI } from '../src/engine/ai';

let checks = 0;
const test = (label: string, run: () => void): void => { run(); checks++; console.log(`PASS ${label}`); };

test('Every category has authored content; material and skill references resolve', () => {
  for (const slot of Object.keys(COSMETIC_SLOTS)) assert(Object.values(COSMETICS).some(d => d.slot === slot));
  for (const d of Object.values(COSMETICS)) {
    if (d.paint.material) assert(MATERIALS[d.paint.material], d.id);
    if (d.paint.look) assert(LOOKS[d.paint.look], d.id);
    if (d.paint.projectile) assert(cosmeticStyle(COSMETIC_PROJECTILES, d.paint.projectile), d.id);
    if (d.paint.portal) assert(cosmeticStyle(COSMETIC_PORTALS, d.paint.portal), d.id);
    if (d.paint.hotbar) assert(cosmeticStyle(COSMETIC_HOTBARS, d.paint.hotbar), d.id);
    for (const id of d.skills ?? []) assert(SKILLS[id], `${d.id}: ${id}`);
  }
  assert.throws(() => registerCosmetic(COSMETICS.moon_tint));
});

test('Exclusive projectile skins cannot be worn by incompatible skills, including defaults and saves', () => {
  const a = makeAccount();
  assert(equipCosmetic(a, 'skillSkin', 'flame_fletching'));
  assert.equal(cosmeticPick(a.cosmetics.loadout, 'skillSkin', 'flame_arrow')?.paint.projectile, 'feathered_arrow');
  assert.equal(cosmeticPick(a.cosmetics.loadout, 'skillSkin', 'fireball'), undefined);
  assert.equal(equipCosmetic(a, 'skillSkin', 'flame_fletching', 'fireball'), false);
  assert.equal(equipCosmetic(a, 'skillSkin', 'fireball_comet', 'flame_arrow'), false);
  const raw = { slots: {}, skills: { fireball: { skillSkin: 'flame_fletching' }, flame_arrow: { skillSkin: 'flame_fletching' } } };
  assert.deepEqual(sanitizeCosmeticLoadout(raw).skills, { flame_arrow: { skillSkin: 'flame_fletching' } });
  assert(equipCosmetic(a, 'skillSkin', 'crystal_projectiles', 'fireball'));
  assert.equal(cosmeticPick(deserializeAccount(serializeAccount(a))!.cosmetics.loadout, 'skillSkin', 'fireball')?.paint.projectile, 'crystal_bolt');
});

test('Golem material bodies and free legacy skill skins preserve identity, inheritance and save choices', () => {
  const a = makeAccount(), skin = COSMETICS.legacy_golems;
  assert(ownsCosmetic(a.cosmetics, skin.id));
  assert(equipCosmetic(a, 'skillSkin', skin.id));
  const looks = new Set<string>();
  for (const skill of skin.skills!) {
    const delivery = SKILLS[skill].delivery; assert(delivery.type === 'summon');
    assert(delivery.monsterId);
    const def = MONSTERS[delivery.monsterId], native = { ...def }, before = JSON.stringify(def);
    const authored = GOLEM_LOOKS[def.look!]; assert(authored); looks.add(def.look!);
    for (const part of [...authored.parts, ...authored.live ?? []]) assert(PART_PAINTERS[part.kind] || GLYPH_PARTS[part.kind], part.kind);
    const source = { defId: def.id, skill };
    const painted = cosmeticBody(native, a.cosmetics.loadout, true, false, source);
    assert.equal(painted.look, skin.paint.summonBodies![def.id].look);
    assert.equal(painted.radius, native.radius); assert.equal(painted.shape, native.shape);
    assert.equal(painted.color, native.color);
    assert.equal(JSON.stringify(def), before);
    assert.equal(cosmeticBody(native, a.cosmetics.loadout, false, false, source).look, native.look, 'unowned bodies keep native art');
    assert(equipCosmetic(a, 'skillSkin', null, skill));
    const loaded = deserializeAccount(serializeAccount(a))!;
    assert.equal(cosmeticBody(native, loaded.cosmetics.loadout, true, false, source).look, native.look, 'explicit original survives reload');
    assert(equipCosmetic(a, 'skillSkin', undefined, skill));
    assert.equal(cosmeticBody(native, a.cosmetics.loadout, true, false, source).look, painted.look, 'inherit restores legacy');
  }
  assert.equal(looks.size, 5);
  assert.equal(equipCosmetic(a, 'skillSkin', skin.id, 'fireball'), false);
  assert.equal(cosmeticPick(a.cosmetics.loadout, 'skillSkin', 'raise_skeleton'), undefined);
  assert.equal(cosmeticBody(MONSTERS.skeleton_warrior, a.cosmetics.loadout, true, false,
    { defId: 'skeleton_warrior', skill: 'summon_bone_golem' }).look, MONSTERS.skeleton_warrior.look, 'offspring of another body are never replaced');
  equipCosmetic(a, 'summonSkin', 'verdant_kin');
  const layered = cosmeticBody(MONSTERS.stone_golem, a.cosmetics.loadout, true, false,
    { defId: 'stone_golem', skill: 'summon_stone_golem' });
  assert.equal(layered.look, 'golem'); assert.equal(layered.color, '#89bc82');
});

test('Summon body skins follow actual skill attribution through real casting, nested heirs and co-op', () => {
  const host = makeSimWorld('magician', 719), p = host.player;
  equipCosmetic(host.account, 'skillSkin', 'legacy_golems', 'summon_stone_golem');
  const inst = makeSkillInstance(SKILLS.summon_stone_golem);
  p.skills[0] = inst;
  assert(host.useSkill(p, inst, p.pos));
  for (let i = 0; i < 90; i++) host.update(1 / 60);
  const summoned = host.actors.find(a => a.owner === p && a.defId === 'stone_golem'); assert(summoned);
  const paint = (world: typeof host, actor: typeof p) => cosmeticBody(actor, cosmeticLoadoutFor(world, actor), actor.isMinion(), false,
    { defId: actor.defId, skill: cosmeticSummonSkill(actor) });
  assert.equal(paint(host, summoned).look, 'golem');
  assert.equal(summoned.look, 'golem_stone_assembled');
  // Item followers use a private cap marker; their instance remains authoritative.
  summoned.sourceSkillId = '__companion:summon_stone_golem';
  assert.equal(cosmeticSummonSkill(summoned), 'summon_stone_golem');
  const heir = host.createMonster('stone_golem', 1, 'player', summoned);
  heir.summonInst = inst; host.actors.push(heir);
  assert.equal(paint(host, heir).look, 'golem');
  const client = makeSimWorld('magician', 719);
  equipCosmetic(client.account, 'summonSkin', 'verdant_kin');
  const snapshot = serializeSnapshot(host, 1); applySnapshot(client, snapshot);
  for (const actor of [summoned, heir]) {
    const replica = client.actors[snapshot.actors.findIndex(a => a.id === actor.id)]; assert(replica);
    assert.equal(cosmeticSummonSkill(replica), 'summon_stone_golem');
    assert.equal(replica.sourceSkillId, undefined, 'presentation attribution does not overwrite gameplay cap markers');
    assert.equal(paint(client, replica).look, 'golem');
    assert.equal(paint(client, replica).color, actor.color, 'viewers do not lend their own outfit');
  }
  const wire = snapshot.actors.find(a => a.id === summoned.id); assert(wire);
  delete wire.cosmeticSourceSkill; applySnapshot(client, snapshot);
  const replica = client.actors[snapshot.actors.findIndex(a => a.id === summoned.id)];
  assert.equal(cosmeticSummonSkill(replica), undefined, 'older peer data clears previous source');
  assert.equal(paint(client, replica).look, 'golem_stone_assembled');
});

test('Mu spirits have independent silhouettes; character cosmetics and scene seals do not override them', () => {
  const w = makeSimWorld('warrior', 47001);
  equipCosmetic(w.account, 'playerModel', 'model_necromancer'); equipCosmetic(w.account, 'playerSkin', 'moon_glass');
  assert(sceneBegin(w, 'mu'));
  for (let i = 0; i < 18; i++) w.update(1 / 60);
  assert.equal(w.player.cosmeticKind, 'wisp'); assert.equal(w.player.look, MU_CFG.wisp.look);
  const native = { shape: w.player.shape, radius: w.player.radius, color: w.player.color, look: w.player.look };
  assert.deepEqual(cosmeticBody(native, w.account.cosmetics.loadout, false, true), native);
  assert(COSMETIC_MODELS.length >= 8); assert(COSMETIC_WISPS.length >= 3);
  for (const wis of COSMETIC_WISPS) {
    for (const part of [...wis.body.parts, ...(wis.body.live ?? [])]) assert(PART_PAINTERS[part.kind]);
    assert(equipCosmetic(w.account, 'wispSkin', `wisp_${wis.id}`));
    const body = cosmeticBody(native, w.account.cosmetics.loadout, false, true);
    assert.equal(body.look, `cosmetic_wisp_${wis.id}`); assert.equal(body.color, wis.color);
    assert.equal(body.radius, native.radius); assert.equal(body.adorn, undefined);
    assert.equal(cosmeticBody(native, w.account.cosmetics.loadout).look, 'class_necromancer', 'hero resolution remains independent');
  }
  const menu = menuFold({ account: w.account, world: w, seat: w.localSeat, pageOpen: () => false, ownedUnlock: () => false });
  assert.equal(menu.entries.find(e => e.def.id === 'wardrobe')?.state, 'open');
  assert.equal(menu.entries.find(e => e.def.id === 'character')?.state, 'sealed');
  const client = makeSimWorld('warrior', 47001); applySnapshot(client, serializeSnapshot(w, 2));
  assert.equal(client.player.cosmeticKind, 'wisp');
  assert.equal(cosmeticBody(native, cosmeticLoadoutFor(client, client.player), false, client.player.cosmeticKind === 'wisp').look, 'cosmetic_wisp_wandering_prism');
  w.player.cosmeticKind = undefined; applySnapshot(client, serializeSnapshot(w, 3));
  assert.equal(client.player.cosmeticKind, undefined, 'later snapshots clear wisp identity');
});

test('Portal choices follow their caster through both ends and snapshot synchronization', () => {
  const w = makeSimWorld('warrior', 7721);
  w.zone.objective = { kind: 'clear', all: true };
  equipCosmetic(w.account, 'portalSkin', 'portal_petals'); equipCosmetic(w.account, 'portalRecolor', 'portal_rose');
  assert(w.castTownPortal()); for (let i = 0; i < 90; i++) w.update(1 / 60);
  const view = w.townPortalViews()[0]; assert(view);
  assert.equal(cosmeticPortalColor(view.cosmeticLoadout), '#edaccf');
  assert.equal(view.cosmeticLoadout?.slots.portalSkin, 'portal_petals');
  assert.deepEqual(Object.keys(view.cosmeticLoadout!.slots).sort(), ['portalRecolor', 'portalSkin']);
  const transit = w as unknown as { updateTownPortals(dt: number): boolean };
  w.player.pos = { x: view.pos.x + 150, y: view.pos.y }; transit.updateTownPortals(0);
  w.player.pos = { ...view.pos }; w.player.casting = null; w.player.push = null; w.localSeat.lastActedAt = -100;
  assert(transit.updateTownPortals(TOWN_PORTAL_CFG.dwellSeconds + .1));
  assert(w.townPortalViews()[0].label.startsWith('Return to'));
  assert.equal(cosmeticPortalColor(w.townPortalViews()[0].cosmeticLoadout), '#edaccf');
  const snap = serializeSnapshot(w, 1), client = makeSimWorld('warrior', 7721);
  equipCosmetic(client.account, 'portalRecolor', 'portal_gold'); applySnapshot(client, snap);
  assert.equal(cosmeticPortalColor(client.townPortalViews()[0].cosmeticLoadout), '#edaccf', 'viewer account does not paint someone else’s portal');
  const saved = deserializeAccount(serializeAccount(w.account))!;
  assert.equal(saved.cosmetics.loadout.slots.portalSkin, 'portal_petals');
  const peer = w.addSeat('peer-portal', classById('warrior'), new NullInput());
  peer.actor.cosmeticLoadout = { slots: { portalSkin: 'portal_runic', portalRecolor: 'portal_jade' }, skills: {} };
  w.townPortals.push({ ...w.townPortals[0], owner: peer.id });
  assert.equal(cosmeticPortalColor(w.townPortalViews().find(p => p.owner === peer.id)!.cosmeticLoadout), '#83e0b5');
});

test('Visual styles animate without RNG; unknown wire styles fall back to native art', () => {
  const capture = (draw: (ctx: CanvasRenderingContext2D) => void): string => {
    const calls: unknown[] = [];
    const ctx = new Proxy({ globalAlpha: 1 }, { get: (o, key) => key in o ? o[key as keyof typeof o]
      : (...args: unknown[]) => { calls.push([key, ...args]); }, set: (o, key, value) => { calls.push([key, value]); return Reflect.set(o, key, value); } });
    const random = Math.random;
    try { Math.random = () => { throw new Error('Cosmetic painter consumed gameplay RNG'); }; draw(ctx as unknown as CanvasRenderingContext2D); }
    finally { Math.random = random; }
    return JSON.stringify(calls);
  };
  for (const id of ['portal_astral', 'portal_runic', 'portal_petals']) {
    const look = { slots: { portalSkin: id, portalRecolor: 'portal_jade' }, skills: {} };
    const at = (t: number) => capture(ctx => drawCosmeticPortal(ctx, look, t));
    assert.notEqual(at(0), at(1)); assert.equal(at(1), at(1));
  }
  assert.equal(capture(ctx => { assert(!drawCosmeticProjectile(ctx, '__proto__', '#123456', 5, 0, 0)); }), '[]');
  for (const [id, style] of Object.entries(COSMETIC_PROJECTILES)) {
    assert(capture(ctx => { assert(drawCosmeticProjectile(ctx, id, '#123456', 5, 0, 0)); }).length > 100);
    assert.equal(cosmeticProjectileExtent(id), style.extent);
  }
  const host = makeSimWorld('pyromancer', 40);
  equipCosmetic(host.account, 'skillSkin', 'flame_fletching', 'flame_arrow');
  host.spawnProjectile(host.player, makeSkillInstance(SKILLS.flame_arrow), host.player.pos, 0);
  const shot = host.projectiles[0]; assert.equal(shot.cosmeticProjectile, 'feathered_arrow'); assert.equal(shot.shape, 'circle');
  const snap = serializeSnapshot(host, 1), client = makeSimWorld('pyromancer', 40); applySnapshot(client, snap);
  assert.equal(client.projectiles[0].cosmeticProjectile, 'feathered_arrow'); assert.equal(client.projectiles[0].radius, shot.radius);
  snap.projectiles[0].cosmeticProjectile = 'constructor'; applySnapshot(client, snap);
  assert.equal(client.projectiles[0].cosmeticProjectile, undefined);
});

test('Hotbar palettes are account cosmetics with independent slots and safe fallbacks', () => {
  const a = makeAccount(); assert(equipCosmetic(a, 'hotbarSkin', 'hotbar_rose'));
  const style = cosmeticHotbar(a.cosmetics.loadout); assert.equal(style, COSMETIC_HOTBARS.rose_vellum);
  assert.equal(cosmeticHotbar(deserializeAccount(serializeAccount(a))!.cosmetics.loadout), style);
  assert.equal(equipCosmetic(a, 'playerSkin', 'hotbar_rose'), false);
  assert.equal(cosmeticStyle(COSMETIC_HOTBARS, 'toString'), undefined);
  const ctx = new Proxy({ globalAlpha: 1 }, { get: (o, key) => key in o ? o[key as keyof typeof o] : () => {} }) as unknown as CanvasRenderingContext2D;
  drawCosmeticHotbar(ctx, a.cosmetics.loadout, 10, 10, 200, 54);
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
        equipCosmetic(w.account, 'skillSkin', 'fireball_comet');
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

test('Summon refresh: complete native bodies, preserved legacy art and source-aware previews', () => {
  const account = makeAccount(), distinct = new Set<string>();
  for (const skin of SUMMON_LEGACY_COSMETICS) {
    assert(ownsCosmetic(account.cosmetics, skin.id));
    assert(equipCosmetic(account, 'skillSkin', skin.id));
    for (const skill of skin.skills!) {
      const def = cosmeticPreviewSummon(skill); assert(def, skill);
      const legacy = skin.paint.summonBodies![def.id]; assert(legacy, skill);
      assert(LOOKS[legacy.look]); assert(MATERIALS[legacy.material!]);
      const look = SUMMON_LOOKS[def.look!]; assert(look, def.id); distinct.add(def.look!);
      for (const p of [...look.parts, ...look.live ?? []]) assert(PART_PAINTERS[p.kind], p.kind);
      const source = { defId: def.id, skill }, old = JSON.stringify(def);
      const painted = cosmeticBody(def, account.cosmetics.loadout, true, false, source);
      assert.equal(painted.look, legacy.look); assert.equal(painted.color, def.color);
      assert.equal(painted.radius, def.radius); assert.equal(painted.shape, def.shape);
      assert.equal(JSON.stringify(def), old);
      assert.equal(cosmeticBody(def, account.cosmetics.loadout, false, false, source).look, def.look, 'boss/enemy keeps native anatomy');
      assert(equipCosmetic(account, 'skillSkin', null, skill));
      const restored = deserializeAccount(serializeAccount(account))!;
      assert.equal(cosmeticBody(def, restored.cosmetics.loadout, true, false, source).look, def.look);
      assert(equipCosmetic(account, 'skillSkin', undefined, skill));
    }
    assert.equal(equipCosmetic(account, 'skillSkin', skin.id, 'fireball'), false);
  }
  assert.equal(distinct.size, 6);
  assert.equal(cosmeticPreviewSummon('the_amalgam'), MONSTERS.amalgam_horror, 'channel-release summon uses its authored body');
  assert.equal(cosmeticPreviewSummon('fireball'), undefined);
  assert.equal(MONSTERS.spirit_wisp.look, 'spirit', 'shared source looks remain available to other bodies');
});

test('Summon refresh: real Amalgam consumption, growth, legacy selection and peer attribution preserve gameplay', () => {
  const run = (legacy: boolean) => {
    const reset = seedGlobalRandom(82190);
    try {
      const w = makeSimWorld('necromancer', 82190), p = w.player;
      if (legacy) equipCosmetic(w.account, 'skillSkin', 'legacy_amalgam', 'the_amalgam');
      p.sheet.setSource('summon-refresh-rig', [{ stat: 'mana', kind: 'flat', value: 1000 },
        { stat: 'willpower', kind: 'flat', value: 100 }, { stat: 'intelligence', kind: 'flat', value: 100 }]);
      p.fillResources(); p.invulnerable = true;
      const inst = makeSkillInstance(SKILLS.the_amalgam); p.skills[0] = inst;
      const meals = [0,1].map(i => {
        const a = w.createMonster('skeleton_warrior', 1, 'player', p);
        a.pos = { x: p.pos.x + 22 + i * 18, y: p.pos.y }; a.anchored = true; w.actors.push(a); return a;
      });
      assert(w.useSkill(p, inst, p.pos));
      for (let i = 0; i < 100 && (p.casting?.amalgamFed ?? 0) < 2; i++) {
        assert(p.casting, 'channel stays active while held'); p.casting.held = true; w.update(1 / 60);
      }
      assert.equal(p.casting?.amalgamFed, 2); assert(meals.every(a => a.dead));
      p.casting!.held = false; w.update(1 / 60);
      const body = w.actors.find(a => a.owner === p && a.defId === 'amalgam_horror'); assert(body);
      assert.equal(body.look, 'amalgam_stitched'); assert.equal(cosmeticSummonSkill(body), 'the_amalgam');
      assert.equal(body.radius, MONSTERS.amalgam_horror.radius * (1 + SKILLS.the_amalgam.amalgam!.perMinion.size * 2));
      const paint = cosmeticBody(body, cosmeticLoadoutFor(w, body), true, false, { defId: body.defId, skill: cosmeticSummonSkill(body) });
      assert.equal(paint.look, legacy ? 'gravemaw' : 'amalgam_stitched');
      const metrics = { radius: body.radius, shape: body.shape, life: body.life, lifespan: body.lifespan,
        damage: body.sheet.get('damage'), skills: body.skills.map(s => s?.def.id), mana: p.mana, rng: Math.random() };
      if (legacy) {
        const client = makeSimWorld('necromancer', 82190), snap = serializeSnapshot(w, 1);
        applySnapshot(client, snap);
        const replica = client.actors[snap.actors.findIndex(a => a.id === body.id)]; assert(replica);
        assert.equal(cosmeticSummonSkill(replica), 'the_amalgam');
        assert.equal(cosmeticBody(replica, cosmeticLoadoutFor(client, replica), true, false,
          { defId: replica.defId, skill: cosmeticSummonSkill(replica) }).look, 'gravemaw');
      }
      return metrics;
    } finally { reset(); }
  };
  assert.deepEqual(run(true), run(false));
});

test('Skeletal mage visuals: pool and tree previews retain source identity, native defaults and legacy palettes', () => {
  const ids = Object.keys(SKELETAL_MAGE_LEGACY.paint.summonBodies!), a = makeAccount();
  assert(ownsCosmetic(a.cosmetics, SKELETAL_MAGE_LEGACY.id));
  assert.deepEqual(cosmeticPreviewSummons('summon_skeleton_mage').map(m => m.id), ids);
  assert.deepEqual(cosmeticPreviewSummons('summon_skeleton_archer').map(m => m.id), ['skeleton_archer', ...ids.slice(0, 4)]);
  assert.deepEqual(cosmeticPreviewSummons('raise_dead').map(m => m.id), ['skeleton_warrior', 'zombie', 'court_abomination']);
  assert.deepEqual(cosmeticPreviewSummons('fireball'), []);
  assert.deepEqual(cosmeticPreviewSummons('missing_skill'), []);
  assert.equal(cosmeticPreviewSummon('summon_skeleton_mage', 'stone_golem')?.id, ids[0]);
  assert.equal(cosmeticPreviewSummon('summon_skeleton_archer', 'ossuary_lich')?.id, 'skeleton_archer');
  const nativeLooks = new Set<string>();
  for (const id of ids) {
    const m = MONSTERS[id], before = JSON.stringify(m), native = SKELETAL_MAGE_LOOKS[m.look!];
    assert(native, id); nativeLooks.add(m.look!);
    for (const part of [...native.parts, ...native.live ?? []]) assert(PART_PAINTERS[part.kind], part.kind);
    assert.equal(cosmeticPreviewSummon('summon_skeleton_mage', id), m);
    assert(equipCosmetic(a, 'skillSkin', SKELETAL_MAGE_LEGACY.id, 'summon_skeleton_mage'));
    const source = { defId: id, skill: 'summon_skeleton_mage' };
    const painted = cosmeticBody(m, a.cosmetics.loadout, true, false, source);
    assert.deepEqual(painted, { ...m, look: 'lich' });
    assert.equal(JSON.stringify(m), before);
    assert.equal(cosmeticBody(m, a.cosmetics.loadout, false, false, source).look, m.look);
    assert(equipCosmetic(a, 'skillSkin', null, 'summon_skeleton_mage'));
    const reloaded = deserializeAccount(serializeAccount(a))!;
    assert.equal(cosmeticBody(m, reloaded.cosmetics.loadout, true, false, source).look, m.look);
  }
  assert.equal(nativeLooks.size, 5);
  assert(equipCosmetic(a, 'skillSkin', SKELETAL_MAGE_LEGACY.id, 'summon_skeleton_archer'));
  const archer = MONSTERS.skeleton_archer;
  assert.equal(cosmeticBody(archer, a.cosmetics.loadout, true, false,
    { defId: archer.id, skill: 'summon_skeleton_archer' }).look, archer.look, 'unmapped archer stays an archer');
  assert.equal(equipCosmetic(a, 'skillSkin', SKELETAL_MAGE_LEGACY.id, 'fireball'), false);
});

test('Skeletal mage visuals: real random, ascendant and archer-tree casts preserve gameplay and peer appearances', () => {
  const run = (skill: string, nodes: string[], legacy: boolean) => {
    const reset = seedGlobalRandom(93821);
    try {
      const w = makeSimWorld('necromancer', 93821), p = w.player;
      if (legacy) assert(equipCosmetic(w.account, 'skillSkin', SKELETAL_MAGE_LEGACY.id, skill));
      const inst = makeSkillInstance(SKILLS[skill], 20, 1);
      w.meta.knownSkills.set(skill, inst); p.skills.fill(null); p.skills[0] = inst;
      for (const node of nodes) w.pickTreeNode(skill, node);
      assert.deepEqual(inst.treeNodes ?? [], nodes);
      // Learned skills read the seat's real attributes; tree allocation also rebuilds the sheet.
      for (const attr of Object.keys(w.meta.baseAttrs) as (keyof typeof w.meta.baseAttrs)[]) w.meta.baseAttrs[attr] = 100;
      w.recalcSeat(w.localSeat);
      p.sheet.setSource('mage-visual-rig', [{ stat: 'mana', kind: 'flat', value: 1000 }]);
      p.fillResources(); p.invulnerable = true;
      assert(w.useSkill(p, inst, p.pos), `${skill}/${nodes.join(',')}: real cast starts`);
      for (let i = 0; i < 100; i++) w.update(1 / 60);
      const bodies = w.actors.filter(b => b.owner === p && !b.dead);
      assert(bodies.length > 0);
      assert(bodies.every(b => !!SKELETAL_MAGE_LOOKS[b.look!]));
      if (nodes.includes('lich_ascendant')) assert.deepEqual(bodies.map(b => b.defId), ['ossuary_lich']);
      const metrics = { mana: p.mana, rng: Math.random(), bodies: bodies.map(b => ({
        id: b.defId, radius: b.radius, shape: b.shape, life: b.life, lifespan: b.lifespan,
        damage: b.sheet.get('damage'), skills: b.skills.map(s => s?.def.id), source: cosmeticSummonSkill(b),
      })) };
      const client = makeSimWorld('necromancer', 93821), snapshot = serializeSnapshot(w, 1);
      applySnapshot(client, snapshot);
      for (const body of bodies) {
        const replica = client.actors[snapshot.actors.findIndex(a => a.id === body.id)]; assert(replica);
        assert.equal(cosmeticSummonSkill(body), skill); assert.equal(cosmeticSummonSkill(replica), skill);
        for (const [world, b] of [[w, body], [client, replica]] as const) {
          assert.equal(cosmeticBody(b, cosmeticLoadoutFor(world, b), true, false,
            { defId: b.defId, skill: cosmeticSummonSkill(b) }).look, legacy ? 'lich' : body.look);
        }
      }
      return metrics;
    } finally { reset(); }
  };
  for (const [skill, nodes] of [['summon_skeleton_mage', []], ['summon_skeleton_mage', ['lich_ascendant']],
    ['summon_skeleton_archer', ['unstrung_sorcery']]] as [string, string[]][]) {
    assert.deepEqual(run(skill, nodes, true), run(skill, nodes, false));
  }
});

test('Undead court visuals: all branch bodies preserve legacy art, source isolation and saved overrides', () => {
  const a = makeAccount(), skin = UNDEAD_COURT_LEGACY, nativeLooks = new Set<string>();
  assert(ownsCosmetic(a.cosmetics, skin.id));
  assert(equipCosmetic(a, 'skillSkin', skin.id));
  const visited = new Set<string>();
  for (const skill of skin.skills!) for (const m of cosmeticPreviewSummons(skill)) {
    const old = skin.paint.summonBodies![m.id], source = { defId: m.id, skill };
    if (!old) {
      assert.deepEqual(cosmeticBody(m, a.cosmetics.loadout, true, false, source), m, 'base form keeps its own appearance');
      continue;
    }
    visited.add(m.id); nativeLooks.add(m.look!);
    const look = UNDEAD_COURT_LOOKS[m.look!]; assert(look, m.id);
    for (const p of [...look.parts, ...look.live ?? []]) assert(PART_PAINTERS[p.kind], p.kind);
    assert(LOOKS[old.look]); assert(MATERIALS[old.material!]);
    assert.equal(old.color, m.color); assert.equal(old.material, m.material);
    const before = JSON.stringify(m);
    assert.deepEqual(cosmeticBody(m, a.cosmetics.loadout, true, false, source), { ...m, ...old });
    assert.equal(JSON.stringify(m), before, 'shared monster data is immutable');
    assert.deepEqual(cosmeticBody(m, a.cosmetics.loadout, false, false, source), m, 'enemy body is not dressed');
    assert.deepEqual(cosmeticBody(m, a.cosmetics.loadout, true, false, { ...source, skill: 'fireball' }), m);
    assert(equipCosmetic(a, 'skillSkin', null, skill));
    const restored = deserializeAccount(serializeAccount(a))!;
    assert.deepEqual(cosmeticBody(m, restored.cosmetics.loadout, true, false, source), m);
    assert(equipCosmetic(a, 'skillSkin', undefined, skill));
  }
  assert.deepEqual([...visited].sort(), Object.keys(skin.paint.summonBodies!).sort());
  assert.equal(nativeLooks.size, 7);
  assert.equal(equipCosmetic(a, 'skillSkin', skin.id, 'summon_stone_golem'), false);
});

test('Undead court visuals: real branch casts and both Pyres preserve gameplay, RNG and peer appearances', () => {
  const run = (skill: string, node: string, expected: string, legacy: boolean) => {
    const reset = seedGlobalRandom(71382);
    try {
      const w = makeSimWorld('necromancer', 71382), p = w.player;
      if (legacy) assert(equipCosmetic(w.account, 'skillSkin', UNDEAD_COURT_LEGACY.id, skill));
      const inst = makeSkillInstance(SKILLS[skill], 20, 1);
      w.meta.knownSkills.set(skill, inst); p.skills.fill(null); p.skills[0] = inst;
      w.pickTreeNode(skill, node); assert.deepEqual(inst.treeNodes, [node]);
      for (const attr of Object.keys(w.meta.baseAttrs) as (keyof typeof w.meta.baseAttrs)[]) w.meta.baseAttrs[attr] = 100;
      w.recalcSeat(w.localSeat);
      p.sheet.setSource('court-visual-rig', [{ stat: 'mana', kind: 'flat', value: 1000 }]);
      p.fillResources(); p.invulnerable = true;
      assert(w.useSkill(p, inst, { x: p.pos.x + 70, y: p.pos.y }), `${skill}/${node}: real cast starts`);
      for (let i = 0; i < 100; i++) { if (p.casting) p.casting.held = true; w.update(1 / 60); }
      const bodies = w.actors.filter(b => b.owner === p && !b.dead);
      assert(bodies.length > 0, node); assert(bodies.every(b => b.defId === expected), node);
      const metrics = { mana: p.mana, rng: Math.random(), bodies: bodies.map(b => ({
        id: b.defId, radius: b.radius, shape: b.shape, life: b.life, lifespan: b.lifespan,
        speed: b.sheet.get('moveSpeed'), damage: b.sheet.get('damage'), skills: b.skills.map(s => s?.def.id),
        source: cosmeticSummonSkill(b), pos: b.pos,
      })) };
      const client = makeSimWorld('necromancer', 71382), snapshot = serializeSnapshot(w, 1);
      applySnapshot(client, snapshot);
      for (const body of bodies) {
        const replica = client.actors[snapshot.actors.findIndex(a => a.id === body.id)]; assert(replica);
        for (const [world, b] of [[w, body], [client, replica]] as const) {
          assert.equal(cosmeticSummonSkill(b), skill);
          assert.equal(cosmeticBody(b, cosmeticLoadoutFor(world, b), true, false,
            { defId: b.defId, skill: cosmeticSummonSkill(b) }).look,
          legacy ? UNDEAD_COURT_LEGACY.paint.summonBodies![expected].look : MONSTERS[expected].look);
        }
      }
      return metrics;
    } finally { reset(); }
  };
  for (const [skill, node, expected] of [
    ['summon_skeleton', 'grave_phalanx', 'skeletal_sentinel'],
    ['summon_skeleton', 'ossuary_duelists', 'skeletal_duelist'],
    ['raise_dead', 'flesh_assembly', 'court_abomination'],
    ['summon_raging_spirit', 'frenzied_embers', 'court_ember'],
    ['summon_raging_spirit', 'vigil_flames', 'court_vigil_flame'],
    ['summon_wraith', 'hexwoven_shades', 'court_hex_wraith'],
    ['summon_wraith', 'soul_reavers', 'court_reaper_wraith'],
    ['spirit_pyre', 'running_wildfire', 'court_ember'],
    ['spirit_pyre', 'banked_pyre', 'court_ember'],
  ]) assert.deepEqual(run(skill, node, expected, true), run(skill, node, expected, false));
});

test('Avian visuals: native birds resolve, the falcon legacy is exact, and wild birds stay independent', () => {
  const account = makeAccount(), skin = AVIAN_LEGACY;
  assert(ownsCosmetic(account.cosmetics, skin.id));
  assert(equipCosmetic(account, 'skillSkin', skin.id));
  assert.deepEqual(cosmeticPreviewSummons('cast_falcon').map(m => m.id), ['hunting_falcon']);
  const ids = ['hunting_falcon', 'dune_vulture', 'carrion_shrike'];
  assert.equal(new Set(ids.map(id => MONSTERS[id].look)).size, 3);
  for (const id of ids) {
    const def = MONSTERS[id], look = AVIAN_LOOKS[def.look!]; assert(look);
    for (const p of [...look.parts, ...look.live ?? []]) assert(PART_PAINTERS[p.kind], p.kind);
    const source = { defId: id, skill: 'cast_falcon' }, before = JSON.stringify(def);
    const dressed = cosmeticBody(def, account.cosmetics.loadout, true, false, source);
    assert.deepEqual(dressed, id === 'hunting_falcon' ? { ...def, look: 'vulture' } : def);
    assert.deepEqual(cosmeticBody(def, account.cosmetics.loadout, false, false, source), def);
    assert.equal(JSON.stringify(def), before);
  }
  assert(equipCosmetic(account, 'skillSkin', null, 'cast_falcon'));
  const restored = deserializeAccount(serializeAccount(account))!, falcon = MONSTERS.hunting_falcon;
  assert.equal(cosmeticBody(falcon, restored.cosmetics.loadout, true, false,
    { defId: falcon.id, skill: 'cast_falcon' }).look, falcon.look);
  assert.equal(equipCosmetic(account, 'skillSkin', skin.id, 'summon_swarmlings'), false);
  assert(LOOKS.vulture, 'the original shared bird composition remains available');
});

test('Avian visuals: real falcon cast, latch, vulnerability, rebirth and peers preserve gameplay under either skin', () => {
  const run = (legacy: boolean) => {
    const reset = seedGlobalRandom(62171);
    try {
      const w = makeSimWorld('falconer', 62171), p = w.player;
      p.skills.fill(null);
      const inst = makeSkillInstance(SKILLS.cast_falcon, 1, 1);
      p.skills[0] = inst; w.meta.knownSkills.set(inst.def.id, inst);
      for (const attr of Object.keys(w.meta.baseAttrs) as (keyof typeof w.meta.baseAttrs)[]) w.meta.baseAttrs[attr] = 100;
      w.recalcSeat(w.localSeat);
      p.sheet.setSource('avian-rig', [{ stat: 'mana', kind: 'flat', value: 1000 }]);
      p.fillResources(); p.invulnerable = true;
      if (legacy) assert(equipCosmetic(w.account, 'skillSkin', AVIAN_LEGACY.id, inst.def.id));
      assert(w.useSkill(p, inst, p.pos));
      for (let i = 0; i < 60; i++) w.update(1 / 60);
      const bird = w.actors.find(a => a.owner === p && a.defId === 'hunting_falcon' && !a.dead); assert(bird);
      assert.equal(p.reservedMana, 9);
      const prey = w.createMonster('plains_wolf', 1, 'enemy');
      prey.pos = { x: p.pos.x + 80, y: p.pos.y }; prey.tier = p.tier; prey.skills = [];
      prey.sheet.setSource('avian-rig', [{ stat: 'life', kind: 'override', value: 100000 },
        { stat: 'moveSpeed', kind: 'override', value: 0 }]); prey.fillResources();
      w.actors.push(prey);
      let latchedAt = -1;
      for (let i = 0; i < 360; i++) {
        for (const a of w.actors) updateAI(a, w, 1 / 60);
        w.update(1 / 60);
        if (latchedAt < 0 && bird.clingTo?.id === prey.id && prey.statuses.some(s => s.id === 'vulnerable')) latchedAt = i;
      }
      assert(latchedAt >= 0, `the actual bird reaches, latches and marks prey: ${JSON.stringify({ bird: bird.pos, prey: prey.pos, target: bird.aiTargetId, tier: [bird.tier, prey.tier], cling: bird.clingTo, statuses: prey.statuses.map(s => s.id) })}`);
      w.kill(bird);
      for (let i = 0; i < 320; i++) w.update(1 / 60);
      const reborn = w.actors.find(a => a.owner === p && a.defId === 'hunting_falcon' && !a.dead); assert(reborn);
      assert.notEqual(reborn.id, bird.id); assert.equal(p.reservedMana, 9);
      const wild = ['dune_vulture', 'carrion_shrike'].map(id => {
        const a = w.createMonster(id, 1, 'enemy'); a.pos = { ...p.pos }; w.actors.push(a); return a;
      });
      const metrics = { latchedAt, damage: prey.maxLife() - prey.life, mana: p.mana, reserved: p.reservedMana,
        radius: reborn.radius, life: reborn.life, flying: reborn.flying, cling: reborn.cling,
        skills: reborn.skills.map(s => s?.def.id), rng: Math.random() };
      const client = makeSimWorld('falconer', 62171), snap = serializeSnapshot(w, 1); applySnapshot(client, snap);
      for (const body of [reborn, ...wild]) {
        const peer = client.actors[snap.actors.findIndex(a => a.id === body.id)]; assert(peer);
        assert.equal(peer.look, body.look); assert.equal(peer.radius, body.radius);
        if (body === reborn) assert.equal(cosmeticSummonSkill(peer), 'cast_falcon');
        for (const [world, a] of [[w, body], [client, peer]] as const) {
          const paint = cosmeticBody(a, cosmeticLoadoutFor(world, a), a.isMinion(), false,
            { defId: a.defId, skill: cosmeticSummonSkill(a) });
          assert.equal(paint.look, body === reborn && legacy ? 'vulture' : body.look);
        }
      }
      return metrics;
    } finally { reset(); }
  };
  assert.deepEqual(run(true), run(false));
});

test('Canine visuals: five distinct bodies, retained originals and data-derived retaliation/tame previews', () => {
  const account = makeAccount(), skin = CANINE_LEGACY;
  assert(ownsCosmetic(account.cosmetics, skin.id));
  assert(equipCosmetic(account, 'skillSkin', skin.id));
  assert.deepEqual(cosmeticPreviewSummons('pain_hounds').map(m => m.id), ['pain_hound']);
  assert.deepEqual(cosmeticPreviewSummons('tame_beast').filter(m => skin.paint.summonBodies?.[m.id]).map(m => m.id).sort(), ['gravemaw_hound', 'plains_wolf', 'shepherds_hound']);
  const claim = SKILLS.tame_beast.effects.find(effect => effect.type === 'tame')!;
  const tags = claim.tags;
  try {
    claim.tags = ['future_family', 'beast'];
    assert.equal(cosmeticPreviewSummons('tame_beast').filter(m => skin.paint.summonBodies?.[m.id]).length, 3, 'tame tags are alternatives, as in the real claim gate');
    claim.tags = [];
    assert.equal(cosmeticPreviewSummons('tame_beast').length, 0, 'an empty taxonomy admits no captured bodies');
  } finally { claim.tags = tags; }
  const ids = ['pain_hound', 'plains_wolf', 'fen_hound', 'shepherds_hound', 'gravemaw_hound'];
  assert.equal(new Set(ids.map(id => MONSTERS[id].look)).size, 5);
  for (const id of ids) {
    const def = MONSTERS[id], look = CANINE_LOOKS[def.look!]; assert(look);
    for (const part of [...look.parts, ...look.live ?? []]) assert(PART_PAINTERS[part.kind], part.kind);
    const skill = id === 'pain_hound' ? 'pain_hounds' : 'tame_beast', before = JSON.stringify(def);
    const source = { defId: id, skill };
    assert.deepEqual(cosmeticBody(def, account.cosmetics.loadout, true, false, source),
      id === 'fen_hound' ? def : { ...def, look: 'hound', material: def.material });
    assert.deepEqual(cosmeticBody(def, account.cosmetics.loadout, false, false, source), def);
    assert.equal(JSON.stringify(def), before);
  }
  const other = MONSTERS.warg;
  assert.equal(cosmeticBody(other, account.cosmetics.loadout, true, false, { defId: other.id, skill: 'tame_beast' }), other);
  assert.equal(equipCosmetic(account, 'skillSkin', skin.id, 'cast_falcon'), false);
  assert(equipCosmetic(account, 'skillSkin', null, 'tame_beast'));
  const loaded = deserializeAccount(serializeAccount(account))!;
  assert.equal(cosmeticPick(loaded.cosmetics.loadout, 'skillSkin', 'tame_beast'), undefined);
  assert.equal(cosmeticPick(loaded.cosmetics.loadout, 'skillSkin', 'pain_hounds')?.id, skin.id);
  assert(LOOKS.hound, 'the original composition remains intact');
});

test('Canine visuals: real Pain Hounds cast, retaliation, source attribution and expiry preserve gameplay', () => {
  const run = (legacy: boolean) => {
    const reset = seedGlobalRandom(62919);
    try {
      const w = makeSimWorld('warrior', 62919), p = w.player;
      p.skills.fill(null); const inst = makeSkillInstance(SKILLS.pain_hounds, 1, 1);
      p.skills[0] = inst; w.meta.knownSkills.set(inst.def.id, inst);
      for (const attr of Object.keys(w.meta.baseAttrs) as (keyof typeof w.meta.baseAttrs)[]) w.meta.baseAttrs[attr] = 100;
      w.recalcSeat(w.localSeat);
      p.sheet.setSource('canine-rig', [{ stat: 'mana', kind: 'flat', value: 1000 },
        { stat: 'life', kind: 'flat', value: 10000 }, { stat: 'evasion', kind: 'override', value: 0 },
        { stat: 'blockChance', kind: 'override', value: 0 }]); p.fillResources();
      if (legacy) assert(equipCosmetic(w.account, 'skillSkin', CANINE_LEGACY.id, 'pain_hounds'));
      assert(w.useSkill(p, inst, p.pos));
      for (let i = 0; i < 60; i++) w.update(1 / 60);
      assert.equal(p.charges.get('shard'), 3);
      const enemy = w.createMonster('plains_wolf', 1, 'enemy'); enemy.pos = { x: p.pos.x + 30, y: p.pos.y };
      enemy.tier = p.tier; enemy.skills = []; w.actors.push(enemy);
      enemy.sheet.setSource('canine-rig', [{ stat: 'accuracy', kind: 'override', value: 100000 }]);
      const hit = makeSkillInstance(SKILLS.claw, 1);
      // A direct strike has depth zero; challenge payloads intentionally suppress retaliation.
      for (let i = 0; i < 20 && p.charges.get('shard') === 3; i++) (w as any).resolveHit(enemy, hit, p, 1, 0);
      assert.equal(p.charges.get('shard'), 2);
      const hound = w.actors.find(a => a.owner === p && a.defId === 'pain_hound'); assert(hound);
      assert.equal(hound.lifespan, 8); assert.equal(cosmeticSummonSkill(hound), 'pain_hounds');
      const client = makeSimWorld('warrior', 62919), snap = serializeSnapshot(w, 1); applySnapshot(client, snap);
      const peer = client.actors[snap.actors.findIndex(a => a.id === hound.id)]; assert(peer);
      for (const [world, a] of [[w, hound], [client, peer]] as const) {
        assert.equal(cosmeticSummonSkill(a), 'pain_hounds');
        assert.equal(cosmeticBody(a, cosmeticLoadoutFor(world, a), true, false,
          { defId: a.defId, skill: cosmeticSummonSkill(a) }).look, legacy ? 'hound' : 'hound_painthorn');
      }
      const metrics = { damage: p.maxLife() - p.life, mana: p.mana, charge: p.charges.get('shard'),
        pos: { ...hound.pos }, radius: hound.radius, life: hound.life, skills: hound.skills.map(s => s?.def.id) };
      for (let i = 0; i < 510; i++) w.update(1 / 60);
      assert(hound.dead || !w.actors.includes(hound));
      return { ...metrics, rng: Math.random() };
    } finally { reset(); }
  };
  assert.deepEqual(run(true), run(false));
});

test('Canine visuals: starting and restored bonds keep legacy source identity through downing, revival and peers', () => {
  const w = makeSimWorld('tamer', 62920), p = w.player;
  assert(equipCosmetic(w.account, 'skillSkin', CANINE_LEGACY.id, 'tame_beast'));
  w.grantStartingCompanions();
  let pet = w.actors.find(a => a.companion && a.owner === p)!; assert(pet);
  assert.equal(pet.defId, 'shepherds_hound');
  assert.equal(pet.sourceSkillId, '__companion:tame_beast');
  const paint = () => cosmeticBody(pet, cosmeticLoadoutFor(w, pet), true, false,
    { defId: pet.defId, skill: cosmeticSummonSkill(pet) });
  assert.equal(cosmeticSummonSkill(pet), 'tame_beast'); assert.equal(paint().look, 'hound');
  const saved = w.companionBonds.saved(pet), native = { radius: pet.radius, life: pet.maxLife(), skills: pet.skills.map(s => s?.def.id) };
  w.actors = w.actors.filter(a => a !== pet); w.companionBonds.refresh(); w.restoreCompanions([saved]);
  pet = w.actors.find(a => a.companion && a.owner === p)!; assert(pet);
  assert.equal(paint().look, 'hound');
  w.kill(pet); assert(pet.downed && !pet.dead); assert.equal(paint().look, 'hound');
  w.reviveCompanion(pet); assert(!pet.downed && !pet.dead);
  assert.deepEqual({ radius: pet.radius, life: pet.maxLife(), skills: pet.skills.map(s => s?.def.id) }, native);
  const guest = w.addSeat('canine_guest', classById('tamer'), new NullInput());
  guest.actor.cosmeticLoadout = { slots: {}, skills: {} };
  const guestPet = w.actors.find(a => a.companion && a.owner === guest.actor)!; assert(guestPet);
  const client = makeSimWorld('tamer', 62920), snap = serializeSnapshot(w, 1); applySnapshot(client, snap);
  for (const body of [pet, guestPet]) {
    const peer = client.actors[snap.actors.findIndex(a => a.id === body.id)]; assert(peer);
    assert.equal(cosmeticSummonSkill(peer), 'tame_beast');
    assert.equal(cosmeticBody(peer, cosmeticLoadoutFor(client, peer), true, false,
      { defId: peer.defId, skill: cosmeticSummonSkill(peer) }).look, body === pet ? 'hound' : 'hound_drover');
  }
  assert(equipCosmetic(w.account, 'skillSkin', null, 'tame_beast')); assert.equal(paint().look, 'hound_drover');
  assert.equal(pet.sourceSkillId, '__companion:tame_beast', 'cosmetic resolution never rewrites the gameplay cap marker');
});

test('Glyph placement colors and roles recolor base strokes while preserving authored accents', () => {
  const pal = lookPalette('#654321', 'chitin'), colors: string[] = [];
  const ctx = new Proxy({ fillStyle: '', fill() { colors.push(this.fillStyle); } }, {
    get(target, key) { return key in target ? target[key as keyof typeof target] : () => {}; },
  }) as unknown as CanvasRenderingContext2D;
  const glyph: GlyphDef = { ops: [
    { kind: 'disc', rx: .5 }, { kind: 'disc', rx: .3, role: 'bone' },
    { kind: 'disc', rx: .2, color: '#123456', role: 'glow' },
  ] };
  const draw = (spec: PartSpec) => { colors.length = 0; paintGlyph(ctx, 20, spec, pal, glyph); return [...colors]; };
  const plain = draw({ kind: 'custom_color_check' });
  assert.equal(plain[0], withAlpha(pal.base.base, 1));
  assert.deepEqual(draw({ kind: 'custom_color_check', color: '#e04848', role: 'dark' }),
    [withAlpha('#e04848', 1), plain[1], withAlpha('#123456', 1)]);
  assert.deepEqual(draw({ kind: 'custom_color_check', role: 'dark' }),
    [withAlpha(pal.dark, 1), plain[1], plain[2]]);
  assert.deepEqual(draw({ kind: 'custom_color_check', role: 'metal' }),
    [withAlpha(pal.metal.base, 1), plain[1], plain[2]]);
});

test('Arachnid visuals: five modular bodies, exact free legacy mappings and skin-aware family previews', () => {
  const a = makeAccount(), skin = ARACHNID_LEGACY, ids = Object.keys(skin.paint.summonBodies!);
  assert(ownsCosmetic(a.cosmetics, skin.id)); assert(equipCosmetic(a, 'skillSkin', skin.id));
  assert.equal(new Set(ids.map(id => MONSTERS[id].look)).size, 5);
  for (const id of ids) {
    const body = MONSTERS[id], look = ARACHNID_LOOKS[body.look!], old = skin.paint.summonBodies![id];
    assert(look); assert(LOOKS[old.look]);
    for (const part of [...look.parts, ...look.live ?? []]) assert(PART_PAINTERS[part.kind], part.kind);
    const before = JSON.stringify(body), source = { defId: id, skill: 'tame_beast' };
    assert.deepEqual(cosmeticBody(body, a.cosmetics.loadout, true, false, source), { ...body, ...old, material: body.material });
    assert.equal(cosmeticBody(body, a.cosmetics.loadout, false, false, source), body);
    assert.equal(JSON.stringify(body), before);
  }
  assert.deepEqual(cosmeticPreviewSummons('lay_brood_egg').map(m => m.id), ['spiderling']);
  assert.deepEqual(cosmeticPreviewSummons('tame_beast').filter(m => skin.paint.summonBodies?.[m.id]).map(m => m.id).sort(), ids.sort());
  assert.equal(cosmeticPreviewSummon('tame_beast', 'plains_wolf', skin.id)?.id, 'spiderling');
  assert.equal(cosmeticPreviewSummon('tame_beast', 'orb_weaver', skin.id)?.id, 'orb_weaver');
  assert.equal(cosmeticPreviewSummon('tame_beast', 'orb_weaver', CANINE_LEGACY.id)?.id, 'plains_wolf');
  assert.equal(cosmeticPreviewSummon('tame_beast', 'plains_wolf')?.id, 'plains_wolf', 'explicit unmapped forms remain browsable');
  const d = SKILLS.lay_brood_egg.delivery; assert(d.type === 'construct' && d.hatch);
  const payload = d.hatch.skillId;
  try { d.hatch.skillId = 'lay_brood_egg'; assert.deepEqual(cosmeticPreviewSummons('lay_brood_egg'), []); }
  finally { d.hatch.skillId = payload; }
  assert.equal(equipCosmetic(a, 'skillSkin', skin.id, 'cast_falcon'), false);
  assert(equipCosmetic(a, 'skillSkin', null, 'tame_beast'));
  const loaded = deserializeAccount(serializeAccount(a))!;
  assert.equal(cosmeticPick(loaded.cosmetics.loadout, 'skillSkin', 'tame_beast'), undefined);
  assert.equal(cosmeticPick(loaded.cosmetics.loadout, 'skillSkin', 'lay_brood_egg')?.id, skin.id);
});

test('Arachnid visuals: real egg casts hatch source-aware spiders with identical gameplay and peer appearances', () => {
  const run = (legacy: boolean, broken: boolean) => {
    const reset = seedGlobalRandom(63017);
    try {
      const w = makeSimWorld('warrior', 63017), p = w.player;
      p.skills.fill(null); const inst = makeSkillInstance(SKILLS.lay_brood_egg, 1, 1);
      p.skills[0] = inst; w.meta.knownSkills.set(inst.def.id, inst);
      for (const attr of Object.keys(w.meta.baseAttrs) as (keyof typeof w.meta.baseAttrs)[]) w.meta.baseAttrs[attr] = 100;
      w.recalcSeat(w.localSeat);
      p.sheet.setSource('arachnid-rig', [{ stat: 'mana', kind: 'flat', value: 1000 }]); p.fillResources();
      if (legacy) assert(equipCosmetic(w.account, 'skillSkin', ARACHNID_LEGACY.id, inst.def.id));
      assert(w.useSkill(p, inst, { x: p.pos.x + 50, y: p.pos.y }));
      for (let i = 0; i < 60; i++) w.update(1 / 60);
      const egg = w.actors.find(a => a.owner === p && a.construct?.kind === 'pod' && !a.dead); assert(egg);
      assert.equal(egg.look, 'brood_egg');
      const hatchTicks = Math.ceil(egg.lifespan! * 60) + 2; assert(hatchTicks > 0 && hatchTicks < 1800);
      if (broken) w.kill(egg);
      for (let i = 0; i < hatchTicks; i++) w.update(1 / 60);
      assert(egg.dead || !w.actors.includes(egg));
      const brood = w.actors.filter(a => a.owner === p && a.defId === 'spiderling' && !a.dead);
      assert.equal(brood.length, broken ? 0 : 2);
      const client = makeSimWorld('warrior', 63017), snap = serializeSnapshot(w, 1); applySnapshot(client, snap);
      for (const body of brood) {
        assert.equal(body.summonInst?.def.id, 'egg_hatch_spiders'); assert.equal(body.sourceSkillId, 'egg_hatch_spiders');
        const peer = client.actors[snap.actors.findIndex(a => a.id === body.id)]; assert(peer);
        for (const [world, a] of [[w, body], [client, peer]] as const) {
          assert.equal(cosmeticSummonSkill(a), 'lay_brood_egg');
          assert.equal(cosmeticBody(a, cosmeticLoadoutFor(world, a), true, false,
            { defId: a.defId, skill: cosmeticSummonSkill(a) }).look, legacy ? 'spider_small' : 'spider_skitterling');
        }
      }
      return { mana: p.mana, cooldown: p.cooldowns.get(inst.def.id), brood: brood.map(a => ({ radius: a.radius, pos: a.pos,
        life: a.life, maxLife: a.maxLife(), skills: a.skills.map(s => s?.def.id), lifespan: a.lifespan })), rng: Math.random() };
    } finally { reset(); }
  };
  assert.deepEqual(run(true, false), run(false, false));
  assert.deepEqual(run(true, true), run(false, true));
});

test('Arachnid visuals: all five bonded bodies retain their saved form and resolve independently of wild spiders', () => {
  for (const [id, old] of Object.entries(ARACHNID_LEGACY.paint.summonBodies!)) {
    const w = makeSimWorld('tamer', 63018), p = w.player;
    assert(equipCosmetic(w.account, 'skillSkin', ARACHNID_LEGACY.id, 'tame_beast'));
    let pet = w.createMonster(id, 1, 'enemy'); pet.pos = { ...p.pos }; w.actors.push(pet);
    w.tameCompanion(p, pet, 'tame_beast'); assert(pet.companion && pet.owner === p);
    const saved = w.companionBonds.saved(pet), radius = pet.radius;
    w.actors = w.actors.filter(a => a !== pet); w.companionBonds.refresh(); w.restoreCompanions([saved]);
    pet = w.actors.find(a => a.companion && a.defId === id)!; assert(pet); assert.equal(pet.radius, radius);
    const wild = w.createMonster(id, 1, 'enemy'); wild.pos = { ...p.pos }; w.actors.push(wild);
    const client = makeSimWorld('tamer', 63018), snap = serializeSnapshot(w, 1); applySnapshot(client, snap);
    for (const body of [pet, wild]) {
      const peer = client.actors[snap.actors.findIndex(a => a.id === body.id)]; assert(peer);
      for (const [world, a] of [[w, body], [client, peer]] as const) {
        assert.equal(cosmeticBody(a, cosmeticLoadoutFor(world, a), a.isMinion(), false,
          { defId: a.defId, skill: cosmeticSummonSkill(a) }).look, body === pet ? old.look : MONSTERS[id].look);
      }
    }
    assert(equipCosmetic(w.account, 'skillSkin', null, 'tame_beast'));
    assert.equal(cosmeticBody(pet, cosmeticLoadoutFor(w, pet), true, false,
      { defId: pet.defId, skill: cosmeticSummonSkill(pet) }).look, MONSTERS[id].look);
  }
});

test('Stalker visuals: distinct modular builds, canine part reuse and exact legacy choices for eligible bonds', () => {
  const a = makeAccount(), skin = STALKER_LEGACY;
  assert(ownsCosmetic(a.cosmetics, skin.id)); assert(equipCosmetic(a, 'skillSkin', skin.id));
  const ids = ['gloom_stalker', 'migration_strider', 'veilstalker', 'alpha_stalker'];
  assert.equal(new Set(ids.map(id => MONSTERS[id].look)).size, 4);
  for (const id of ids) {
    const def = MONSTERS[id], before = JSON.stringify(def), look = STALKER_LOOKS[def.look!]; assert(look);
    for (const part of [...look.parts, ...look.live ?? []]) assert(PART_PAINTERS[part.kind], part.kind);
    const source = { defId: id, skill: 'tame_beast' }, old = skin.paint.summonBodies?.[id];
    assert.deepEqual(cosmeticBody(def, a.cosmetics.loadout, true, false, source), old ? { ...def, ...old } : def);
    assert.equal(cosmeticBody(def, a.cosmetics.loadout, false, false, source), def);
    assert.equal(JSON.stringify(def), before);
  }
  assert(STALKER_LOOKS.stalker_packalpha.parts.some(p => p.kind === 'scavengerJaw'));
  assert(STALKER_LOOKS.strider_longstep.parts.some(p => p.kind === 'shaggyRuff'));
  assert.deepEqual(cosmeticPreviewSummons('tame_beast').filter(m => skin.paint.summonBodies?.[m.id]).map(m => m.id), ['migration_strider', 'veilstalker']);
  assert.equal(cosmeticPreviewSummon('tame_beast', 'spiderling', skin.id)?.id, 'migration_strider');
  assert.equal(cosmeticPreviewSummon('tame_beast', 'veilstalker', skin.id)?.id, 'veilstalker');
  assert.equal(equipCosmetic(a, 'skillSkin', skin.id, 'pain_hounds'), false);
  assert(equipCosmetic(a, 'skillSkin', null, 'tame_beast'));
  assert.equal(cosmeticPick(deserializeAccount(serializeAccount(a))!.cosmetics.loadout, 'skillSkin', 'tame_beast'), undefined);
  assert(LOOKS.stalker, 'all former compositions remain available');
});

test('Stalker visuals: actual tame casts, restored bonds, downing/revival and independent peers preserve gameplay', () => {
  const run = (id: string, legacy: boolean) => {
    const reset = seedGlobalRandom(63103);
    try {
      const w = makeSimWorld('tamer', 63103), p = w.player;
      const inst = p.skills.find(s => s?.def.id === 'tame_beast')!; assert(inst);
      for (const attr of Object.keys(w.meta.baseAttrs) as (keyof typeof w.meta.baseAttrs)[]) w.meta.baseAttrs[attr] = 100;
      w.recalcSeat(w.localSeat); p.invulnerable = true;
      p.sheet.setSource('stalker-rig', [{ stat: 'mana', kind: 'flat', value: 1000 }]); p.fillResources();
      if (legacy) assert(equipCosmetic(w.account, 'skillSkin', STALKER_LEGACY.id, 'tame_beast'));
      let pet = w.createMonster(id, 1, 'enemy'); pet.pos = { x: p.pos.x + 55, y: p.pos.y }; pet.tier = p.tier;
      pet.life = pet.maxLife() * .1; w.actors.push(pet);
      assert(w.useSkill(p, inst, pet.pos));
      for (let i = 0; i < 420 && !pet.companion; i++) w.update(1 / 60);
      assert(pet.companion && pet.owner === p, `real claim: ${id}`);
      assert.equal(cosmeticSummonSkill(pet), 'tame_beast');
      const bodyState = () => ({ radius: pet.radius, maxLife: pet.maxLife(), damage: pet.sheet.get('damage'),
        weight: pet.sheet.get('weight'), juvenile: pet.juvenile, spawnScale: pet.spawnScale });
      const saved = w.companionBonds.saved(pet), captured = bodyState();
      w.actors = w.actors.filter(a => a !== pet); w.companionBonds.refresh(); w.restoreCompanions([saved]);
      pet = w.actors.find(a => a.companion && a.defId === id)!; assert(pet); assert.deepEqual(bodyState(), captured);
      w.kill(pet); assert(pet.downed && !pet.dead); w.reviveCompanion(pet); assert(!pet.downed && !pet.dead);
      assert.deepEqual(pet.skills.map(s => s?.def.id), MONSTERS[id].skills);
      const wild = w.createMonster(id, 1, 'enemy'); wild.pos = { ...p.pos }; w.actors.push(wild);
      const guest = w.addSeat('stalker_guest', classById('tamer'), new NullInput(), { startingCompanions: false });
      guest.actor.cosmeticLoadout = { slots: {}, skills: {} };
      const guestPet = w.createMonster(id, 1, 'enemy'); guestPet.pos = { ...guest.actor.pos }; w.actors.push(guestPet);
      w.tameCompanion(guest.actor, guestPet, 'tame_beast');
      const client = makeSimWorld('tamer', 63103), snap = serializeSnapshot(w, 1); applySnapshot(client, snap);
      for (const body of [pet, wild, guestPet]) {
        const peer = client.actors[snap.actors.findIndex(a => a.id === body.id)]; assert(peer);
        for (const [world, a] of [[w, body], [client, peer]] as const) {
          assert.equal(cosmeticBody(a, cosmeticLoadoutFor(world, a), a.isMinion(), false,
            { defId: a.defId, skill: cosmeticSummonSkill(a) }).look, body === pet && legacy ? 'stalker' : MONSTERS[id].look);
        }
      }
      const metrics = { mana: p.mana, cooldown: p.cooldowns.get(inst.def.id), radius: pet.radius,
        life: pet.life, maxLife: pet.maxLife(), skills: pet.skills.map(s => s?.def.id), rng: Math.random() };
      assert(equipCosmetic(w.account, 'skillSkin', null, 'tame_beast'));
      assert.equal(cosmeticBody(pet, cosmeticLoadoutFor(w, pet), true, false,
        { defId: pet.defId, skill: cosmeticSummonSkill(pet) }).look, MONSTERS[id].look);
      return metrics;
    } finally { reset(); }
  };
  for (const id of ['migration_strider', 'veilstalker']) assert.deepEqual(run(id, true), run(id, false));
});

test('Stalker visuals: captured spawnScale survives rarity and owner size, and older saves still restore', () => {
  for (const scale of [.84, 1.3]) for (const rare of [false, true]) {
    const w = makeSimWorld('tamer', 63104), p = w.player;
    p.sheet.setSource('stalker-size-rig', [{ stat: 'minionSize', kind: 'increased', value: .4 }]);
    let pet = w.createMonster('migration_strider', 1, 'enemy', undefined, { scale });
    if (rare) { pet.rarity = 'rare'; pet.radius *= 1.4; pet.sheet.setSource('rarity', [{ stat: 'life', kind: 'more', value: .5 }]); }
    w.actors.push(pet); w.tameCompanion(p, pet, 'tame_beast');
    const state = () => ({ radius: pet.radius, life: pet.maxLife(), weight: pet.sheet.get('weight'),
      damage: pet.sheet.get('damage'), juvenile: pet.juvenile, rarity: pet.rarity, scale: pet.spawnScale });
    const before = state(); assert.equal(pet.juvenile, scale <= .95);
    for (let cycle = 0; cycle < 3; cycle++) {
      const saved = JSON.parse(JSON.stringify(w.companionBonds.saved(pet)));
      assert.equal(saved.spawnScale, scale);
      assert(Math.abs(saved.radius * 1.4 - pet.radius) < 1e-8, 'owner size is applied once');
      w.actors = w.actors.filter(a => a !== pet); w.companionBonds.refresh(); w.restoreCompanions([saved]);
      pet = w.actors.find(a => a.companion)!; assert.deepEqual(state(), before);
    }
  }
  const w = makeSimWorld('tamer', 63105);
  w.restoreCompanions([{ defId: 'migration_strider', level: 1, skillId: 'tame_beast' }]);
  const old = w.actors.find(a => a.companion)!; assert(old && Number.isFinite(old.radius));
  assert(old.spawnScale! >= .82 && old.spawnScale! <= 1.34, 'old saves roll missing variance once, then retain it');
  for (const scale of [0, -1, NaN, Infinity]) {
    const fallback = w.createMonster('migration_strider', 1, 'enemy', undefined, { scale });
    assert(Number.isFinite(fallback.radius) && fallback.spawnScale! >= .82 && fallback.spawnScale! <= 1.34);
  }
});

console.log(`COSMETICS: ${checks} checks passed`);
