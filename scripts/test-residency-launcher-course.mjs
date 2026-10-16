// UNRUN pure consumer controls. These fabricate evidence deliberately and prove
// only refusal/report-comparison behavior. They are not native cleanup evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import course from './residency-launcher-course.cjs';
const clone = value => JSON.parse(JSON.stringify(value));
const error = { name: 'Error', message: 'original first rejection', stack: 'first exact stack' };
const banked = { rows: [{ raw: 1 }], skipped: [], control: { raw: 2 }, controlEnd: null, fresh: [{ raw: 3 }], ramp: [], residencyWindows: [{ ingress: { wallMs: 1.125 }, egress: null, error: { message: 'retained original' } }] };
const report = { status: 'failed-partial', validMeasurement: false, course: 'fresh', failure: error, zones: banked.rows, skipped: banked.skipped, control: banked.control, controlEnd: banked.controlEnd, fresh: banked.fresh, residencyWindows: banked.residencyWindows, ramp: { steps: [], slopes: [] } };
test('failed partial preserves original first error and fractional/unavailable raw endpoints', () => { course.inspectReport(report, 'second-start', { error, banked }); });
for (const [label, mutate] of [
  ['rewritten first error', value => { value.failure.message = 'secondary cleanup error'; }],
  ['lost first real row', value => { value.fresh = []; }],
  ['lost raw unavailable endpoint', value => { value.residencyWindows[0].egress = { wallMs: 0 }; }],
  ['rounded raw clock', value => { value.residencyWindows[0].ingress.wallMs = 1; }],
  ['accepted failed measurement', value => { value.validMeasurement = true; }],
  ['slope from failed partial', value => { value.ramp.slopes = [0]; }],
]) test('refuses ' + label, () => { const value = clone(report); mutate(value); assert.throws(() => course.inspectReport(value, 'second-start', { error, banked })); });
function receipts() {
  const plan = { sha256: 'plan', value: { inner: { sha256: 'inner' }, outer: { sha256: 'outer' } } };
  const inputs = { externalOwner: { path: 'accepted-external-owner', sha256: 'owner' }, acceptance: { path: 'native-acceptance', sha256: 'acceptance' } };
  const inner = ['preparing', 'created-suspended', 'running', 'root-exit-observed', 'workload-closed', 'closed-success'].map((phase, index) => ({ phase, elapsedMs: index, requestSha256: 'inner', firstError: null, errors: [], errorsTruncated: false, stopRequested: false, terminationAttempted: false, quarantineAttempted: false, cleanupDeadlineExpired: false, helperCloseObserved: false, creationReturned: true, jobVerified: true, resumeAttempted: true, resumed: true, resumePreviousCount: 1, rootExitObserved: true, rootExitCode: 1, rootHandlesClosed: true, postRootAccountingObserved: true, postRootActiveProcesses: 0, workloadClosed: true, jobHandleClosed: true, jobAccounting: 'empty', activeProcesses: 0, rootCreationFileTime: '101', rootExitFileTime: '102', brokerPid: 20, brokerCreationFileTime: '200', rootPid: 10 }));
  const outer = ['preparing', 'created-suspended', 'running', 'subject-exit-observed', 'ownership-empty', 'closed-owned-clean'].map((phase, index) => ({ phase, elapsedMs: index, requestSha256: 'outer', firstError: null, errors: [], errorsTruncated: false, stopRequested: false, lifecycleNegative: false, subjectCrashRequested: false, terminateAttempted: false, quarantineAttempted: false, cleanupDeadlineExpired: false, actualOuterCloseObserved: false, commands: [], subjectCreationReturned: true, assignmentVerified: true, resumeAttempted: true, resumed: true, resumePreviousCount: 1, subjectExitObserved: true, subjectExitCode: 0, subjectHandlesClosed: true, subjectStdinWriterClosed: true, ownershipClosed: true, jobHandleClosed: true, jobAccounting: 'empty', activeProcesses: 0, subjectPid: 20, subjectCreationFileTime: '200', subjectExitFileTime: '202', outerPid: 30, outerCreationFileTime: '300' }));
  // A coherent six-phase positive transcript, still synthetic and not proof.
  for (let n = 0; n < inner.length; n++) {
    Object.assign(inner[n], { creationReturned: n >= 1, jobVerified: n >= 1, resumeAttempted: n >= 2, resumed: n >= 2, resumePreviousCount: n >= 2 ? 1 : null, rootExitObserved: n >= 3, rootExitCode: n >= 3 ? 1 : null, rootExitFileTime: n >= 3 ? '102' : null, rootHandlesClosed: n >= 4, postRootAccountingObserved: n >= 4, postRootActiveProcesses: n >= 4 ? 0 : null, workloadClosed: n >= 4, jobHandleClosed: n >= 5, jobAccounting: n >= 4 ? 'empty' : n >= 1 ? 'active' : 'unknown', activeProcesses: n >= 4 ? 0 : n >= 1 ? 1 : null, rootPid: n >= 1 ? 10 : null, rootCreationFileTime: n >= 1 ? '101' : null });
    Object.assign(outer[n], { subjectCreationReturned: n >= 1, assignmentVerified: n >= 1, resumeAttempted: n >= 2, resumed: n >= 2, resumePreviousCount: n >= 2 ? 1 : null, subjectExitObserved: n >= 3, subjectExitCode: n >= 3 ? 0 : null, subjectExitFileTime: n >= 3 ? '202' : null, subjectHandlesClosed: n >= 4, subjectStdinWriterClosed: n === 0 || n >= 5, ownershipClosed: n >= 4, jobHandleClosed: n >= 5, jobAccounting: n >= 4 ? 'empty' : n >= 1 ? 'active' : 'unknown', activeProcesses: n >= 4 ? 0 : n >= 1 ? 1 : null, subjectPid: n >= 1 ? 20 : null, subjectCreationFileTime: n >= 1 ? '200' : null });
  }
  const witness = { schema: 'residency-launcher-external-close-v1', planSha256: 'plan', externalOwner: inputs.externalOwner, acceptance: inputs.acceptance, outerCloseObserved: true, outerExitObserved: true, outerExitCode: 0, outerSignal: null, forced: false, cancelled: false, deadlineExpired: false, stdinHeldThroughClose: true, stdoutDrained: true, stderrDrained: true, errors: [], environmentAbsent: ['NODE_OPTIONS', 'NODE_PATH', 'ELECTRON_RUN_AS_NODE'], environment: { GIT_OPTIONAL_LOCKS: '0' }, outerPid: 30, outerCreationFileTime: '300' };
  return { inner, outer, witness, plan, inputs };
}
const consume = f => course.cleanOwnership(f.inner, f.outer, f.witness, f.plan, f.inputs);
test('explicit fixture root1 policy is separate from pair measurement0/2 policy', () => { assert.equal(consume(receipts()).launcherPid, 10); });
for (const [label, mutate] of [
  ['unobserved outer close', f => { f.witness.outerCloseObserved = false; }],
  ['outer self close', f => { f.outer.at(-1).actualOuterCloseObserved = true; }],
  ['inner self close', f => { f.inner.at(-1).helperCloseObserved = true; }],
  ['known cancellation racing clean final', f => { f.witness.cancelled = true; }],
  ['earlier inner survivor even after later zero', f => { f.inner[4].postRootActiveProcesses = 1; }],
  ['unknown final outer accounting', f => { f.outer.at(-1).jobAccounting = 'unknown'; }],
  ['unclosed outer job', f => { f.outer.at(-1).jobHandleClosed = false; }],
  ['reused inner PID with different native creation time', f => { f.outer.at(-1).subjectCreationFileTime = '201'; }],
  ['actual launcher success instead of intended failure', f => { f.inner.at(-1).rootExitCode = 0; }],
  ['inner helper exit1', f => { f.outer.at(-1).subjectExitCode = 1; }],
  ['outer helper exit2', f => { f.witness.outerExitCode = 2; }],
  ['missing lifecycle phase', f => { f.inner.splice(1, 1); }],
  ['closed string instead of boolean', f => { f.inner.at(-1).rootHandlesClosed = 'true'; }],
  ['impossible creation in preparing row', f => { f.inner[0].creationReturned = true; }],
  ['reversed native lifecycle', f => { f.outer[1].phase = 'running'; }],
  ['changed independent owner pin', f => { f.witness.externalOwner = { sha256: 'other' }; }],
]) test('ownership consumer refuses ' + label, () => { const f = receipts(); mutate(f); assert.throws(() => consume(f)); });
test('journal refuses truncated or reordered receipts', () => {
  assert.throws(() => course.journal(Buffer.from('{"schema":"x","sequence":1}'), 'x'));
  assert.throws(() => course.journal(Buffer.from('{"schema":"x","sequence":2}\n'), 'x'));
});

