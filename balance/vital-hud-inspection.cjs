// node balance/debuff-coverage.cjs --vitals. Captures the same HUD players use.
exports.entry = [
  "import { drawVitalOrb, drawGuardDial } from './render/vis/vitalHud';",
  "import { VITAL_DIAL } from './render/vis/vitalMaterials';",
  "import { visCacheStats } from './render/vis/caches';",
  "import { NullInput } from './net/intent';",
  "window.vitalInspection = { drawVitalOrb, drawGuardDial, VITAL_DIAL, visCacheStats, NullInput };",
].join('\n');
exports.inspect = function inspectVitalHud() {
  window.requestAnimationFrame = () => 0;
  __game.account().ledger.prologue_lived = 1;
  __game.devStartRun('magician'); __game.ui.hideAll(); __game.step(90); __game.hold(true);
  const w = __game.world(), hero = w.localSeat.actor, renderer = __game.renderer;
  const settings = __game.settings(); settings.poolBars = 'always'; settings.uiScale = 1;
  hero.sheet.setSource('vital-hud-inspection', Object.entries({
    life: 420, mana: 180, energyShield: 80, poise: 100, insight: 60, endurance: 30,
  }).map(([stat, value]) => ({ stat, kind: 'override', value })));
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
    ['Full reserves', 420, 180, 100, 60],
    ['Guard broken', 74, 42, 0, 12],
    ['Ward and reservation', 190, 100, 132, 40],
  ];
  panels.forEach(([label, life, mana, poise, insight], index) => {
    hero.fillResources();
    hero.life = life; hero.mana = mana; hero.poise = poise; hero.insight = insight;
    hero.poiseBroken = index === 1; hero.esRecharging = index === 1;
    hero.es = index === 1 ? 0 : 44; hero.ward = index === 2 ? 78 : 0;
    hero.absorb = index === 2 ? 35 : 0; hero.reservedMana = index === 2 ? 60 : 0;
    hero.lifeSealAt = index === 2 ? 305 : undefined; hero.endurance = index === 1 ? 8 : 30;
    const rects = paint();
    if (index === 0) {
      const from = rects[0].x - 28, to = rects[1].x + rects[1].w + 28;
      const width = to - from, top = rects[0].y - 40;
      ink.drawImage(screen, from, top, width, 158, (sheet.width - width) / 2, 4, width, 158);
    }
    ink.fillStyle = '#26323a'; ink.fillRect(index * 288 + 8, 171, 272, 1);
    ink.fillStyle = '#e8e4d9'; ink.font = '16px Georgia'; ink.textAlign = 'center';
    ink.fillText(label, index * 288 + 144, 197);
    rects.forEach((r, j) => {
      const span = r.w + 42, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
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
  function sample(id, value, max = 100, reserved = 0) {
    tc.clearRect(0, 0, 140, 140);
    qa.drawVitalOrb(tc, id, 70, 70, 46, value, max, reserved, 0);
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
  function guard(key, fraction, state = 'ready', emphasis = 1) {
    tc.clearRect(0, 0, 140, 140);
    qa.drawGuardDial(tc, key, 70, 70, 46, fraction, state, emphasis);
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
  const guest = w.addSeat('hud-inspection', w.localSeat.meta.classDef, new qa.NullInput());
  guest.couch = { pad: 1, side: 'right' };
  for (const scale of [.75, 1, 1.5, 2]) {
    settings.uiScale = scale; paint();
    for (const orb of renderer.hudOrbRects) {
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
