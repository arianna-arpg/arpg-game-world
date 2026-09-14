// Real renderer + Wardrobe checks using disposable saves and a hidden Electron window.
const { app, BrowserWindow } = require('electron');
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
app.disableHardwareAcceleration(); // stable captures in the hidden offscreen QA window
const dir = path.join(__dirname, 'reports');
app.setPath('userData', path.join(dir, `cosmetics-profile-${process.pid}`));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, `cosmetics-saves-${process.pid}`) });
  const win = new BrowserWindow({ show: false, width: 1280, height: 960, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', details => { if (details.level === 'error') errors.push(details.message); });
  const js = source => win.webContents.executeJavaScript(source);
  const click = selector => js(`document.querySelector(${JSON.stringify(selector)}).click(); void 0`);
  const shot = async name => fs.writeFileSync(path.join(dir, name), (await win.webContents.capturePage()).toPNG());
  try {
    await win.loadURL(server.url); await wait(1200);
    await js('__game.ui.showAccountScreen(); void 0');
    await click('#acct-wardrobe'); await wait(200);
    assert(await js("!!document.querySelector('.wardrobe canvas')"), 'Vault opens Wardrobe');
    assert.equal(await js("document.querySelectorAll('[data-wd-slot]').length"), 8);
    await click('[data-wd-id="moon_glass"]');
    assert.equal(await js('__game.account().cosmetics.loadout.slots.playerSkin'), undefined, 'preview does not equip');
    await click('[data-wd-equip]');
    assert.equal(await js('__game.account().cosmetics.loadout.slots.playerSkin'), 'moon_glass');
    for (const [slot, id] of [['playerEffect', 'waking_stars'], ['footprints', 'petal_steps'], ['avatar', 'star_sigil'], ['skillSkin', 'starlit_skills'], ['skillRecolor', 'rose_tint'], ['summonSkin', 'verdant_kin']]) {
      await click(`[data-wd-slot="${slot}"]`); await click(`[data-wd-id="${id}"]`); await click('[data-wd-equip]');
    }
    await click('[data-wd-slot="playerSkin"]'); await wait(150); await shot('cosmetics-wardrobe.png');
    const overflow = await js(`(() => { const w=document.querySelector('.wardrobe'); return {width:w.scrollWidth,client:w.clientWidth}; })()`);
    assert(overflow.width <= overflow.client + 1, 'Wardrobe has no horizontal overflow');
    await click('[data-wd-slot="footprints"]'); await click('[data-wd-id="star_steps"]');
    assert(await js("document.querySelector('[data-wd-buy]').disabled"), 'insufficient funds disables purchase');
    // Buying in the Reckoning keeps its original seal/back closure intact.
    await click('[data-wd-back]');
    await js('__game.account().credits=35; __game.ui.showAccountScreen(); void 0');
    await click('#acct-wardrobe'); await click('[data-wd-slot="footprints"]'); await click('[data-wd-id="star_steps"]');
    await click('[data-wd-buy]'); assert.equal(await js('__game.account().credits'), 0);
    await click('[data-wd-equip]'); await click('[data-wd-back]');
    assert(await js("document.querySelector('#acct-close').textContent.includes('Seal')"), 'Reckoning remains a seal visit after Wardrobe');
    await wait(200); await win.reload(); await wait(1200);
    assert.equal(await js('__game.account().cosmetics.loadout.slots.footprints'), 'star_steps', 'equipped purchase survives disk reload');
    assert.equal(await js('__game.account().cosmetics.loadout.slots.playerSkin'), 'moon_glass');
    await js("__game.account().ledger.prologue_lived=1; __game.ui.hideAll(); __game.devStartRun('warrior'); __game.ui.showWardrobe(); void 0"); await wait(150);
    assert(await js("__game.ui.escapeMenuOpen && !!document.querySelector('#escape-menu .wardrobe')"), 'pause surface opens Wardrobe');
    await click('[data-wd-slot="skillRecolor"]');
    const scoped = await js(`(() => { const s=document.querySelector('[data-wd-skill]'); if(s.options.length<2)return false; s.selectedIndex=1; s.dispatchEvent(new Event('change')); return true; })()`);
    assert(scoped, 'current skills are available for individual overrides');
    await click('[data-wd-id="moon_tint"]'); await click('[data-wd-equip]');
    assert(await js("Object.keys(__game.account().cosmetics.loadout.skills).length > 0"), 'individual skill choice saved');
    await click('[data-wd-inherit]'); assert.equal(await js('Object.keys(__game.account().cosmetics.loadout.skills).length'), 0);
    const scopedSkill = await js("document.querySelector('[data-wd-skill]').value");
    await click('[data-wd-id="prismatic_ink"]');
    await js("document.querySelector('[data-wd-color]').value='#39d6a2'; document.querySelector('[data-wd-color]').dispatchEvent(new Event('input')); void 0");
    assert.equal(await js('__game.account().cosmetics.applications?.length || 0'), 0, 'picker preview spends nothing');
    await click('[data-wd-bind]');
    assert.equal(await js('__game.account().cosmetics.applications.length'), 1);
    assert.equal(await js(`__game.account().cosmetics.loadout.customColors[${JSON.stringify(scopedSkill)}]`), '#39d6a2');
    await js("document.querySelector('[data-wd-hex]').value='#zzzzzz'; document.querySelector('[data-wd-hex]').dispatchEvent(new Event('input')); void 0");
    assert(await js("document.querySelector('[data-wd-equip]').disabled"), 'invalid hex cannot save');
    await js("document.querySelector('[data-wd-hex]').value='#F486CA'; document.querySelector('[data-wd-hex]').dispatchEvent(new Event('input')); void 0");
    await click('[data-wd-equip]');
    assert.equal(await js('__game.account().cosmetics.applications.length'), 1, 'color changes spend no additional ink');
    assert.equal(await js(`__game.account().cosmetics.loadout.customColors[${JSON.stringify(scopedSkill)}]`), '#f486ca');
    await wait(150); await shot('cosmetics-color-picker.png');
    await click('[data-wd-slot="playerSkin"]'); await click('[data-wd-id=""]'); await click('[data-wd-equip]');
    await click('[data-wd-slot="playerModel"]'); await click('[data-wd-id="model_necromancer"]'); await click('[data-wd-equip]');
    assert.equal(await js('__game.world().player.look'), 'class_warrior', 'cosmetic does not replace class body data');
    assert.equal(await js('__game.account().cosmetics.loadout.slots.playerModel'), 'model_necromancer');
    await js("document.querySelector('[data-wd-search]').value='Wanderers of the Wake'; document.querySelector('[data-wd-search]').dispatchEvent(new Event('input')); void 0");
    assert.equal(await js("document.querySelectorAll('[data-wd-model]').length"), 4, 'four exclusive model portraits');
    await click('[data-wd-id="model_veilweaver"]'); await click('[data-wd-equip]');
    await wait(200); await shot('cosmetics-models.png');
    // Export the original preview canvases as a contact sheet, with no image processing.
    const modelPortraits = await js("[...document.querySelectorAll('[data-wd-model]')].map(c=>({id:c.dataset.wdModel,png:c.toDataURL('image/png').split(',')[1]}))");
    for (const portrait of modelPortraits) fs.writeFileSync(path.join(dir, `cosmetics-${portrait.id}.png`), Buffer.from(portrait.png, 'base64'));
    await js('__game.ui.hideEscapeMenu(); __game.step(60); void 0');
    // Read the game's actual Canvas pixels: offscreen compositor captures can lag
    // a just-hidden DOM menu, even after the game has rendered its next frame.
    const worldPng = await js("document.querySelector('#game').toDataURL('image/png').split(',')[1]");
    fs.writeFileSync(path.join(dir, 'cosmetics-world.png'), Buffer.from(worldPng, 'base64'));
    assert.equal(await js('__game.ui.escapeMenuOpen'), false, 'close releases blocking state');
    assert.equal(await js("[...document.querySelectorAll('.wardrobe')].filter(e=>e.offsetParent!==null).length"), 0, 'no Wardrobe remains over the game after close');
    assert.equal(await js('!!__game.crash().fatal'), false, 'real world frames do not trip crash handling');
    await js('__game.ui.showWardrobe(); void 0');
    win.setSize(760, 900); await wait(200); await shot('cosmetics-compact.png');
    assert(await js("document.querySelector('.wardrobe').scrollWidth <= document.querySelector('.wardrobe').clientWidth + 1"), 'compact Wardrobe fits');
    await click('[data-wd-slot="skillRecolor"]'); await click('[data-wd-id="prismatic_ink"]');
    assert(await js("document.querySelector('[data-wd-bind]').disabled"), 'ink requires an individual skill');
    await wait(200); await win.reload(); await wait(1200);
    assert.equal(await js('__game.account().cosmetics.loadout.slots.playerModel'), 'model_veilweaver', 'model survives disk reload');
    assert.equal(await js('__game.account().cosmetics.applications.length'), 1, 'spent unit survives disk reload');
    assert.equal(await js(`__game.account().cosmetics.loadout.customColors[${JSON.stringify(scopedSkill)}]`), '#f486ca', 'custom color survives disk reload');
    assert.deepEqual(errors, [], 'no renderer exceptions');
    console.log('COSMETICS UI OK: categories, preview, equipment, purchase, reload, Reckoning seal, skill ink/color picker, independent models, world render, compact layout');
  } catch (error) { console.error(error, errors); await shot('cosmetics-failure.png'); process.exitCode = 1; }
  finally { win.destroy(); server.server.close(); app.exit(process.exitCode || 0); }
}).catch(error => { console.error(error); app.exit(1); });
