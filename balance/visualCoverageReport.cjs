const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function saveCoverage(rows, destination, repo) {
  const totals = {};
  for (const r of rows) {
    const group = totals[r.group] ??= {};
    group[r.state] = (group[r.state] ?? 0) + 1;
  }
  console.table(totals);
  if (!destination) return;
  const base = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
  const date = new Date().toISOString();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const groups = Object.keys(totals), states = [...new Set(rows.map(r => r.state))];
  const previewBase=encodeURIComponent(path.parse(destination).name);
  const options = values => values.map(v => '<option>' + esc(v) + '</option>').join('');
  const cells = rows.map(r => {
    const detail=esc(r.detail);
    return '<tr id="'+esc(r.group+'/'+r.id)+'"><td>' + esc(r.group) + '</td><td><strong>' + esc(r.name || r.id) + '</strong><br><code>' + esc(r.id) + '</code></td><td>' + esc(r.state) + '</td><td>' +
      (detail.length>500?'<details><summary>View all sources and evidence</summary>'+detail+'</details>':detail)+'</td></tr>';
  }).join('');
  const summary=Object.entries(totals).map(([group,counts])=>'<tr><th>'+esc(group)+'</th><td>'+Object.entries(counts).map(([state,n])=>n.toLocaleString('en')+' '+esc(state)).join(' · ')+'</td></tr>').join('');
  fs.mkdirSync(path.dirname(path.resolve(destination)), { recursive: true });
  fs.writeFileSync(destination, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hollow Wake · Visual coverage</title><style>
  *{box-sizing:border-box}body{background:#141b20;color:#e8ecec;font:16px/1.5 system-ui,sans-serif;max-width:1340px;margin:auto;padding:2vw}h1{line-height:1.1}p{max-width:95ch}input,select{font:inherit;color:inherit;background:#27323a;padding:.45rem;border:1px solid #687981;border-radius:4px}label{display:inline-grid;gap:.2em;margin:.7em .6em .7em 0}table{width:100%;border-collapse:collapse;text-align:left}td,th{padding:.48em;border-bottom:1px solid #39464c;vertical-align:top}td:last-child{max-width:58ch}code{color:#a2bebf;overflow-wrap:anywhere}strong{color:#f0dfb9}thead{background:#27323a}small{color:#a2bebf}</style>
  <h1>Hollow Wake · Visual coverage</h1><small>${esc(date)} · Local game based on ${esc(base)}</small>
  <p>Each skill used its native release in a seeded arena. Its row lists the visual layers that produced pixels from actual cast output. Triggered effects used the resolved proc directly. Timed events, additional presses and projectile arrivals were sampled during four seconds of controlled combat clocks. Read an entry’s evidence to see which part was exercised.</p>
  <p><strong>In game</strong> means the skill or actor encounter changed at least eight pixels during its draw inside a composed game frame. For a passive, the row names the specific encounter or HUD interaction that verified it. <strong>Rendered</strong> records an emitted effect, applied status or controlled HUD state painted on its own surface. A proc row identifies the resolved effect independently of the odds or event that granted it.</p>
  <p><strong>Changed</strong> and <strong>Exercised</strong> identify controlled releases. Tree rows record whether the measured layers or geometry changed. Actor kits list the moves their AI released at close range, with ranged and wounded phases when needed. <strong>Controlled cast</strong> records a visible move released directly by its owning actor. Each kit row names moves that still need an encounter. <strong>Triggered</strong> means a passive grant reached its proc executor during the attack and spell trial. <strong>Attributes</strong> identifies direct attribute grants. <strong>Painter</strong> samples registered art alone. <strong>Mapped</strong> records a content relationship. <strong>Unobserved</strong> flags an activation lacking visual evidence in this run. Crowded-fight recognition, every legal combination and multiplayer seat parity need separate evidence.</p>
  <table aria-label="Coverage totals"><tbody>${summary}</tbody></table>
  <p>Some registered art is available for optional uses. For example, a scripted encounter can place a skill as a ground impact even when its ordinary cast fires a projectile. Its native cast and its optional impact have separate entries.</p>
  <p><a style="color:#bce0e4" href="${previewBase}-mechanics.png">Compare the revised mechanic silhouettes</a> · <a style="color:#bce0e4" href="${previewBase}-encounter.png">View the Triune Tempest and Tractor Tethers encounter frames</a></p>
  <label>Find by name, ID or evidence<input id="q" type="search"></label><label>Group<select id="g"><option value="">All groups</option>${options(groups)}</select></label><label>Evidence<select id="s"><option value="">All evidence</option>${options(states)}</select></label><p id="count" aria-live="polite"></p>
  <table><thead><tr><th>Group</th><th>Game content</th><th>Evidence</th><th>What was observed</th></tr></thead><tbody>${cells}</tbody></table>
  <script>const rows=Array.from(document.querySelectorAll('tr[id]'),tr=>({tr,group:tr.cells[0].textContent,state:tr.cells[2].textContent,text:tr.textContent.toLowerCase()}));function filter(){let n=0;for(const r of rows){r.tr.hidden=!!((g.value&&r.group!==g.value)||(s.value&&r.state!==s.value)||!r.text.includes(q.value.trim().toLowerCase()));if(!r.tr.hidden)n++}count.textContent=n.toLocaleString()+' of '+rows.length.toLocaleString()+' entries'}for(const id of ['q','g','s'])document.getElementById(id).addEventListener('input',filter);filter()</script></html>`);
}
module.exports = { saveCoverage };