function disposedTrace() {
  const empty = { fresh: [], residencyWindows: [] };
  const error = { name: 'TypeError', message: 'Object has been destroyed', stack: 'actual native stack control' };
  const rows = [
    { kind: 'bootstrap', mode: 'disposed-webcontents', inputSha256: 'input', pid: 10 },
    { kind: 'server-listening', lock: { pid: 10 }, port: 12345 },
    { kind: 'selected-sweep', mode: 'disposed-webcontents' },
    { kind: 'auxiliary-webcontents-destroyed', id: 22 },
    { kind: 'disposed-receiver', id: 22, disposed: true },
    { kind: 'disposed-native-call-returned', id: 22, thenable: true },
    { kind: 'selected-rejection', channel: 'rejection', error, display: 'TypeError: Object has been destroyed', banked: empty },
    { kind: 'app-exit', code: 1, firstRejection: error, lockExists: false, remainingPerfBeatListeners: 1,
      windows: [{ webContentsId: 21, auxiliary: false, closed: true }, { webContentsId: 22, auxiliary: true, closed: true }],
      children: Array.from({ length: 3 }, () => ({ closeObserved: true, exitCode: 0 })),
      servers: [{ port: 12345, closeRequested: true, closeObserved: false, writes: [] }] },
  ];
  return rows;
}
test('disposed branch requires actual disposal followed by native async rejection; server close event remains raw', () => {
  const trace = disposedTrace();
  const inspected = course.inspectTrace(trace, 'disposed-webcontents', { sha256: 'input' }, { launcherPid: 10 });
  assert.equal(inspected.exit.servers[0].closeObserved, false);
  trace.find(row => row.kind === 'selected-rejection').channel = 'synchronous';
  assert.throws(() => course.inspectTrace(trace, 'disposed-webcontents', { sha256: 'input' }, { launcherPid: 10 }));
});
test('disposed branch refuses a still-live actual receiver or residual primary window', () => {
  const trace = disposedTrace(); trace.at(-1).windows[1].closed = false;
  assert.throws(() => course.inspectTrace(trace, 'disposed-webcontents', { sha256: 'input' }, { launcherPid: 10 }));
});

for (const [label, mutate] of [
  ['only window closed without webContents destroyed', trace => { trace.splice(trace.findIndex(row => row.kind === 'auxiliary-webcontents-destroyed'), 1); }],
  ['method called before disposal', trace => { const a = trace.findIndex(row => row.kind === 'auxiliary-webcontents-destroyed'), b = trace.findIndex(row => row.kind === 'disposed-native-call-returned'); [trace[a], trace[b]] = [trace[b], trace[a]]; }],
  ['different disposed receiver', trace => { trace.find(row => row.kind === 'disposed-native-call-returned').id = 99; }],
  ['non-Promise native return', trace => { trace.find(row => row.kind === 'disposed-native-call-returned').thenable = false; }],
  ['unrelated rejection instead of native disposal', trace => { trace.find(row => row.kind === 'selected-rejection').error.message = 'fixture setup failure'; }],
  ['still-live receiver after destroyed event', trace => { trace.find(row => row.kind === 'disposed-receiver').disposed = false; }],
]) test('disposed consumer refuses ' + label, () => {
  const trace = disposedTrace(); mutate(trace);
  assert.throws(() => course.inspectTrace(trace, 'disposed-webcontents', { sha256: 'input' }, { launcherPid: 10 }));
});
