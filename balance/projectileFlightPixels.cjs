// Runs inside the built game. Launch each registered projectile and compare the same
// pixels a player sees, once at native size and twice with tint and radius held equal.
module.exports = function projectileFlightPixels(ids) {
  const w = __game.world(), hero = w.player, renderer = __game.renderer;
  const tile = document.createElement('canvas'); tile.width = 116; tile.height = 80;
  const ctx = tile.getContext('2d', { willReadFrequently: true });
  const samples = [], pairs = [], blastPrints = new Map();
  const picks = ['ice_spear','skeletal_greater_ice_spear','skeletal_ice_shard',
    'frozen_orb','ball_lightning','maelstrom_orb','vine_lash','constrictor_coil','flame_spear',
    'inferno','fire_siege','frost_pulse','fireball','rubble_conduit','marrowhooks'];
  const sheet = document.createElement('canvas'); sheet.width = 600; sheet.height = 5 * 102;
  const page = sheet.getContext('2d'); page.fillStyle = '#151c20'; page.fillRect(0,0,sheet.width,sheet.height);
  function draw(pos, scale, paint) {
    ctx.clearRect(0, 0, tile.width, tile.height);
    ctx.save(); ctx.translate(69,40); ctx.scale(scale,scale); ctx.translate(-pos.x,-pos.y);
    const original = renderer.ctx;
    try { renderer.ctx = ctx; paint(); } finally { renderer.ctx = original; ctx.restore(); }
    const data = ctx.getImageData(0,0,tile.width,tile.height).data;
    const ink = new Uint8Array(data.length / 4);
    for (let i = 0; i < ink.length; i++) ink[i] = (data[i*4]*.3 + data[i*4+1]*.59 + data[i*4+2]*.11) * data[i*4+3] / 255;
    return ink;
  }
  function copy(id, name) {
    const index = picks.indexOf(id);
    if (index < 0) return;
    const x = index % 3 * 200, y = Math.floor(index / 3) * 102;
    page.fillStyle = '#253037'; page.fillRect(x+1,y+1,198,100);
    page.drawImage(tile, x+38,y+1);
    page.fillStyle = '#e7e3da'; page.font = '15px system-ui'; page.fillText(name,x+12,y+91);
  }
  function compare(a, b) {
    let diff = 0, mass = 0;
    for (let i=0; i<a.length; i++) { diff += Math.abs(a[i]-b[i]); mass += Math.max(a[i],b[i]); }
    return diff / Math.max(1,mass);
  }
  w.actors = [hero]; w.doodads = []; w.markDoodadsChanged();
  for (const id of ids) {
    if (__game.devGrantSkill(id,1,2) !== 2) throw Error('Could not equip '+id);
    w.flashes = []; w.projectiles = []; w.zones = [];
    w.spawnProjectile(hero,hero.skills[2],{...hero.pos},0);
    const p = w.projectiles[0], def = p.inst.def;
    p.age = .14;
    const paint = () => renderer.drawProjectiles(w);
    if (!draw(p.pos,1,paint).some(v=>v>20)) throw Error(id+' invisible at native size');
    if (!def.delivery.explode) {
      const heightLimit = p.shape === 'wave' || p.shape === 'bar' ? 17 : 24;
      draw(p.pos,Math.min(2.2, heightLimit/p.radius),paint); copy(id,def.name);
    }
    const nativeRadius = p.radius, nativeTint = p.color;
    p.color = '#bfd9ec'; p.radius = 9;
    const a = draw(p.pos,1,paint); p.age = .43; const b = draw(p.pos,1,paint);
    for (const prev of samples) {
      const distance = (compare(a,prev.a)+compare(b,prev.b))/2;
      if (distance < .15) pairs.push({ ids: [prev.id,id], distance: +distance.toFixed(3) });
    }
    samples.push({id,a,b});
    if (def.delivery.explode) {
      p.radius = nativeRadius; p.range = 0; p.color = nativeTint; w.updateProjectiles(1/60);
      const blast = w.flashes.find(f => f.radius > nativeRadius && !f.projectileEnd);
      if (!blast) throw Error(id+' missing native splash');
      const sample = remaining => renderer.drawFlash({...blast,life:blast.maxLife*remaining});
      draw(blast.pos,35/blast.radius,() => sample(.62)); copy(id,def.name);
      blast.color = '#bfd9ec'; blast.pos = {...hero.pos}; blast.facing = 0; blast.radius = 37;
      const early = draw(blast.pos,1,() => sample(.8)), late = draw(blast.pos,1,() => sample(.38));
      for (const [other,ink] of blastPrints) {
        const distance = (compare(early,ink.early) + compare(late,ink.late)) / 2;
        if (distance < .15) pairs.push({ids:[other,id],distance:+distance.toFixed(3),phase:'splash'});
      }
      blastPrints.set(id,{early,late});
    }
  }
  // Three full world frames with the normal actor, terrain, flight and flash layers.
  const scenes = document.createElement('canvas'); scenes.width = 900; scenes.height = 208;
  const scene = scenes.getContext('2d'), canvas = document.getElementById('game');
  scene.fillStyle = '#202a30'; scene.fillRect(0,0,900,208);
  w.zoneMap.qa_flight_read = { ...w.zoneMap.crossroads, id:'qa_flight_read', seed: 78211,
    size:{w:1800,h:1400}, layout:[], exits:[], objective:{kind:'safe'} };
  w.loadZone('qa_flight_read'); hero.pos = {x:900,y:700};
  w.doodads = []; w.markDoodadsChanged();
  const at = {x: hero.pos.x + 82, y: hero.pos.y};
  renderer.worldOnly = true; renderer.directorFocus = at;
  for (const [index,id] of ['ice_spear','ball_lightning','soulflay'].entries()) {
    w.actors = [hero]; w.projectiles = []; w.flashes = []; w.zones = []; w.texts = [];
    const single = id === 'ice_spear';
    for (const dy of single ? [0] : [-31,37]) {
      const foe = w.createMonster('zombie',1,'enemy');
      foe.tier = hero.tier; foe.pos = {x: at.x + (single ? 0 : 21), y: at.y + dy};
      foe.brain = undefined; foe.spawnedAt = -100; w.actors.push(foe);
    }
    __game.devGrantSkill(id,1,2);
    w.spawnProjectile(hero,hero.skills[2],{x:at.x-45,y:at.y},0);
    const p = w.projectiles[0];
    if (p.inst.def.delivery.zap) p.zapTimer = .22;
    for (let i=0; i<(single ? 9 : 15); i++) {
      const dt = 1/60; w.time += dt;
      for (const f of w.flashes) f.life -= dt;
      w.flashes = w.flashes.filter(f=>f.life>0); w.updateProjectiles(dt);
    }
    if (single && !w.projectiles.some(p=>p.inst.def.id==='glacial_shard')) throw Error('Missing child shards in scene');
    if (id==='ball_lightning' && !w.flashes.some(f=>f.lightning?.discharge)) throw Error('Missing discharge in scene');
    if (id==='soulflay' && !(p.auraRadius>p.radius)) throw Error('Missing moving field in scene');
    w.texts = []; renderer.render(w);
    const focus = renderer.toScreen(at);
    scene.drawImage(canvas,focus.x-145,focus.y-88,290,176,index*300+5,2,290,176);
    scene.fillStyle = '#e4e1d8'; scene.font = '15px system-ui';
    scene.fillText(['Ice Spear · shatter','Ball Lightning · discharge','Soulflay · moving field'][index],index*300+10,198);
  }
  return { count: ids.length, blasts: blastPrints.size, pairs: pairs.sort((a,b)=>a.distance-b.distance),
    preview: sheet.toDataURL(), encounter: scenes.toDataURL() };
};
