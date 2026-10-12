import { makeSimWorld } from '../src/sim/arena';
import { forgeItem } from '../src/engine/itemgen';
import { sceneBegin, muStageLive } from '../src/engine/scenes';
import { serializeAccount, deserializeAccount } from '../src/meta/account';
import { RELIC_UNIQUES } from '../src/data/uniques/relics';
import { RELIQUARY } from '../src/data/containers';

/** Shared by the Mu probe: exercise equipped account Relics on both roads in. */
export function runMuReliquaryChecks(check: (name: string, ok: boolean) => void): void {
  for (const entrance of ['mu', 'prologue'] as const) {
    const w = makeSimWorld('warrior', 47110);
    for (const rung of RELIQUARY.ladder) w.account.features.add(rung.feature);
    const p = w.player;
    const baseLife = p.maxLife(), baseSpeed = p.sheet.get('moveSpeed');
    const idol = forgeItem({ ilvl: 30, uniqueId: 'unquarried_idol', quality: 1 })!;
    const charm = forgeItem({ ilvl: 30, baseId: 'relic_charm', rarity: 'magic',
      affixes: [{ id: 'relic_life' }], quality: 1 })!;
    const knot = forgeItem({ ilvl: 30, uniqueId: 'wayfarers_knot', quality: 1 })!;
    const items = [idol, charm, knot];
    items.forEach((item, i) => { item.relicKey = `mu-probe:${i}`; item.x = i; item.y = 0; });
    Object.assign(w.account.reliquary, { items, seated: items.map(i => i.relicKey!), rank: 50, enabled: true });
    w.restoreAccountRelics(w.localSeat);
    w.recalcPlayer();
    w.update(1 / 60);
    const follower = w.actors.find(a => !a.dead && a.owner === p && a.summonInst?.relicSource === idol.relicKey);
    check(`Relics/${entrance}: living hero receives stats, proc and Idol companion`,
      p.maxLife() > baseLife && p.sheet.get('moveSpeed') > baseSpeed
      && p.sheet.get('proc_relic_wayfarer') > 0 && !!follower);
    const before = JSON.stringify(w.account.reliquary);

    check(`Relics/${entrance}: scene begins`, sceneBegin(w, entrance));
    if (entrance === 'prologue') {
      // Start at the real tutorial's final stage; its handler mints Mu from
      // the tutorial ground, whereas the standalone hub already stands there.
      w.scene!.stageIx = w.scene!.def.stages.findIndex(s => s.kind === 'mu');
    }
    w.update(1 / 60);
    check(`Relics/${entrance}: Mu entry removes all board modifiers immediately`,
      muStageLive(w) && !p.sheet.hasSource('container:reliquary')
      && p.maxLife() === baseLife && p.sheet.get('moveSpeed') === baseSpeed
      && p.sheet.get('proc_relic_wayfarer') === 0 && p.life === p.maxLife());
    check(`Relics/${entrance}: entry retires the existing Idol companion`, !!follower?.dead);

    for (let i = 0; i < 3; i++) {
      w.restoreAccountRelics(w.localSeat);
      w.recalcPlayer();
      for (let tick = 0; tick < 60; tick++) w.update(1 / 60);
    }
    check(`Relics/${entrance}: account restores and repeated recalcs cannot regrant effects`,
      !p.sheet.hasSource('container:reliquary') && p.skills.every(s => s === null)
      && !w.actors.some(a => !a.dead && a.owner === p && !!a.summonInst?.relicSource));
    const xp = w.meta.xp;
    w.grantXp(1);
    check(`Relics/${entrance}: the wisp pays no Reliquary XP penalty`, w.meta.xp - xp === 1);
    check(`Relics/${entrance}: account board, rolls, empowerment and toggle remain intact`,
      JSON.stringify(w.account.reliquary) === before && w.meta.containers.reliquary.length === items.length);

    // The shell starts a fresh world for the chosen vessel. Restore the same
    // saved account to prove that suppression is confined to the Mu stage.
    const next = makeSimWorld('warrior', 47111);
    Object.assign(next.account, deserializeAccount(serializeAccount(w.account))!);
    next.restoreAccountRelics(next.localSeat);
    next.recalcPlayer(); next.update(1 / 60);
    check(`Relics/${entrance}: the next living vessel regains its stats and companion`,
      next.player.maxLife() > baseLife && next.player.sheet.get('moveSpeed') > baseSpeed
      && next.actors.some(a => !a.dead && a.owner === next.player && a.summonInst?.relicSource === idol.relicKey));
    next.account.reliquary.enabled = false; next.recalcPlayer(); next.update(1 / 60);
    check(`Relics/${entrance}: a deliberately disabled board stays inert on the living hero`,
      !next.player.sheet.hasSource('container:reliquary')
      && !next.actors.some(a => !a.dead && a.owner === next.player && !!a.summonInst?.relicSource));
  }

  const w = makeSimWorld('warrior', 47112);
  for (const rung of RELIQUARY.ladder) w.account.features.add(rung.feature);
  sceneBegin(w, 'mu'); w.update(1 / 60);
  // Run every authored identity through the live board fold, including
  // tradeoffs, conditional procs, companion grants and rolled families.
  for (const unique of RELIC_UNIQUES) {
    const item = forgeItem({ ilvl: 80, uniqueId: unique.id, quality: 1 })!;
    item.relicKey = 'mu-pool:' + unique.id; item.x = 0; item.y = 0;
    Object.assign(w.account.reliquary, { items: [item], seated: [item.relicKey], rank: 50, enabled: true });
    w.restoreAccountRelics(w.localSeat); w.recalcPlayer(); w.update(1 / 60);
    check(`Relics/pool: ${unique.id} is inert on the wisp`,
      w.meta.containers.reliquary.includes(item)
      && !w.player.sheet.hasSource('container:reliquary') && !w.localSeat.grantedInsts?.size
      && w.player.skills.every(s => s === null)
      && !w.actors.some(a => !a.dead && a.owner === w.player && !!a.summonInst?.relicSource));
  }
}
