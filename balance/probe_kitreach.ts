// ---------------------------------------------------------------------------
// ONE-OFF PROBE — A KIT THAT CAN SWING. The balance farm's bestiary found bodies
// with damage skills and legs that never swung in a duel. Two causes are pinned
// here on the real engine: the orbit kernel settling outside a body's own reach
// (sideways motion drifts it out to the band's edge), and a status-gated skill
// holding a body at range when nothing in its kit can ever make that status. The
// census of those skills lives in src/sim/ringAudit.ts, which reads a kit honestly:
// a skill's own payload cannot unlock it, and an ailment chance is the tuned one.
// Run: npx tsx balance/probe_kitreach.ts
// ---------------------------------------------------------------------------

import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { mod } from '../src/engine/stats';
import { updateAI } from '../src/engine/ai';
import { setSimTap } from '../src/engine/tap';
import { ringAudit } from '../src/sim/ringAudit';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

/** A real duel against a hero who stands still and cannot die: what the body does when nothing stops it. */
function duel(defId: string, seconds: number, seed: number, facing = 0) {
  seedGlobalRandom(seed);
  const w = makeSimWorld('warrior', seed), p = w.player;
  p.skills = []; p.casting = null;
  p.sheet.setSource('probe-rig', [mod('life', 'override', 1e6), mod('moveSpeed', 'override', 0)]);
  p.fillResources();
  const body = w.createMonster(defId, 12, 'enemy');
  body.pos = { x: p.pos.x + 240, y: p.pos.y }; body.tier = p.tier; body.facing = facing;
  w.actors = [p, body];
  const casts = new Map<string, number>();
  let burned = false, firstHit = -1;
  setSimTap({ onCast: (a, inst) => { if (a === body) casts.set(inst.def.id, (casts.get(inst.def.id) ?? 0) + 1); } });
  const dt = 1 / 60, full = p.life;
  let closest = Infinity;
  try {
    for (let t = 0; t < seconds; t += dt) {
      w.applyInputs(new Map(), dt);
      for (const a of [...w.actors]) updateAI(a, w, dt);
      w.update(dt);
      burned ||= p.statuses.some(s => s.id === 'burn');
      if (firstHit < 0 && p.life < full) firstHit = t;
      closest = Math.min(closest, Math.hypot(body.pos.x - p.pos.x, body.pos.y - p.pos.y));
    }
  } finally { setSimTap(null); }
  return { casts, burned, firstHit, closest, gap: Math.hypot(body.pos.x - p.pos.x, body.pos.y - p.pos.y) };
}

// --- 1) The orbit kernel keeps a melee body inside its own reach -----------------------
for (const id of ['charnel_ghoul', 'gnasher_hopper', 'cinder_hound']) {
  const d = duel(id, 20, 0x71);
  check(`orbit: ${id} circles and lands its claw`, (d.casts.get('claw') ?? 0) > 0 && d.firstHit >= 0,
    `claw ${d.casts.get('claw') ?? 0}, first hit ${d.firstHit.toFixed(1)}s, ending ${d.gap.toFixed(0)} away`);
}

// --- 2) A status-gated skill must be able to fire ------------------------------------
{
  for (const row of ringAudit().stranded) {
    const keep = SKILLS[row.skill]?.ai?.keepDistance;
    if (!keep) continue;
    const body = duel(row.monster, 20, 0x73, Math.PI);
    const others = (MONSTERS[row.monster].skills ?? []).map(s => (s === row.skill || typeof s !== 'string' ? 0 : SKILLS[s]?.ai?.range ?? 0));
    check(`kit: ${row.monster} is not held at range by ${row.skill}, which nothing in its kit can feed`,
      body.closest <= Math.max(...others) && body.closest < keep * 0.75, `came within ${body.closest.toFixed(0)}, it asked for ${keep}`);
  }

  const hound = duel('hellhound', 45, 0x72);
  check('hellhound: it closes and bites', (hound.casts.get('scorching_bite') ?? 0) > 0 && hound.firstHit >= 0, JSON.stringify([...hound.casts]));
  check('hellhound: the bite lights its prey', hound.burned);
  check('hellhound: and it finally casts Combustion', (hound.casts.get('combustion_strike') ?? 0) > 0, JSON.stringify([...hound.casts]));
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
