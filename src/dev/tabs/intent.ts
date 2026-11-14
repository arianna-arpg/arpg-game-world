// ---------------------------------------------------------------------------
// DEV TAB: AI — the intent layer's lens (docs/design/npc-ai-direction.md). Lists the
// enemy bodies around the hero with what their brain is reading: kernel, ring, the
// ready ring's last read, closer tokens on the hero, the think clock and, for bodies
// with an intent, what they want and the scores behind it, its stance, temperament and
// chaos tokens. The A/B levers turn the intent layer, the stances or the chaos budget
// off for every body at once, so a person can feel the difference in the same fight.
// ---------------------------------------------------------------------------

import type { DevTabDef } from '../panel';
import type { Actor } from '../../engine/actor';
import { CHAOS_BUDGETS, INTENT_CFG } from '../../data/aiIntent';
import { normalizeBrain } from '../../engine/brain';
import { btn, check, css, DEV_UI, hrow, option, section, selectEl } from '../ui';

function line(a: Actor, hero: Actor, now: number): string {
  const d = Math.round(Math.hypot(a.pos.x - hero.pos.x, a.pos.y - hero.pos.y));
  const style = normalizeBrain(a.brain ?? {}).base.move?.style ?? 'approach';
  const ring = a.aiRingKeep >= 0 ? `ready keep ${a.aiRingKeep}` : 'ready keep —';
  const think = a.aiThinkAt >= 0 ? `think in ${Math.max(0, a.aiThinkAt - now).toFixed(2)}s` : 'no intent axis';
  const it = a.aiIntent;
  const state = (it?.offBook ? ', off book' : '') + (it?.spent ? ', cast' : it?.waiting ? ', waiting for it' : '');
  const intent = it ? ` · wants ${it.id}${state} (${it.scores.map(([s, w]) => `${s} ${w.toFixed(2)}`).join(', ')})` : '';
  const stance = a.aiStance ? ` · ${a.aiStance} for ${Math.max(0, a.aiStanceUntil - now).toFixed(1)}s${a.aiShiftUntil > now ? ', shifting' : ''}` : '';
  const kite = a.aiKiteKeep > 0 ? ` · kiting at ${a.aiKiteKeep}px` : '';
  const t = a.aiTemper;
  const temper = t ? ` · bold ${t.bold.toFixed(2)} nerve ${t.nerve.toFixed(2)} volatile ${t.volatile.toFixed(2)}` : '';
  const chaos = a.aiChaosAt >= 0 ? ` · chaos ${a.aiChaosTokens.toFixed(2)} token(s) ${(now - a.aiChaosAt).toFixed(1)}s ago` : '';
  return `${style} · ${d}px · ${ring} · ${think}${intent}${stance}${kite}${temper}${chaos}`;
}

export const intentTab: DevTabDef = {
  id: 'intent',
  label: 'AI',
  build(ctx) {
    const el = document.createElement('div');
    const lever = check('Intent layer on (A/B: off plays every body as before)', INTENT_CFG.enabled);
    lever.box.addEventListener('change', () => {
      INTENT_CFG.enabled = lever.box.checked;
      ctx.flash(INTENT_CFG.enabled ? 'intent layer ON' : 'intent layer OFF: every body plays the plain ready ring');
    });
    const stances = check('Stances on (off: every kiter keeps its distance)', INTENT_CFG.stance.enabled);
    stances.box.addEventListener('change', () => {
      INTENT_CFG.stance.enabled = stances.box.checked;
      ctx.flash(INTENT_CFG.stance.enabled ? 'stances ON' : 'stances OFF: every kiter keeps its distance');
    });
    const chaos = check('Chaos budget on (off: no decision goes off book)', INTENT_CFG.chaos.enabled);
    chaos.box.addEventListener('change', () => {
      INTENT_CFG.chaos.enabled = chaos.box.checked;
      ctx.flash(INTENT_CFG.chaos.enabled ? 'chaos budget ON' : 'chaos budget OFF: every decision stays on book');
    });
    // The default row every intent body without its own carries, to feel steady against the rest.
    const row = selectEl();
    for (const id of Object.keys(CHAOS_BUDGETS)) row.append(option(id, `chaos default: ${id}`));
    row.value = INTENT_CFG.chaos.default;
    row.addEventListener('change', () => {
      INTENT_CFG.chaos.default = row.value;
      ctx.flash(`chaos default: ${row.value} (bodies with their own row keep it; dim minds stay none)`);
    });
    const cut = check('Off book picks only a cut option (plan: cut options join the roll)', INTENT_CFG.chaos.pick === 'cut');
    cut.box.addEventListener('change', () => {
      INTENT_CFG.chaos.pick = cut.box.checked ? 'cut' : 'join';
      ctx.flash(cut.box.checked ? 'off book: every roll picks a cut option' : 'off book: cut options join the roll');
    });
    const head = hrow();
    head.append(lever.el, stances.el, chaos.el, row, cut.el);
    const list = document.createElement('div');
    css(list, { overflowY: 'auto', flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column' });

    const rebuild = (): void => {
      lever.box.checked = INTENT_CFG.enabled;
      stances.box.checked = INTENT_CFG.stance.enabled;
      chaos.box.checked = INTENT_CFG.chaos.enabled;
      row.value = INTENT_CFG.chaos.default;
      cut.box.checked = INTENT_CFG.chaos.pick === 'cut';
      list.innerHTML = '';
      const w = ctx.runActive();
      const empty = (msg: string): void => {
        const e = document.createElement('div');
        e.textContent = msg;
        css(e, { color: DEV_UI.textDim, padding: '4px' });
        list.append(e);
      };
      if (!w) { empty('no live run'); return; }
      const hero = w.player;
      const tokens = hero.aiCloserClaims ? [...hero.aiCloserClaims.values()].filter(t => t > w.time).length : 0;
      const surprises = hero.aiOffBookClaims ? hero.aiOffBookClaims.filter(t => t > w.time).length : 0;
      list.append(section(`ENEMIES NEAR THE HERO — ${tokens} closer token(s), ${surprises} off-book act(s) held on you`));
      const near = w.actors
        .filter(a => a.team === 'enemy' && !a.dead && !a.passive)
        .map(a => ({ a, d: Math.hypot(a.pos.x - hero.pos.x, a.pos.y - hero.pos.y) }))
        .filter(x => x.d < 900)
        .sort((p, q) => p.d - q.d)
        .slice(0, 24);
      if (!near.length) { empty('no enemies within 900px'); return; }
      for (const { a } of near) {
        const row = document.createElement('div');
        css(row, { padding: '2px 4px', display: 'flex', flexDirection: 'column' });
        const name = document.createElement('span');
        name.textContent = `${a.defId ?? 'actor'}#${a.id}`;
        css(name, { color: DEV_UI.text });
        const read = document.createElement('span');
        read.textContent = line(a, hero, w.time);
        css(read, { color: DEV_UI.textDim, fontSize: '10px' });
        row.append(name, read);
        list.append(row);
      }
    };
    const refresh = hrow();
    refresh.append(btn('↻ Refresh', rebuild));
    el.append(head, refresh, list);
    return { el, onShow: rebuild };
  },
};
