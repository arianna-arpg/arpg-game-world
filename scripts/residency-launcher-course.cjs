// SOURCE ONLY / UNRUN. Preparation and post-close verification only; NEVER launches
// a process or kills by PID. Exact accepted independent outer ownership is a prerequisite.
'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const same = (a, b, label) => assert.deepEqual(a, b, label);
const need = (truth, label) => { if (!truth) throw new Error(label); };
const errorRecord = error => error instanceof Error ? { name: error.name, message: error.message, stack: error.stack || null } : { name: typeof error, message: String(error), stack: null };
const lockPath = () => path.join(os.tmpdir(), 'hollow-wake-perf.lock');
function absolute(value) {
  need(typeof value === 'string' && path.isAbsolute(value) && !value.startsWith('\\\\') && path.normalize(value) === value, 'Canonical local absolute path required');
  return value;
}
function under(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}
function readBounded(file, limit = 32 * 1024 * 1024) {
  absolute(file); need(fs.statSync(file).size <= limit, 'Oversized evidence: ' + file); return fs.readFileSync(file);
}
function pinned(pin) {
  need(pin && /^[a-f0-9]{64}$/.test(pin.sha256), 'Exact SHA-256 pin required');
  const bytes = readBounded(pin.path, 1024 * 1024 * 1024);
  same(digest(bytes), pin.sha256, 'Pinned file changed: ' + pin.path); return bytes;
}
function loadJsonPinned(file, sha256) { return JSON.parse(pinned({ path: file, sha256 }).toString('utf8')); }
function relativeFile(root, relative) {
  need(typeof relative === 'string' && relative && !relative.includes('\\') && !path.isAbsolute(relative), 'Portable relative file required');
  const file = path.resolve(root, relative);
  need(under(root, file) && file !== root, 'Inventory escapes its root'); return file;
}
function inventory(root, exclude = new Set()) {
  const result = {}; let count = 0;
  function walk(dir, prefix) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = prefix + entry.name, full = path.join(dir, entry.name);
      if (exclude.has(rel)) continue;
      need(!entry.isSymbolicLink(), 'Unexpected junction/symlink in pinned inventory: ' + full);
      if (entry.isDirectory()) walk(full, rel + '/');
      else { need(entry.isFile(), 'Unexpected inventory entry'); result[rel] = digest(readBounded(full, 1024 * 1024 * 1024)); count++; }
      need(count <= 100000, 'Inventory exceeds finite bound');
    }
  }
  walk(root, ''); return result;
}
const capsuleExcludes = new Set(['.git', 'node_modules', 'balance/reports']);
function verifyInputs(inputs) {
  need(inputs?.schema === 'residency-launcher-course-inputs-v1', 'Unknown course inputs');
  const root = absolute(inputs.projectRoot);
  need(path.basename(root).startsWith('capsule-'), 'An explicitly named isolated capsule is required');
  const primary = path.resolve('D:/Games/Claude/ARPG Game - World');
  const canonical = path.resolve('C:/Users/John/.codex/worktrees/seamless-world/ARPG Game - World');
  need(!under(primary, root) && root.toLowerCase() !== canonical.toLowerCase(), 'Primary/canonical project roots are not fixture targets');
  need(fs.lstatSync(path.join(root, '.git')).isDirectory(), 'Capsule must own local Git metadata, not a worktree pointer');
  same(fs.realpathSync(root).toLowerCase(), root.toLowerCase(), 'Capsule root must not be redirected');
  for (const rel of ['launcher/main.cjs', 'launcher/server.cjs', 'launcher/perfresidency.cjs', 'src/dev/perf.ts', 'src/dev/perfResidency.ts', 'src/main.ts', 'dist/index.html', 'dist/.build-head', 'package.json', 'scripts/residency-launcher-fixture.cjs', 'scripts/residency-launcher-course.cjs']) {
    need(/^[a-f0-9]{64}$/.test(inputs.files?.[rel]), 'Missing required candidate pin: ' + rel);
  }
  for (const rel of Object.keys(inputs.files || {})) relativeFile(root, rel);
  same(inventory(root, capsuleExcludes), inputs.files, 'Candidate source/dist inventory changed');
  same(inventory(path.join(root, '.git')), inputs.gitMetadata, 'Capsule Git metadata changed');
  need(typeof inputs.gitMetadata?.index === 'string' && typeof inputs.gitMetadata?.HEAD === 'string', 'Own index/HEAD must be pinned');
  const stamp = fs.readFileSync(path.join(root, 'dist/.build-head'), 'utf8');
  need(/^[a-f0-9]{40}\|[a-f0-9]{40}$/.test(stamp), 'A real generated dist stamp is required; no fallback rebuild');
  for (const name of ['electron', 'git', 'powershell', 'innerWrapper', 'innerAssembly', 'outerWrapper', 'outerAssembly', 'externalOwner', 'acceptance', 'buildReceipt']) pinned(inputs[name]);
  const acceptance = loadJsonPinned(inputs.acceptance.path, inputs.acceptance.sha256);
  need(acceptance.schema === 'residency-launcher-containment-acceptance-v1' && acceptance.accepted === true, 'Independent native acceptance is a prerequisite, never synthesized by this fixture');
  for (const name of ['powershell', 'innerWrapper', 'innerAssembly', 'outerWrapper', 'outerAssembly', 'externalOwner']) same(acceptance.pins?.[name], inputs[name], 'Acceptance does not cover exact ' + name);
  need(acceptance.independentOuterJob === true && acceptance.noInnerJobHandleDuplicated === true && acceptance.nativeTestsPassed === true && acceptance.environmentBridgeAccepted === true, 'Missing independent ownership/loader acceptance');
  const build = loadJsonPinned(inputs.buildReceipt.path, inputs.buildReceipt.sha256);
  need(build.schema === 'residency-launcher-capsule-build-v1' && build.complete === true, 'Reviewed candidate build receipt required');
  same(build.files, inputs.files, 'Build receipt must cover exact source/dist inventory');
  same(build.gitMetadata, inputs.gitMetadata, 'Build receipt must cover exact Git metadata');
  return inputs;
}
function writeJson(file, value) {
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
  const fd = fs.openSync(file, 'wx'); try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  return { path: file, sha256: digest(bytes) };
}
function reportInventory(root) {
  const dir = path.join(root, 'balance/reports');
  return fs.existsSync(dir) ? inventory(dir) : {};
}
function wrapperArguments(wrapper, request, assembly) {
  return ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File', wrapper.path, '-RequestPath', request.path, '-RequestSha256', request.sha256, '-AssemblyPath', assembly.path, '-AssemblySha256', assembly.sha256];
}
function prepareCase(inputsPath, inputsSha256, mode, outputRoot) {
  const inputs = verifyInputs(loadJsonPinned(inputsPath, inputsSha256));
  need(['second-start', 'disposed-webcontents'].includes(mode), 'Unknown finite fixture case');
  absolute(outputRoot); need(!under(inputs.projectRoot, outputRoot), 'Fixture output must be outside the candidate inventory');
  need(!fs.existsSync(outputRoot) && !fs.existsSync(lockPath()), 'Output must be new and machine perf lock absent');
  fs.mkdirSync(outputRoot); for (const name of ['profile', 'saves', 'inner', 'outer']) fs.mkdirSync(path.join(outputRoot, name));
  const input = writeJson(path.join(outputRoot, 'fixture-input.json'), { schema: 'residency-launcher-fixture-input-v1', mode, outputRoot, inputs });
  const inner = writeJson(path.join(outputRoot, 'inner-request.json'), {
    schema: 'native-job-broker-request-v1', executable: inputs.electron.path,
    arguments: [path.join(inputs.projectRoot, 'scripts/residency-launcher-fixture.cjs'), '--fixture-input=' + input.path, '--fixture-input-sha256=' + input.sha256, '--perf-test', '--fresh', '--run-seed=20261016', '--tilesets=forest,sandsea', '--seconds=0.35', '--weather=clear'],
    workingDirectory: inputs.projectRoot, outputDirectory: path.join(outputRoot, 'inner'), timeoutMs: 240000, cleanupMs: 30000,
  });
  const outer = writeJson(path.join(outputRoot, 'outer-request.json'), {
    schema: 'native-outer-owner-request-v1', executable: inputs.powershell.path,
    arguments: wrapperArguments(inputs.innerWrapper, inner, inputs.innerAssembly),
    workingDirectory: inputs.projectRoot, outputDirectory: path.join(outputRoot, 'outer'), timeoutMs: 300000, cleanupMs: 30000,
  });
  const plan = writeJson(path.join(outputRoot, 'plan.json'), {
    schema: 'residency-launcher-course-plan-v1', mode, outputRoot, input, inner, outer,
    baselineReports: reportInventory(inputs.projectRoot),
    command: { executable: inputs.powershell.path, arguments: wrapperArguments(inputs.outerWrapper, outer, inputs.outerAssembly), workingDirectory: inputs.projectRoot, windowsHide: true },
    externalOwner: inputs.externalOwner, acceptance: inputs.acceptance,
    ownership: { dedicatedSoleWriterStdin: true, holdOpenThroughActualOuterClose: true, drainBothOutputStreams: true, normalControls: [], cancellationByte: '58', neverDuplicateInnerJobHandle: true },
    requiredAbsentEnvironment: ['NODE_OPTIONS', 'NODE_PATH', 'ELECTRON_RUN_AS_NODE'], requiredEnvironment: { GIT_OPTIONAL_LOCKS: '0' },
    expected: { launcherExitCode: 1, innerExitCode: 0, outerExitCode: 0 },
  });
  return plan;
}
function journal(bytes, schema) {
  const text = bytes.toString('utf8'); need(text.endsWith('\n'), 'Truncated journal');
  const lines = text.trimEnd().split('\n'); need(lines.length > 0 && lines.length <= 100000, 'Journal length bound');
  const rows = lines.map(line => JSON.parse(line));
  rows.forEach((row, i) => { same(row.schema, schema, 'Journal schema'); same(row.sequence, i + 1, 'Journal sequence'); });
  return rows;
}
function cleanOwnership(inner, outer, witness, plan, inputs) {
  need(witness?.schema === 'residency-launcher-external-close-v1', 'External close witness required');
  same(witness.planSha256, plan.sha256, 'Witness plan mismatch');
  same(witness.externalOwner, inputs.externalOwner, 'Witness owner mismatch');
  same(witness.acceptance, inputs.acceptance, 'Witness acceptance mismatch');
  need(witness.outerCloseObserved === true && witness.outerExitObserved === true && witness.outerExitCode === 0 && witness.outerSignal === null, 'Actual outer helper close0 required');
  need(witness.forced === false && witness.cancelled === false && witness.deadlineExpired === false && witness.stdinHeldThroughClose === true && witness.stdoutDrained === true && witness.stderrDrained === true, 'Incomplete independent observer closure');
  same(witness.errors, [], 'External observation error');
  same(witness.environmentAbsent, ['NODE_OPTIONS', 'NODE_PATH', 'ELECTRON_RUN_AS_NODE'], 'Unproven loader environment');
  same(witness.environment?.GIT_OPTIONAL_LOCKS, '0', 'Git must remain read-only');
  const monotonic = rows => rows.forEach((row, i) => { need(Number.isFinite(row.elapsedMs) && row.elapsedMs >= 0 && (!i || row.elapsedMs >= rows[i - 1].elapsedMs), 'Invalid native chronology'); });
  need(inner.length >= 6 && outer.length >= 6, 'Missing native lifecycle phases');
  monotonic(inner); monotonic(outer);
  for (const phase of ['preparing', 'created-suspended', 'running', 'root-exit-observed', 'workload-closed', 'closed-success']) need(inner.some(row => row.phase === phase), 'Missing inner phase ' + phase);
  for (const phase of ['preparing', 'created-suspended', 'running', 'subject-exit-observed', 'ownership-empty', 'closed-owned-clean']) need(outer.some(row => row.phase === phase), 'Missing outer phase ' + phase);
  for (const row of inner) {
    same(row.requestSha256, plan.value.inner.sha256, 'Inner request mismatch');
    need(row.firstError === null && Array.isArray(row.errors) && row.errors.length === 0 && row.errorsTruncated === false, 'Inner original error present');
    need(row.stopRequested === false && row.terminationAttempted === false && row.quarantineAttempted === false && row.cleanupDeadlineExpired === false && row.helperCloseObserved === false, 'Inner stop/unknown/self-close claim');
    need(!row.postRootAccountingObserved || row.postRootActiveProcesses === 0, 'Observed post-root survivor cannot be laundered');
  }
  for (const row of outer) {
    same(row.requestSha256, plan.value.outer.sha256, 'Outer request mismatch');
    need(row.firstError === null && Array.isArray(row.errors) && row.errors.length === 0 && row.errorsTruncated === false, 'Outer original error present');
    need(row.stopRequested === false && row.lifecycleNegative === false && row.subjectCrashRequested === false && row.terminateAttempted === false && row.quarantineAttempted === false && row.cleanupDeadlineExpired === false && row.actualOuterCloseObserved === false, 'Outer stop/unknown/self-close claim');
    same(row.commands, [], 'Unexpected outer command');
  }
  const ordered = (rows, phases) => {
    let previous = -1;
    rows.forEach(row => { const rank = phases.indexOf(row.phase); need(rank >= previous && rank >= 0, 'Invalid native phase order'); previous = rank; });
    same(rows[0].phase, 'preparing');
  };
  ordered(inner, ['preparing', 'created-suspended', 'running', 'root-exit-observed', 'workload-closed', 'closed-success']);
  ordered(outer, ['preparing', 'created-suspended', 'running', 'subject-exit-observed', 'ownership-empty', 'closed-owned-clean']);
  for (const row of inner) {
    for (const field of ['creationReturned', 'jobVerified', 'resumeAttempted', 'resumed', 'rootExitObserved', 'rootHandlesClosed', 'postRootAccountingObserved', 'workloadClosed', 'jobHandleClosed']) need(typeof row[field] === 'boolean', 'Invalid native boolean ' + field);
    if (row.phase === 'preparing') need(!row.creationReturned && !row.resumed && row.rootPid === null, 'Impossible inner preparing state');
    if (row.phase === 'created-suspended') need(row.creationReturned && row.jobVerified && !row.resumeAttempted && !row.resumed, 'Impossible inner suspended state');
    if (row.resumed) need(row.creationReturned && row.jobVerified && row.resumeAttempted && row.resumePreviousCount === 1, 'Unverified native resume');
    if (row.rootExitObserved) need(row.resumed && row.rootExitCode === 1 && /^[1-9][0-9]*$/.test(row.rootExitFileTime), 'Unobserved native root exit');
    if (row.rootHandlesClosed) need(row.rootExitObserved, 'Root handles closed before observed exit');
    if (row.postRootAccountingObserved) need(row.rootHandlesClosed && row.postRootActiveProcesses === 0, 'Post-root query must follow handle closure');
    if (row.workloadClosed) need(row.postRootAccountingObserved && row.jobAccounting === 'empty' && row.activeProcesses === 0, 'Workload closed without fresh accounting');
    if (row.jobHandleClosed) need(row.workloadClosed, 'Inner job released before closure');
  }
  for (const row of outer) {
    for (const field of ['subjectCreationReturned', 'assignmentVerified', 'resumeAttempted', 'resumed', 'subjectExitObserved', 'subjectHandlesClosed', 'subjectStdinWriterClosed', 'ownershipClosed', 'jobHandleClosed']) need(typeof row[field] === 'boolean', 'Invalid outer boolean ' + field);
    if (row.phase === 'preparing') need(!row.subjectCreationReturned && !row.resumed && row.subjectPid === null, 'Impossible outer preparing state');
    if (row.phase === 'created-suspended') need(row.subjectCreationReturned && row.assignmentVerified && !row.resumeAttempted && !row.resumed, 'Impossible outer suspended state');
    if (row.resumed) need(row.subjectCreationReturned && row.assignmentVerified && row.resumeAttempted && row.resumePreviousCount === 1, 'Unverified outer resume');
    if (row.subjectExitObserved) need(row.resumed && row.subjectExitCode === 0 && /^[1-9][0-9]*$/.test(row.subjectExitFileTime), 'Unobserved actual inner exit');
    if (row.subjectHandlesClosed) need(row.subjectExitObserved, 'Subject handles closed before observed exit');
    if (row.ownershipClosed) need(row.subjectHandlesClosed && row.jobAccounting === 'empty' && row.activeProcesses === 0, 'Outer ownership released without fresh zero');
    if (row.jobHandleClosed) need(row.ownershipClosed, 'Outer job released before closure');
  }
  const i = inner.at(-1), o = outer.at(-1);
  same(i.phase, 'closed-success', 'Inner terminal phase'); same(o.phase, 'closed-owned-clean', 'Outer terminal phase');
  for (const name of ['creationReturned', 'jobVerified', 'resumeAttempted', 'resumed', 'rootExitObserved', 'rootHandlesClosed', 'postRootAccountingObserved', 'workloadClosed', 'jobHandleClosed']) same(i[name], true, 'Incomplete launcher closure: ' + name);
  same(i.resumePreviousCount, 1); same(i.rootExitCode, 1); same(i.postRootActiveProcesses, 0);
  for (const name of ['subjectCreationReturned', 'assignmentVerified', 'resumeAttempted', 'resumed', 'subjectExitObserved', 'subjectHandlesClosed', 'subjectStdinWriterClosed', 'ownershipClosed', 'jobHandleClosed']) same(o[name], true, 'Incomplete outer closure: ' + name);
  same(o.resumePreviousCount, 1); same(o.subjectExitCode, 0);
  for (const row of [i, o]) need(row.jobAccounting === 'empty' && row.activeProcesses === 0, 'Fresh native zero accounting required');
  need(/^[1-9][0-9]*$/.test(i.rootCreationFileTime) && /^[1-9][0-9]*$/.test(i.rootExitFileTime) && /^[1-9][0-9]*$/.test(o.subjectExitFileTime), 'Missing retained native identity/exit time');
  for (const pid of [i.rootPid, i.brokerPid, o.outerPid]) need(Number.isInteger(pid) && pid > 0, 'Actual native process identity required');
  same(o.subjectPid, i.brokerPid, 'Nested helper identity PID'); same(o.subjectCreationFileTime, i.brokerCreationFileTime, 'Nested helper retained creation time');
  same(witness.outerPid, o.outerPid, 'External actual outer PID'); same(witness.outerCreationFileTime, o.outerCreationFileTime, 'External actual outer creation time');
  for (const row of inner) { same(row.brokerPid, i.brokerPid, 'Inner identity drift'); same(row.brokerCreationFileTime, i.brokerCreationFileTime, 'Inner creation drift'); if (row.rootPid !== null) { same(row.rootPid, i.rootPid, 'Launcher identity drift'); same(row.rootCreationFileTime, i.rootCreationFileTime, 'Launcher creation drift'); } }
  for (const row of outer) { same(row.outerPid, o.outerPid, 'Outer identity drift'); same(row.outerCreationFileTime, o.outerCreationFileTime, 'Outer creation drift'); }
  return { launcherPid: i.rootPid, innerPid: i.brokerPid, outerPid: o.outerPid };
}
function inspectTrace(trace, mode, input, closure) {
  const one = kind => { const values = trace.filter(row => row.kind === kind); same(values.length, 1, 'Exactly one ' + kind); return values[0]; };
  const boot = one('bootstrap'), selected = one('selected-sweep'), rejection = one('selected-rejection'), exit = one('app-exit');
  same(boot.mode, mode); same(boot.inputSha256, input.sha256); same(boot.pid, closure.launcherPid); same(selected.mode, mode);
  same(boot.traceLifetime, 'until-actual-process-exit', 'Trace must remain writable through actual process exit');
  const closed = one('server-closed'), exitIndex = trace.indexOf(exit), closeIndex = trace.indexOf(closed);
  need(trace.indexOf(selected) < trace.indexOf(rejection) && trace.indexOf(rejection) < exitIndex, 'Selected failure must precede actual exit request');
  // app.exit preserves the original synchronous callsite. Only the one actual,
  // bound server-close callback may follow its snapshot. Native root exit/close
  // and empty job accounting are separately required before this file is read.
  need(trace.slice(exitIndex + 1).every(row => row === closed), 'Unexpected post-exit-request trace event');
  need(!trace.some(row => row.kind.startsWith('unexpected-')), 'Unexpected actual launcher behavior');
  same(exit.code, 1); same(exit.firstRejection, rejection.error); same(exit.lockExists, false); same(exit.remainingPerfBeatListeners, 1, 'Only fixture observer remains after main removes its beat listener');
  need(exit.windows.length === (mode === 'second-start' ? 1 : 2) && exit.windows.every(win => win.closed), 'All actual windows must close');
  need(exit.children.length >= 3 && exit.children.every(child => child.closeObserved && child.exitCode === 0), 'All actual read-only Git children must close');
  need(exit.servers.length === 1 && exit.servers[0].closeRequested === true, 'Real server cleanup must be requested');
  same(exit.servers[0].writes.filter(row => row.phase === 'course'), [], 'No course persistence requests');
  const listening = one('server-listening'); same(listening.lock.pid, boot.pid, 'Actual machine lock ownership');
  same(listening.port, exit.servers[0].port); need(Number.isInteger(listening.port) && listening.port > 0 && listening.port <= 65535, 'Actual listener port required');
  same(closed.port, listening.port, 'Server-close callback must belong to the actual listener');
  same(closed.closeRequested, true); same(closed.closeObserved, true, 'Real server-close callback required');
  const requests = trace.filter(row => row.kind === 'server-close-requested');
  need(requests.length > 0 && requests.every(row => row.port === listening.port && trace.indexOf(listening) < trace.indexOf(row) && trace.indexOf(row) < closeIndex && trace.indexOf(row) < exitIndex), 'Actual bound close requests must precede callback and exit request');
  same(exit.servers[0].closeObserved, closeIndex < exitIndex, 'Keep the actual exit-request server snapshot unchanged');
  same(closed.writes, exit.servers[0].writes, 'Late server writes must not disappear');
  same(closed.writes.filter(row => row.phase === 'course'), [], 'No late course persistence requests');
  if (mode === 'second-start') {
    const beats = trace.filter(row => row.kind === 'beat' && row.payload.at === 'fixture-second-start'); same(beats.length, 1);
    const beat = beats[0].payload; same(beat.calls, 2); same(beat.previousRetired, true); same(beat.nextReady, true);
    need(rejection.error.message.includes(beat.original.message), 'Native second-start sentinel lost across IPC');
    same(rejection.channel, 'rejection'); same(rejection.banked.fresh.length, 1, 'First real fresh row must be banked');
    need(rejection.banked.residencyWindows.length >= 4, 'First real boundary receipts must be banked');
  } else {
    const destroyed = one('auxiliary-webcontents-destroyed'), disposed = one('disposed-receiver'), returned = one('disposed-native-call-returned');
    same(disposed.disposed, true); same(destroyed.id, disposed.id); same(returned.id, disposed.id); same(returned.thenable, true);
    need(trace.indexOf(selected) < trace.indexOf(destroyed) && trace.indexOf(destroyed) < trace.indexOf(disposed) && trace.indexOf(disposed) < trace.indexOf(returned) && trace.indexOf(returned) < trace.indexOf(rejection), 'Actual disposal must precede method return and selected rejection');
    need(exit.windows.some(win => win.auxiliary && win.webContentsId === disposed.id && win.closed), 'Actual disposed auxiliary receiver required');
    same(rejection.channel, 'rejection', 'Electron 43 executeJavaScript returns a rejected Promise; no synchronous native coverage is claimed');
    same(rejection.error.name, 'TypeError'); same(rejection.error.message, 'Object has been destroyed', 'Expected actual native disposed receiver rejection');
    same(rejection.banked.fresh, []); same(rejection.banked.residencyWindows, []);
  }
  return { rejection, port: listening.port, exit, serverClose: closed, serverCloseAfterExitRequest: closeIndex > exitIndex };
}
function inspectReport(report, mode, rejection) {
  same(report.status, 'failed-partial'); same(report.validMeasurement, false); same(report.course, 'fresh');
  same(report.failure, rejection.error, 'The first error seen by actual main must survive exactly');
  const banked = rejection.banked;
  for (const [field, source] of Object.entries({ zones: 'rows', skipped: 'skipped', control: 'control', controlEnd: 'controlEnd', fresh: 'fresh', residencyWindows: 'residencyWindows' })) same(report[field], banked[source], 'Banked raw ' + source + ' changed');
  same(report.ramp.steps, banked.ramp); same(report.ramp.slopes, [], 'Failed partial cannot accept slopes');
  need(mode !== 'second-start' || report.fresh.length === 1, 'First real row disappeared');
}
function inspectBootLog(bytes, port, projectRoot) {
  need(Buffer.isBuffer(bytes), 'Raw boot-log bytes required');
  const log = bytes.toString('utf8');
  need(log.length > 0 && log.endsWith('\n'), 'Missing or truncated launcher boot log');
  need(!/FATAL|render-process-gone|child-process-gone/.test(log), 'Launcher boot log records a fatal error or lost native process');
  const lines = log.split(/\r?\n/).filter(Boolean);
  need(lines.some(line => /^\[[^\]]+\] start v=43\.0\.0 packaged=false platform=win32 /.test(line)), 'Actual pinned Electron fixture boot required');
  const server = 'game server on http://127.0.0.1:' + port + '/ (dist=' + path.join(projectRoot, 'dist') + ')';
  same(lines.filter(line => line.endsWith('] ' + server)).length, 1, 'Boot log must bind the actual listener and pinned dist');
}
async function portClosed(port) {
  return new Promise((resolve, reject) => {
    const socket = require('node:net').connect({ host: '127.0.0.1', port }); let settled = false;
    const finish = error => { if (settled) return; settled = true; socket.destroy(); error ? reject(error) : resolve({ host: '127.0.0.1', port, result: 'ECONNREFUSED', afterActualOuterClose: true }); };
    socket.once('connect', () => finish(new Error('Former actual launcher listener still accepts connections')));
    socket.once('error', error => finish(error.code === 'ECONNREFUSED' ? null : error));
    socket.setTimeout(2000, () => finish(new Error('Listener closure unknown: probe timed out')));
  });
}
async function verifyCase(planPath, planSha256, witnessPath, witnessSha256) {
  const value = loadJsonPinned(planPath, planSha256); need(value.schema === 'residency-launcher-course-plan-v1', 'Unknown plan');
  const input = loadJsonPinned(value.input.path, value.input.sha256), inputs = verifyInputs(input.inputs);
  loadJsonPinned(value.inner.path, value.inner.sha256); loadJsonPinned(value.outer.path, value.outer.sha256);
  const witness = loadJsonPinned(witnessPath, witnessSha256), plan = { value, sha256: planSha256 };
  // The externally accepted producer supplies immutable hashes only after actual
  // close. A hand-authored witness or a self-reported close is never native proof.
  for (const field of ['innerReceipt', 'outerReceipt', 'innerStdout', 'innerStderr', 'outerSubjectStdout', 'outerSubjectStderr', 'outerStdout', 'outerStderr']) pinned(witness[field]);
  for (const [field, relative] of Object.entries({ innerReceipt: 'inner/receipt.jsonl', outerReceipt: 'outer/outer-receipt.jsonl', innerStdout: 'inner/stdout.bin', innerStderr: 'inner/stderr.bin', outerSubjectStdout: 'outer/subject-stdout.bin', outerSubjectStderr: 'outer/subject-stderr.bin' })) same(witness[field].path, path.join(value.outputRoot, relative), 'Raw output path mismatch');
  const inner = journal(pinned(witness.innerReceipt), 'native-job-broker-receipt-v1'), outer = journal(pinned(witness.outerReceipt), 'native-outer-owner-receipt-v1');
  const closure = cleanOwnership(inner, outer, witness, plan, inputs);
  const tracePath = path.join(value.outputRoot, 'launcher-trace.jsonl'), traceBytes = readBounded(tracePath);
  const trace = journal(traceBytes, 'residency-launcher-fixture-trace-v1');
  const actual = inspectTrace(trace, value.mode, value.input, closure);
  const bootLogPath = path.join(value.outputRoot, 'profile/launcher.log'), bootLogBytes = readBounded(bootLogPath);
  inspectBootLog(bootLogBytes, actual.port, inputs.projectRoot);
  const now = reportInventory(inputs.projectRoot);
  for (const [rel, hash] of Object.entries(value.baselineReports)) same(now[rel], hash, 'Pre-existing report changed');
  const added = Object.keys(now).filter(rel => !(rel in value.baselineReports));
  same(added.length, 1, 'Exactly one new durable report file is required');
  need(/^perf_fresh_failed_[^/]+\/report\.json$/.test(added[0]), 'Wrong durable report path');
  const reportPath = path.join(inputs.projectRoot, 'balance/reports', added[0]);
  const reportBytes = readBounded(reportPath), artifact = JSON.parse(reportBytes.toString('utf8')), report = artifact.report;
  same(artifact.dist?.rebuilt, false, 'Actual launcher must observe a fresh build without rebuilding');
  same(artifact.dist?.stamp, fs.readFileSync(path.join(inputs.projectRoot, 'dist/.build-head'), 'utf8'), 'Actual report build stamp');
  need(pinned(witness.innerStdout).toString('utf8').includes('PERF FAILED: ' + actual.rejection.display), 'Actual launcher catch must print the original error');
  inspectReport(report, value.mode, actual.rejection);
  need(!fs.existsSync(lockPath()), 'Machine perf lock remains or another owner started; do not unlink it');
  const serverClosure = await portClosed(actual.port);
  verifyInputs(inputs); // Detect source/index mutation during evidence inspection too.
  return writeJson(path.join(value.outputRoot, 'verification.json'), { schema: 'residency-launcher-fixture-verdict-v1', status: 'pass-lifecycle-only', mode: value.mode, planSha256, witnessSha256, closure, serverClosure, serverCallback: { sequence: actual.serverClose.sequence, port: actual.port, afterExitRequest: actual.serverCloseAfterExitRequest }, trace: { path: tracePath, sha256: digest(traceBytes), retirementBasis: 'independently observed actual root exit; no in-process fd-close callback claimed' }, bootLog: { path: bootLogPath, sha256: digest(bootLogBytes) }, report: { path: reportPath, sha256: digest(reportBytes) }, originalError: actual.rejection.error, bankedFreshRows: actual.rejection.banked.fresh.length, bankedWindows: actual.rejection.banked.residencyWindows.length, bootWrites: actual.exit.servers[0].writes.filter(row => row.phase === 'boot'), measurementAccepted: false });
}
module.exports = { digest, loadJsonPinned, verifyInputs, errorRecord, prepareCase, verifyCase, journal, cleanOwnership, inspectTrace, inspectReport, inspectBootLog };
if (require.main === module) {
  const [command, ...args] = process.argv.slice(2);
  Promise.resolve().then(() => {
    if (command === 'prepare' && args.length === 4) return prepareCase(...args);
    if (command === 'verify' && args.length === 4) return verifyCase(...args);
    throw new Error('Usage: node scripts/residency-launcher-course.cjs prepare INPUTS SHA256 CASE NEW_OUTPUT_DIR | verify PLAN SHA256 EXTERNAL_WITNESS SHA256');
  }).then(result => console.log(JSON.stringify(result)), error => { console.error(error.stack || error); process.exitCode = 1; });
}
