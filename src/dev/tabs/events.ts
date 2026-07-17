// ---------------------------------------------------------------------------
// DEV TAB: EVENTS — force-spawn each world event in the CURRENT zone on a
// button press, and a LIVE global event-frequency crank (rate / concurrency /
// severity sliders) for stress-testing. Only meaningful on the AUTHORITATIVE
// peer (see dev/panel.ts).
// ---------------------------------------------------------------------------

import type { World } from '../../engine/world';
import type { OverlayView } from '../../world/overlay';
import type { FrequencyProfile } from '../../packages/frequency';
import type { DevTabDef } from '../panel';
import { DEV_UI, btn, css, hrow, section } from '../ui';

export const eventsTab: DevTabDef = {
  id: 'events',
  label: 'Events',
  build: ({ runActive, flash }) => {
    const pane = document.createElement('div');
    css(pane, { overflowY: 'auto' });

    // --- force-spawn one event into the CURRENT zone -------------------------
    const spawnRow = hrow();

    const forceEvent = (label: string, fn: (w: World, view: OverlayView, zid: string) => boolean): HTMLButtonElement =>
      btn(label, () => {
        const w = runActive();
        if (!w) { flash('start a run first'); return; }
        const zid = w.zone.id;
        let ok = false;
        try { ok = fn(w, w.devOverlayView(), zid); if (ok) w.devRematerialize(); }
        catch (e) { flash(`${label}: ${(e as Error).message}`); return; }
        flash(ok ? `${label} → spawned in ${w.zone.name}`
          : `${label}: unavailable here (package off this run, or unsuitable zone)`);
      });

    spawnRow.append(
      forceEvent('Demon Invasion', (w, v, z) => w.sim.demonField?.devIgnite(v, z) ?? false),
      forceEvent('Crusade', (w, v, z) => w.sim.crusadeField?.devIgnite(v, z) ?? false),
      forceEvent('Fracture', (w, v, z) => w.sim.fractureField?.devIgnite(v, z) ?? false),
      forceEvent('Hunt Beast', (w, v, z) => w.sim.huntField?.devIgnite(v, z) ?? false),
      forceEvent('Conclave Ritual', (w, v, z) => w.sim.conclaveField?.devOpenRitual(v, z) ?? false),
      forceEvent('Deadwake (flood here)', (w, v, z) => w.sim.deadwakeField?.devIgnite(v, z) ?? false),
      forceEvent('Necropolis (fuse here)', (w, v, z) => w.sim.deadwakeField?.devForceNecropolis(v, z) ?? false),
      forceEvent('Migration (herd here)', (w, v, z) => w.sim.migrationField?.devIgnite(v, z) ?? false),
      forceEvent('Swarming (brood here)', (w, v, z) => w.sim.swarmingField?.devIgnite(v, z) ?? false),
      forceEvent('Swarming (take wing)', (w, v) => w.sim.swarmingField?.devWing(v) ?? false),
      forceEvent('Brigands (band here)', (w, v, z) => w.sim.brigandField?.devIgnite(v, z) ?? false),
      forceEvent('Contagion (outbreak here)', (w, v, z) => w.sim.contagionField?.devIgnite(v, z) ?? false),
      forceEvent('Deepwinter (winter here)', (w, v, z) => w.sim.deepwinterField?.devIgnite(v, z) ?? false),
      forceEvent('Holdfast (toll gate here)', (w) => w.devForceHoldfast()),
      forceEvent('Mycelia (bloom here)', (w, v, z) => w.sim.myceliaField?.devIgnite(v, z) ?? false),
      forceEvent('Haunting (grief here)', (w, v, z) => w.sim.hauntField?.devIgnite(v, z) ?? false),
      forceEvent('Breach (tear here)', (w, v, z) => (w.sim.breachField?.devIgnite(v, z) ?? null) !== null),
      forceEvent('Extraction (seam here)', (w) => w.devForceExtraction()),
      forceEvent('Borough (settlement here)', (w) => w.devForceBorough()),
      // ASCENT: vent a sky geyser beside the player — dwell into the spray to
      // ride the launch (the shelf is the zone's own: same pocket the organic
      // roll would open). Works anywhere with standing ground, even the town.
      forceEvent('Sky Geyser (vent here)', (w) => w.devSpawnGeyser()),
      forceEvent('Amalgamation (Bonewright here)', (w, v, z) => w.sim.amalgamationField?.devOpen(v, z) ?? false),
      forceEvent('Vendetta (post a writ)', (w, v, z) => w.sim.vendettaField?.devIgnite(v, z) ?? false),
      // WORLD BOSSES: the three archetypes, each on its own trigger. The
      // serpent wakes HERE (watch the map: it slithers, roads seal behind it);
      // the apparition skips its herald and manifests in this zone; the lair
      // anchors to this zone and mints its throne-zone off the mint drain.
      forceEvent('World Serpent (wakes here/nearby)', (w, v, z) => w.sim.worldBossField?.devIgnite(v, z) ?? false),
      forceEvent('World Boss (manifests here)', (w, v, z) =>
        w.sim.worldBossFieldFor(w.zone.dimension)?.devManifest(v, z) ?? false),
      forceEvent('World Boss Lair (grows here)', (w, v, z) => w.sim.worldBossField?.devLair(v, z) ?? false),
      // WRAITHSAIL: summon puts (or moves) the ghost ship onto open water
      // near this zone (watch the map — the ⛵ traces the sea); dock forces
      // her alongside THIS port so the court walks ashore on the next frame.
      forceEvent('Wraithsail (summon near)', (w, v, z) => w.sim.wraithsailField?.devSummon(v, z) ?? false),
      forceEvent('Wraithsail (dock here)', (w, v, z) => w.sim.wraithsailField?.devDock(v, z) ?? false),
      // THE GLOAMING: ignition is world-scale (the front rises from the
      // gloamwood and marches the web — watch the map darken); recede sends
      // a risen front home rim-first.
      forceEvent('Gloaming (rise from the wood)', (w) => { w.sim.gloamingField?.devIgnite(); return !!w.sim.gloamingField; }),
      forceEvent('Gloaming (recede)', (w) => { w.sim.gloamingField?.devRecede(); return !!w.sim.gloamingField; }),
    );

    // Incursion + incubation have bespoke signatures (a far landing / a counter).
    const incursionBtn = btn('Eldritch Incursion (far)', () => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      const z = w.zoneMap[w.zone.id];
      const r = z ? w.sim.incursionField.ignite('eldritch', { x: z.map.x, y: z.map.y }, w.player.level) : null;
      flash(r ? 'Eldritch Incursion landing — hidden zones minted afar; influence creeps in' : 'Incursion at cap / unavailable');
    });
    const incubateBtn = btn('Force Eldritch Incubation', () => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      if (!w.sim.conclaveField) { flash('conclave not in this run'); return; }
      w.sim.conclaveField.devMaxIncubation();
      flash('incubation maxed — the Eldritch Incursion ignites within moments');
    });
    const corpseTideBtn = btn('Max Corpse Tide', () => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      if (!w.sim.deadwakeField) { flash('deadwake not in this run'); return; }
      w.sim.deadwakeField.devMaxCounter();
      flash('corpse tide maxed — a Deadwake breaks loose within moments (it drifts in)');
    });
    spawnRow.append(incursionBtn, incubateBtn, corpseTideBtn);

    // --- LIVE global frequency crank (the testing lever) ---------------------
    const profile: FrequencyProfile = { rate: 1, concurrency: 1, severity: 1 };
    const freqEls: Partial<Record<keyof FrequencyProfile, { rng: HTMLInputElement; val: HTMLElement }>> = {};
    const applyFreq = (): void => {
      const w = runActive();
      if (w) w.sim.setDevFrequency({ ...profile });
      flash(`live frequency → rate ${profile.rate}× · caps ${profile.concurrency}× · size ${profile.severity}×`);
    };
    const freqWrap = document.createElement('div');
    css(freqWrap, { display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' });
    const mkFreq = (key: keyof FrequencyProfile, label: string): HTMLElement => {
      const r = document.createElement('div');
      css(r, { display: 'flex', gap: '6px', alignItems: 'center' });
      const lab = document.createElement('span'); lab.textContent = label; css(lab, { width: '92px', fontSize: '11px' });
      const rng = document.createElement('input');
      rng.type = 'range'; rng.min = '0'; rng.max = '10'; rng.step = '0.25'; rng.value = '1';
      css(rng, { flex: '1' });
      const val = document.createElement('span'); val.textContent = '1.0×';
      css(val, { width: '44px', textAlign: 'right', fontSize: '11px', color: DEV_UI.accent });
      rng.addEventListener('input', () => {
        profile[key] = +rng.value; val.textContent = (+rng.value).toFixed(2) + '×';
        applyFreq();
      });
      r.append(lab, rng, val);
      freqEls[key] = { rng, val };
      return r;
    };
    freqWrap.append(
      mkFreq('rate', 'Rate (how often)'),
      mkFreq('concurrency', 'Caps (how many)'),
      mkFreq('severity', 'Severity (size)'),
    );
    const freqReset = btn('Revert to run setting', () => {
      const w = runActive();
      if (w) w.sim.setDevFrequency(null); // drop the override → effective = manifest value
      syncFreq();                         // re-seed sliders from the (possibly non-1×) effective value
      flash('live frequency reverted to the run setting');
    });

    // Re-seed the sliders from the run's EFFECTIVE frequency when the tab opens.
    const syncFreq = (): void => {
      const w = runActive();
      const f = w ? w.sim.effectiveFrequency() : profile;
      profile.rate = f.rate; profile.concurrency = f.concurrency; profile.severity = f.severity;
      for (const k of Object.keys(freqEls) as (keyof FrequencyProfile)[]) {
        const e = freqEls[k]; if (e) { e.rng.value = String(profile[k]); e.val.textContent = profile[k].toFixed(2) + '×'; }
      }
    };

    // --- GATE INSPECTOR: the resolved per-package gates, live -----------------
    // The one QA window into the weighting math: what resolveGates actually
    // produced for the character's level (share / pressure / the three muls),
    // straight off the sim's memo — if a package "never fires", this says
    // whether its gate is even open before anyone blames its overlay.
    const gateWrap = document.createElement('div');
    css(gateWrap, { fontSize: '11px', whiteSpace: 'pre', fontFamily: 'monospace', lineHeight: '1.5' });
    const syncGates = (): void => {
      const w = runActive();
      if (!w) { gateWrap.textContent = '(start a run first)'; return; }
      const gates = w.sim.gatesFor(w.player.level);
      const rows: string[] = [
        `lv ${w.player.level} · ` +
        `freq rate ${w.sim.effectiveFrequency().rate}× / caps ${w.sim.effectiveFrequency().concurrency}× / size ${w.sim.effectiveFrequency().severity}×`,
        'package            act share press  ign×  sev×  cap×',
      ];
      for (const e of w.manifest.packages) {
        const g = gates.get(e.id);
        if (!g) continue;
        rows.push(
          e.id.padEnd(18)
          + (g.active ? ' ON ' : ' –  ')
          + g.share.toFixed(2).padStart(5)
          + g.pressure.toFixed(2).padStart(6)
          + g.ignitionMul.toFixed(2).padStart(6)
          + g.severityMul.toFixed(2).padStart(6)
          + g.concurrencyMul.toFixed(2).padStart(6),
        );
      }
      gateWrap.textContent = rows.join('\n');
    };
    const gateRefresh = btn('Refresh gates', syncGates);

    pane.append(
      section('Force event in CURRENT zone'), spawnRow,
      section('Live event frequency (this run)'), freqWrap, freqReset,
      section('Resolved package gates (live)'), gateWrap, gateRefresh,
    );
    return { el: pane, onShow: () => { syncFreq(); syncGates(); } };
  },
};
