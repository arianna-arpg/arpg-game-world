// Real Vault input, isolated saves. Run after npm run build.
const { app, BrowserWindow } = require('electron');
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
const rootArg = process.argv.indexOf('--root');
const buildRoot = path.resolve(__dirname, '..', rootArg < 0 ? 'dist' : process.argv[rootArg + 1]);
app.setPath('userData', path.join(dir, `memory-profile-${process.pid}`));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const server = await startGameServer({ root: buildRoot, savesDir: path.join(dir, `memory-saves-${process.pid}`) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = async source => {
    try { return await win.webContents.executeJavaScript(source); }
    catch (error) { throw new Error(`Vault script failed: ${source}`, { cause: error }); }
  };
  const open = async () => { await js(`window.__fakePads=[]; __game.ui.showAccountScreen(); document.querySelector('[data-vtab="gems"]')?.click(); void 0`); await wait(100); };
  const receipt = id => js(`__game.account().memoryReceipts[${JSON.stringify(id)}] ?? null`);
  const click = sel => js(`document.querySelector(${JSON.stringify(sel)}).click(); void 0`);
  const waitFor = async (source, label, timeout = 12000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) { if (await js(source)) return; await wait(100); }
    throw new Error('Timed out: ' + label);
  };
  const escape = async () => { await wait(300); await js(`window.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape',bubbles:true})); window.dispatchEvent(new KeyboardEvent('keyup', {key:'Escape',bubbles:true})); void 0`); };
  const closeReveal = async () => {
    if (await js(`!!document.querySelector('[data-memory-skip]')`)) await click('[data-memory-skip]');
    if (await js(`!!document.querySelector('.memory-reveal')`)) await escape();
    assert.equal(await js(`!!document.querySelector('.memory-reveal')`), false);
  };
  const shot = async name => fs.writeFileSync(path.join(dir, name + '.png'), (await win.webContents.capturePage()).toPNG());
  try {
    await win.loadURL(server.url); await wait(800);
    await js(`__game.hydrated()`);
    await js(`Object.assign(__game.account(), {credits:10000,level:20}); __game.account().ledger.account_deaths=1; void 0`);
    await open();
    assert.equal(await js(`document.querySelectorAll('[data-invest^="gem_skills_"], [data-invest^="sup_"]').length`), 0);
    assert.equal(await js(`document.querySelectorAll('[data-invest^="memory_"]').length`), 1, 'Awakening is absent before Odyssey 2');
    await js(`__game.account().ledger.odyssey_stage_1=1; void 0`); await open();
    assert.equal(await js(`document.querySelectorAll('[data-invest="memory_secondary"]').length`), 0, 'Odyssey 1 does not open Awakening');
    await js(`__game.account().ledger.odyssey_stage_2=1; void 0`); await open();
    assert.equal(await js(`document.querySelectorAll('[data-invest^="memory_"]').length`), 2);
    const credits = await js(`__game.account().credits`);
    await click('[data-memory-pool="memory_discovery"]');
    assert(await js(`document.querySelectorAll('.memory-pool-row').length > 0`), 'pool shows weighted chances');
    await js(`const q=document.querySelector('[data-memory-search]'); q.value='this is not a memory name'; q.dispatchEvent(new Event('input')); void 0`);
    assert.equal(await js(`document.querySelectorAll('.memory-pool-row').length`), 0);
    assert.equal(await js(`__game.account().credits`), credits, 'pool browsing spends nothing');
    await escape();
    // Cancelled pointer presses do not buy.
    await js(`(() => { const b=document.querySelector('[data-invest="memory_discovery"]'); b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1})); b.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1})); })()`);
    assert.equal(await receipt('memory_discovery'), null);
    await wait(600);
    // Pick the first eligible skill through the real grant path, restoring RNG immediately.
    await js(`(() => {const rng=Math.random; try {Math.random=()=>0; document.querySelector('[data-invest="memory_discovery"]').click();} finally {Math.random=rng;} })()`);
    const first = await receipt('memory_discovery');
    assert(first && first.sequence === 1, 'click grants one result');
    assert.equal(first.kind, 'skill');
    assert.equal(await js(`__game.account().credits`), credits - 30);
    assert(await js(`!!document.querySelector('.memory-reveal[data-phase="rolling"]')`), 'cinematic starts');
    assert(await js(`document.getElementById('account-screen').inert`), 'underlying Vault cannot receive input');
    await wait(200); await shot('memory-rolling');
    // Programmatic stale clicks are gated too, not just inert pointer traffic.
    await js(`document.querySelector('[data-invest="memory_discovery"]').click(); void 0`);
    assert.equal((await receipt('memory_discovery')).sequence, 1);
    await escape();
    assert(await js(`!!document.querySelector('.memory-reveal[data-phase="result"]')`), 'Escape skips to the saved result');
    await waitFor(`window.__skillShowcases.stats().blits > 8`, 'live skill preview');
    assert(await js(`window.__skillShowcases.stats().playing.startsWith(${JSON.stringify(first.id + '|')})`), 'preview matches receipt');
    assert.equal(await js(`document.querySelector('.memory-preview-stage').dataset.memoryPreviewState`), 'ready');
    win.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab'});
    win.webContents.sendInputEvent({type:'keyUp',keyCode:'Tab'}); await wait(100);
    assert(await js(`document.querySelector('.memory-reveal').contains(document.activeElement)`), 'Tab stays in the modal');
    await js(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',repeat:true,bubbles:true})); void 0`);
    assert(await js(`!!document.querySelector('.memory-reveal')`), 'held Escape cannot dismiss the result');
    await shot('memory-skill-result');
    await click('[data-memory-play]');
    await waitFor(`window.__skillShowcases.stats().mounts === 0`, 'paused preview disposed');
    await click('[data-memory-play]');
    await waitFor(`window.__skillShowcases.stats().visible === 1`, 'preview resumes');
    await js(`document.querySelector('.memory-reveal .skill-showcase').setAttribute('data-showcase-empty','unavailable'); void 0`);
    await waitFor(`document.querySelector('.memory-preview-stage').dataset.memoryPreviewState === 'unavailable'`, 'failed preview has a fallback');
    assert.equal((await receipt('memory_discovery')).sequence, 1, 'preview failure leaves receipt intact');
    await click('[data-memory-play]'); await click('[data-memory-play]');
    await waitFor(`document.querySelector('.memory-preview-stage').dataset.memoryPreviewState === 'ready'`, 'preview can be reopened');
    win.setSize(420, 820); await wait(200);
    assert(await js(`document.querySelector('.memory-reveal-box').scrollWidth <= document.querySelector('.memory-reveal-box').clientWidth + 1`), 'small screen has no horizontal overflow');
    await shot('memory-small-screen'); win.setSize(1400, 1000); await wait(150);
    await closeReveal();
    assert.equal(await js(`document.getElementById('account-screen').inert`), false);
    assert(await js(`document.activeElement.matches('[data-invest="memory_discovery"]')`), 'focus returns to the purchase');
    await click('[data-memory-review="memory_discovery"]');
    assert.equal((await receipt('memory_discovery')).sequence, 1, 'review never buys');
    await closeReveal();
    // The end of the combined pool is a support; let this animation finish naturally.
    await js(`(() => {const rng=Math.random; try {Math.random=()=>.999999999; document.querySelector('[data-invest="memory_discovery"]').click();} finally {Math.random=rng;} })()`);
    const second = await receipt('memory_discovery');
    assert.equal(second.sequence, 2);
    assert.equal(second.kind, 'support');
    assert.notEqual(first.kind + ':' + first.id, second.kind + ':' + second.id);
    await waitFor(`!!document.querySelector('.memory-reveal[data-phase="result"]')`, 'automatic reveal');
    assert.equal(await js(`document.querySelectorAll('.memory-reveal [data-skill-showcase]').length`), 0, 'supports use an honest static description');
    await shot('memory-support-result'); await closeReveal();
    // A held pointer must stop at ONE completion, even though the card is repeatable.
    await js(`document.querySelector('[data-invest="memory_discovery"]').dispatchEvent(new PointerEvent('pointerdown', {bubbles:true,pointerId:1})); void 0`);
    await wait(4000);
    assert.equal((await receipt('memory_discovery')).sequence, 3, 'hold stops at one purchase');
    await js(`document.dispatchEvent(new PointerEvent('pointerup', {bubbles:true,pointerId:1})); void 0`);
    await wait(600);
    await closeReveal();
    await js(`document.querySelector('[data-invest="memory_secondary"]').click(); void 0`);
    const awakened = await receipt('memory_secondary');
    assert.equal(awakened.kind, 'skill');
    assert(await js(`__game.account().memorySecondary.has('skill:'+__game.account().memoryReceipts.memory_secondary.id)`));
    await click('[data-memory-skip]'); await wait(300); await shot('memory-unlocks');
    assert(await js(`document.querySelector('[data-memory-next]').textContent.includes('Awaken another skill · 90 Mortal Essence')`), 'Awakening quotes its own price and action');
    await closeReveal();
    // Instant mode grants immediately without a modal; it survives reload.
    await js(`const mode=document.querySelector('[data-memory-mode]'); mode.value='instant'; mode.dispatchEvent(new Event('change')); void 0`);
    await click('[data-invest="memory_discovery"]');
    assert.equal((await receipt('memory_discovery')).sequence, 4);
    assert.equal(await js(`!!document.querySelector('.memory-reveal')`), false);
    await win.loadURL(server.url); await wait(800); await open();
    await js(`__game.hydrated()`);
    assert.equal((await receipt('memory_discovery')).sequence, 4, 'result persists after reload');
    assert.equal(await js(`__game.settings().memoryReveal`), 'instant');
    assert.equal((await receipt('memory_secondary')).id, awakened.id);
    assert(await js(`document.querySelector('[data-memory-result="memory_secondary"]').textContent.includes('Last awakened')`));
    // OS reduced-motion skips the reel and requires explicit preview playback.
    win.webContents.debugger.attach('1.3');
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await js(`__game.settings().memoryReveal='cinematic'; void 0`);
    await click('[data-invest="memory_secondary"]');
    assert(await js(`!!document.querySelector('.memory-reveal[data-phase="result"]')`));
    assert.equal(await js(`document.querySelectorAll('.memory-reveal [data-skill-showcase]').length`), 0);
    await closeReveal();
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {features:[]}); win.webContents.debugger.detach();
    // Leaving during animation cancels all UI work while preserving the grant.
    await click('[data-invest="memory_discovery"]');
    const interrupted = await receipt('memory_discovery');
    await js(`__game.ui.hideAll(); void 0`); await wait(3000);
    assert.equal(await js(`!!document.querySelector('.memory-reveal')`), false);
    assert.equal((await receipt('memory_discovery')).sequence, interrupted.sequence);
    assert.equal(await js(`document.getElementById('account-screen').inert`), false);
    // Completed investment can be claimed without any new currency, even by hold.
    await js(`__game.account().credits=0; __game.account().invested.memory_discovery=30; void 0`); await open();
    await js(`document.querySelector('[data-invest="memory_discovery"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1})); void 0`);
    await wait(1700);
    const prepaid = await receipt('memory_discovery');
    assert.equal(prepaid.sequence, interrupted.sequence + 1, 'funded overflow completes by hold');
    assert(await js(`!!document.querySelector('.memory-reveal')`), 'zero-new-payment completion still presents');
    await win.loadURL(server.url); await wait(800); await js(`__game.hydrated()`); await open();
    assert.equal((await receipt('memory_discovery')).id, prepaid.id, 'reload during reveal retains the exact outcome');
    assert.equal(await js(`!!document.querySelector('.memory-reveal')`), false, 'reload never restarts a purchase');
    // A short investment does not open theater; topping it up grants once.
    await js(`__game.account().credits=7; void 0`); await open();
    await click('[data-invest="memory_discovery"]');
    assert.equal(await js(`__game.account().invested.memory_discovery`), 7);
    assert.equal(await js(`!!document.querySelector('.memory-reveal')`), false);
    await js(`__game.account().credits=23; void 0`); await open();
    await click('[data-invest="memory_discovery"]');
    assert.equal((await receipt('memory_discovery')).sequence, prepaid.sequence + 1);
    await closeReveal();
    // Continue from the receipt: prepaid surplus, partial price, Instant and
    // insufficient funds all use the same ordinary purchase authority.
    const chainStart = (await receipt('memory_discovery')).sequence;
    await js(`__game.settings().memoryReveal='cinematic'; __game.account().credits=60; __game.account().invested.memory_discovery=75; void 0`); await open();
    await click('[data-invest="memory_discovery"]');
    const chainFirst = await receipt('memory_discovery');
    assert.equal(chainFirst.sequence, chainStart + 1);
    await js(`document.querySelector('.memory-orbit').click(); document.querySelector('[data-memory-next]').click(); void 0`);
    assert(await js(`!!document.querySelector('.memory-reveal[data-phase="result"]')`), 'clicking the animation reveals the saved result');
    assert.equal((await receipt('memory_discovery')).id, chainFirst.id, 'skip never rerolls');
    assert.equal((await receipt('memory_discovery')).sequence, chainFirst.sequence, 'skip cannot immediately buy again');
    assert(await js(`document.querySelector('[data-memory-next]').textContent.includes('Reveal another memory · 0 Mortal Essence')`), 'prepaid next result quotes zero');
    await wait(300);
    await js(`window.__staleMemoryNext=document.querySelector('[data-memory-next]'); __staleMemoryNext.click(); void 0`);
    const chainSecond = await receipt('memory_discovery');
    assert.equal(chainSecond.sequence, chainFirst.sequence + 1, 'repeat grants exactly one');
    assert.notEqual(chainSecond.kind + ':' + chainSecond.id, chainFirst.kind + ':' + chainFirst.id, 'repeat cannot duplicate a discovery');
    assert.equal(await js(`__game.account().credits`), 60, 'prepaid repeats spend no new Essence');
    assert(await js(`document.getElementById('account-screen').inert`), 'Vault stays isolated during the next reveal');
    await js(`__staleMemoryNext.click(); void 0`);
    assert.equal((await receipt('memory_discovery')).sequence, chainSecond.sequence, 'detached repeat controls cannot buy');
    await waitFor(`window.__skillShowcases.stats().mounts === 0`, 'prior receipt preview disposed during next reel');
    await click('.memory-reveal');
    assert(await js(`!!document.querySelector('.memory-reveal[data-phase="result"]')`), 'backdrop click also skips');
    assert(await js(`document.querySelector('[data-memory-next]').textContent.includes('15 Mortal Essence')`), 'remaining investment reduces the next price');
    await click('[data-memory-instant]'); await wait(300); await click('[data-memory-next]');
    assert.equal((await receipt('memory_discovery')).sequence, chainSecond.sequence + 1);
    assert.equal(await js(`__game.account().credits`), 45, 'repeat charges only the remainder');
    assert(await js(`!!document.querySelector('.memory-reveal[data-phase="result"]')`), 'Instant repeats show the new result without leaving the receipt');
    await wait(300);
    await js(`document.querySelector('[data-memory-next]').dispatchEvent(new MouseEvent('click',{bubbles:true,detail:2})); void 0`);
    assert.equal((await receipt('memory_discovery')).sequence, chainSecond.sequence + 1, 'double-click trailer cannot buy');
    await click('[data-memory-next]');
    const chainLast = await receipt('memory_discovery');
    assert.equal(chainLast.sequence, chainSecond.sequence + 2);
    assert.equal(await js(`__game.account().credits`), 15);
    assert(await js(`document.querySelector('[data-memory-next]').disabled && document.querySelector('#memory-next-note').textContent.includes('15 more Mortal Essence needed')`), 'unaffordable repeat explains the shortfall');
    await wait(300); await click('[data-memory-next]');
    assert.equal((await receipt('memory_discovery')).sequence, chainLast.sequence, 'disabled repeat spends nothing');
    win.setSize(420, 820); await wait(150);
    assert(await js(`document.querySelector('.memory-reveal-box').scrollWidth <= document.querySelector('.memory-reveal-box').clientWidth + 1`), 'repeat actions fit narrow screens');
    await js(`document.querySelector('.memory-result-actions').scrollIntoView({block:'end'}); void 0`); await wait(100);
    await shot('memory-repeat-small'); win.setSize(1400, 1000); await wait(150);
    await shot('memory-repeat-result');
    await win.loadURL(server.url); await wait(800); await js(`__game.hydrated()`); await open();
    assert.equal((await receipt('memory_discovery')).id, chainLast.id, 'repeat receipt is saved before presentation');
    assert.equal(await js(`__game.account().credits`), 15, 'repeat payment persists');
    await click('[data-memory-review="memory_discovery"]');
    assert.equal(await js(`!!document.querySelector('[data-memory-next]')`), false, 'history stays a read-only receipt');
    await closeReveal();
    // Eligibility is rechecked on activation, even if it changed after quoting.
    await js(`__game.settings().memoryReveal='cinematic'; __game.account().credits=60; void 0`); await open();
    await click('[data-invest="memory_discovery"]'); await click('.memory-orbit'); await wait(300);
    const beforeEmpty = await receipt('memory_discovery');
    await js(`__game.account().features.add('unlock_all_gems'); void 0`);
    await click('[data-memory-next]');
    assert(await js(`document.querySelector('[data-memory-next]').disabled && document.querySelector('#memory-next-note').textContent.includes('No eligible Memories')`), 'newly exhausted pool disables repeat');
    assert.equal((await receipt('memory_discovery')).sequence, beforeEmpty.sequence);
    assert.equal(await js(`__game.account().credits`), 30, 'exhausted repeat charges nothing');
    await closeReveal();
    // Debug-codex exhaustion is an inexpensive full-pool fixture. Review stays reachable.
    await js(`__game.account().features.add('unlock_all_gems'); void 0`); await open();
    assert.equal(await js(`document.querySelectorAll('[data-invest^="memory_"]').length`), 0);
    await click('[data-memory-pool="memory_discovery"]');
    assert(await js(`document.querySelector('[data-memory-count]').textContent.includes('Every eligible Memory')`));
    await escape(); await click('[data-memory-review="memory_discovery"]'); await closeReveal();
    await js(`__game.account().features.delete('unlock_all_gems'); void 0`);
    // Hidden until both the account milestone and this skill's Awakening hold.
    const tree = await js(`(() => {
      __game.devStartRun('warrior');
      const w=__game.world(), ui=__game.ui;
      const inst=[...w.localSeat.meta.knownSkills.values()].find(s=>s.def.tree);
      inst.level=10; __game.account().memorySecondary.clear();
      ui.openSkillTree(inst.def.id);
      const html=ui.learnedListHtml();
      w.fonts=[{pos:{...w.player.pos},tier:w.player.tier}];
      ui.fontOpen=true; ui.fontTab='reset'; ui.refreshFont();
      return {id:inst.def.id, blocked:ui.openSkillTreePanes().length===0,
        hidden:!html.includes('data-treeopen=') && !html.includes('class="tree-points"'),
        leveling:html.includes('data-levelup='), resetHidden:!document.querySelector('[data-fonttab="reset"]')};
    })()`);
    assert(tree.blocked && tree.hidden && tree.leveling && tree.resetHidden, 'unawakened tree UI stays hidden while leveling remains available');
    assert(await js(`(() => {
      const a=__game.account(), ui=__game.ui, id=${JSON.stringify(tree.id)};
      a.memorySecondary.add('skill:'+id); delete a.ledger.odyssey_stage_2;
      ui.openSkillTree(id); return ui.openSkillTreePanes().length===0;
    })()`), 'early legendary receipt cannot open a tree');
    assert(await js(`(() => { __game.account().ledger.odyssey_stage_2=1; __game.ui.openSkillTree(${JSON.stringify(tree.id)}); return document.querySelectorAll('.st-node.available').length>0; })()`), 'milestone activates the remembered Awakening and banked points');
    await js(`delete __game.account().ledger.odyssey_stage_2; __game.ui.refreshSkillTree(); void 0`);
    assert.equal(await js(`__game.ui.openSkillTreePanes().length`), 0, 'stale pane closes when access is absent');
    assert.equal(await js(`__game.crash().fatal`), null);
    console.log('PASS memory UI: pool odds / cancellation / reveal / click-anywhere skip / repeat purchase / remainder pricing / insufficient funds / exhaustion / input isolation / previews / focus / responsive layout / instant mode / reduced motion / replay / interruption / one draw per hold / persistence / tree gate');
  } finally { win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { console.error(error?.stack ?? String(error)); app.exit(1); });
