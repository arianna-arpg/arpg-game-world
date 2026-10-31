// An "episode" that misbehaves on request, so the watchdog's test does not depend on
// the engine having a hang in it. Run by scripts/test-balance-farm.mjs.
import { armWatchdog } from './watchdog';

const [mode, file] = process.argv.slice(2);
const watch = armWatchdog({ file, stallSec: 2, capSec: 3 });

function spinHere(): void {
  for (;;) { /* a tick that never comes back */ }
}

watch.enter({ id: `fixture_${mode}` }, 1);
if (mode === 'hung') spinHere();
if (mode === 'slow') for (;;) watch.beat();
watch.beat();
watch.leave();
console.log('FINISHED');
process.exit(0);
