// node balance/debuff-coverage.cjs --vitals. Captures the same HUD players use.
exports.entry = [
  "import { drawVitalOrb, drawGuardDial, guardLayout, guardAt } from './render/vis/vitalHud';",
  "import { VITAL_DIAL, VITAL_MOTION } from './render/vis/vitalMaterials';",
  "import { visCacheStats } from './render/vis/caches';",
  "import { NullInput } from './net/intent';",
  "window.vitalInspection = { drawVitalOrb, drawGuardDial, guardLayout, guardAt, VITAL_DIAL, VITAL_MOTION, visCacheStats, NullInput };",
].join('\n');
exports.inspect = function inspectVitalHud() {
  window.requestAnimationFrame = () => 0;
  __game.account().ledger.prologue_lived = 1;
  __game.devStartRun('magician'); __game.ui.hideAll(); __game.step(90); __game.hold(true);
  const w = __game.world(), hero = w.localSeat.actor, renderer = __game.renderer;
  const settings = __game.settings(); settings.poolBars = 'always'; settings.uiScale = 1;
  const sheet = document.createElement('canvas'); sheet.width = 864; sheet.height = 365;
  const ink = sheet.getContext('2d'); ink.fillStyle = '#10191d'; ink.fillRect(0, 0, sheet.width, sheet.height);
  const screen = document.createElement('canvas'); screen.width = innerWidth; screen.height = innerHeight;
  const c = screen.getContext('2d');
  const failures = [];
  function paint() {
    renderer.render(w);
    c.drawImage(renderer.canvas, 0, 0, screen.width, screen.height);
    if (renderer.overlay.style.display !== 'none') c.drawImage(renderer.overlay, 0, 0, screen.width, screen.height);
    const rects = renderer.hudOrbRects.filter(r => r.seatId === w.localSeat.id);
    if (rects.length !== 2) throw Error('Missing local resource hover targets');
    return rects;
  }
  const panels = [
    ['Energy shield only', 420, 180, 0, 0],
    ['Energy shield and Insight', 74, 42, 0, 12],
    ['Five defenses', 190, 100, 132, 40],
  ];
  panels.forEach(([label, life, mana, poise, insight], index) => {
    hero.sheet.setSource('vital-hud-inspection', Object.entries({
      life: 420, mana: 180, energyShield: 80, poise: index === 2 ? 100 : 0,
      insight: index > 0 ? 60 : 0, endurance: index === 2 ? 30 : 0,
    }).map(([stat, value]) => ({ stat, kind: 'override', value })));
    hero.fillResources();
    hero.life = life; hero.mana = mana; hero.poise = poise; hero.insight = insight;
    hero.poiseBroken = false; hero.esRecharging = false;
    hero.es = index === 0 ? 80 : 44; hero.ward = index === 2 ? 78 : 0;
    hero.absorb = index === 2 ? 35 : 0; hero.reservedMana = index === 2 ? 60 : 0;
    hero.lifeSealAt = index === 2 ? 305 : undefined; hero.endurance = index === 2 ? 30 : 0;
    const rects = paint();
    const expected = [['es'], ['es','insight'], ['es','absorb','insight','poise','endurance']][index];
    if (rects[0].sectors.map(s => s.id).join() !== expected.join()) failures.push(label+' active sectors');
    if (index === 2) {
      const from = rects[0].x - 28, to = rects[1].x + rects[1].w + 28;
      const width = to - from, top = rects[0].y - 40;
      ink.drawImage(screen, from, top, width, 158, (sheet.width - width) / 2, 4, width, 158);
    }
    ink.fillStyle = '#26323a'; ink.fillRect(index * 288 + 8, 171, 272, 1);
    ink.fillStyle = '#e8e4d9'; ink.font = '16px Georgia'; ink.textAlign = 'center';
    ink.fillText(label, index * 288 + 144, 197);
    rects.forEach((r, j) => {
      const span = r.w + 50, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      ink.drawImage(screen, cx - span / 2, cy - span / 2 - 4, span, span + 8, index * 288 + 8 + j * 136, 209, 135, 143);
    });
    if (hero.life !== life || hero.mana !== mana || hero.poise !== poise) failures.push('HUD changed resources');
  });
  const qa = window.vitalInspection;
  let checks = 0;
  function check(test, name) { checks++; if (!test) failures.push(name); }
  // Sample inside the glass, clear of the engraved labels and the surface line.
  const tile = document.createElement('canvas'); tile.width = tile.height = 140;
  const tc = tile.getContext('2d', { willReadFrequently: true });
  const pixels = () => tc.getImageData(0, 0, 140, 140).data;
  function sample(id, value, max = 100, reserved = 0, motion = 'still', time) {
    tc.clearRect(0, 0, 140, 140);
    qa.drawVitalOrb(tc, id, 70, 70, 46, value, max, reserved, time, 0, undefined, motion);
    return pixels();
  }
  function difference(a, b, x, y) {
    const start = (y * 140 + x) * 4;
    return [0, 1, 2].reduce((sum, ch) => sum + Math.abs(a[start + ch] - b[start + ch]), 0);
  }
  for (const id of ['life', 'mana']) {
    const empty = sample(id, 0), half = sample(id, 50), full = sample(id, 100), locked = sample(id, 50, 100, 30);
    check(difference(half, empty, 96, 54) === 0 && difference(half, full, 96, 85) === 0 &&
      difference(half, full, 96, 54) > 35, id + ' half-full surface');
    check(difference(locked, half, 88, 43) > 20 && difference(locked, half, 96, 85) === 0, id + ' reservation band');
    check(sample(id, 0, 0).every((v, i) => v === empty[i]), id + ' zero capacity');
  }
  for (const id of ['life', 'mana']) {
    for (const [value, reserved] of [[0, 0], [8, 0], [50, 0], [75, 25], [100, 0], [100, 60]]) {
      const still = sample(id, value, 100, reserved);
      const glassRadius = 46 * qa.VITAL_DIAL.glassRatio;
      const surface = 70 + glassRadius * (1 - 2 * Math.min(value, 100 - reserved) / 100);
      for (const motion of Object.keys(qa.VITAL_MOTION)) {
        const early = sample(id, value, 100, reserved, motion, .8);
        const late = sample(id, value, 100, reserved, motion, 4.2);
        const quiet = sample(id, value, 100, reserved, motion, undefined);
        const limit = Math.floor(surface + 2) * 140 * 4;
        check(early.subarray(0, limit).every((v, i) => v === still[i]) &&
          late.subarray(0, limit).every((v, i) => v === still[i]), id + ' steady fill and reservation ' + value + ' ' + motion);
        check(quiet.every((v, i) => v === still[i]), id + ' reduced motion ' + motion);
        if (value === 0 || motion === 'still') check(late.every((v, i) => v === early[i]), id + ' still or empty');
        else if (value >= 50) check(late.some((v, i) => v !== early[i]), id + ' moving liquid ' + value + ' ' + motion);
      }
    }
  }
  for (const id of ['life', 'mana']) {
    const paint = (mix, time = 2.5) => sample(id, 65, 100, 0, mix, time);
    const same = (a, b) => a.every((v, i) => v === b[i]);
    const layers = Object.keys(qa.VITAL_MOTION).filter(key => key !== 'still');
    const all = Object.fromEntries(layers.map(key => [key, .75]));
    const combined = paint(all);
    check(same(paint({}), paint('still')), id + ' empty recipe');
    check(same(combined, paint(Object.fromEntries(Object.entries(all).reverse()))), id + ' stable composition order');
    for (const layer of layers) {
      check(same(paint(layer), paint({ [layer]: 1 })), id + ' single layer equivalence ' + layer);
      check(!same(combined, paint({ ...all, [layer]: 0 })), id + ' layer contributes to mix ' + layer);
      check(!same(paint({ [layer]: .35 }), paint(layer)), id + ' adjustable strength ' + layer);
    }
    check(same(sample(id, 65, 100, 0, all, undefined), paint('still')), id + ' quiet mixed liquid');
  }
  function guard(key, fraction, state = 'ready', emphasis = 1) {
    tc.clearRect(0, 0, 140, 140);
    const [sector] = qa.guardLayout({ [key]: fraction });
    qa.drawGuardDial(tc, sector, 70, 70, 46, fraction, state, emphasis);
    return pixels();
  }
  const changed = (a, b) => a.some((v, i) => v !== b[i]);
  for (const key of Object.keys(qa.VITAL_DIAL.sectors)) {
    const empty = guard(key, 0), half = guard(key, .5), full = guard(key, 1);
    check(changed(empty, half) && changed(half, full), key + ' shows empty, partial and full states');
  }
  check(changed(guard('poise', 0, 'broken'), guard('poise', 0)), 'broken guard is visible at zero');
  check(changed(guard('poise', 1.4), guard('poise', 1)), 'overcharge rail');
  check(changed(guard('es', 0, 'recharging'), guard('es', 0)), 'recharge is visible at zero');
  check(changed(guard('insight', .7, 'ready', 0), guard('insight', .7, 'ready', 1)), 'momentum lights insight');
  for (let i = 0; i < 90; i++) qa.drawVitalOrb(tc, i % 2 ? 'life' : 'mana', 70, 70, 36, i, 100, i % 8, i / 60);
  const cache = qa.visCacheStats().find(s => s.id === 'vitalHud');
  check(cache?.n === 2 && cache.mb < 1.2, 'artwork cache bounded across fill, size and time');
  const ids = Object.keys(qa.VITAL_DIAL.sectors), radians = Math.PI / 180;
  const close = (a, b) => Math.abs(a - b) < 1e-8;
  for (let mask = 0; mask < 2 ** ids.length; mask++) {
    const selected = ids.filter((_, i) => mask & (1 << i));
    const sectors = qa.guardLayout(Object.fromEntries(selected.map(id => [id, 0])));
    check(sectors.map(s => s.id).join() === selected.join(), 'order and visibility ' + mask);
    if (sectors.length) {
      check(close(sectors[0].from, -209 * radians) && close(sectors.at(-1).to, 38 * radians), 'open endpoints ' + mask);
    }
    for (const radius of [36, 46]) {
      const r = radius + qa.VITAL_DIAL.guardRadius;
      const hit = angle => qa.guardAt(sectors, r * Math.cos(angle), r * Math.sin(angle), radius);
      check(hit(Math.PI / 2) === undefined, 'open bottom ' + mask);
      for (const [i, sector] of sectors.entries()) {
        check(hit((sector.from + sector.to) / 2) === sector.id &&
          qa.guardAt(sectors, r * sector.capX, r * sector.capY, radius) === sector.id, 'track and emblem ' + sector.id + ' ' + mask);
        if (i > 0) {
          const previousEnd = sectors[i - 1].to;
          check(close(sector.from - previousEnd, 13 * radians), 'separator ' + mask);
          check(hit(previousEnd + 0.1 * radians) === undefined, 'clear separator ' + mask);
        }
      }
    }
  }
  const guest = w.addSeat('hud-inspection', w.localSeat.meta.classDef, new qa.NullInput());
  guest.couch = { pad: 1, side: 'right' };
  for (const scale of [.75, 1, 1.5, 2]) {
    settings.uiScale = scale; paint();
    for (const orb of renderer.hudOrbRects) {
      const cx = orb.x + orb.w / 2, cy = orb.y + orb.h / 2;
      const radius = orb.w / 2 + qa.VITAL_DIAL.guardRadius * renderer.uiToCss;
      for (const sector of orb.sectors ?? []) {
        const angle = (sector.from + sector.to) / 2;
        check(renderer.hudResourceAt(orb.seatId, cx + radius * Math.cos(angle), cy + radius * Math.sin(angle))?.guard === sector.id,
          'scaled hover ' + sector.id + ' ' + orb.seatId + ' ' + scale);
      }
      const otherSeat = orb.seatId === w.localSeat.id ? guest.id : w.localSeat.id;
      check(renderer.hudResourceAt(otherSeat, cx, cy) === null, 'separate seat ' + scale);
      const right = orb.x + orb.w, bottom = orb.y + orb.h;
      check(orb.x >= 0 && right <= innerWidth && orb.y >= 0 && bottom <= innerHeight, 'visible ' + orb.seatId + ' ' + scale);
      check(!renderer.hudSlotRects.some(s => s.x < right && s.x + s.w > orb.x && s.y < bottom && s.y + s.h > orb.y), 'clear slots ' + orb.seatId + ' ' + scale);
    }
  }
  settings.poolBars = 'recent';
  renderer.poolArcShown('poise', hero, w); renderer.poolArcShown('poise', guest.actor, w);
  w.time += 30; hero.poise -= 5;
  check(renderer.poolArcShown('poise', hero, w) && !renderer.poolArcShown('poise', guest.actor, w), 'independent recent damage per seat');
  return { count: checks + panels.length, samples: sheet.toDataURL(), failures, fatal: __game.crash().fatal };
};
