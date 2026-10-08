// ---------------------------------------------------------------------------
// `npm run shard` — stand a hosted world up (docs/design/shard-world.md):
//
//   npm run shard -- --port 8787 --seed 1234 --open
//
//   --port <n>       listen port (default 8787; 0 = any free port)
//   --host <addr>    bind address (default 0.0.0.0 — every interface)
//   --seed <n>       the manifest seed (hex with 0x, else decimal; default a fresh roll)
//   --class <id>     the keeper's class (default warrior)
//   --worldmass      THE UNBROKEN WILDS: host the seamless foundation's continuous
//                    surface, persisted to its own saves/shard_<seed>_wilds.json
//                    and resumed in the mass lane's order (server/wildsSave.ts)
//   --open           THE OPEN ACCOUNT: every class / station / memory unlocked
//   --ephemeral      never write the world (default: saves/shard_<seed>.json every 20 s)
//   --save-dir <p>   where shard saves land (default saves/)
//
// Players connect from the game's Co-op lobby → "Join a Server" with
// ws://<this machine>:<port>. Ctrl-C writes the world and closes the wire.
// ---------------------------------------------------------------------------

import { ShardHost } from './shardHost';

function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq > 0) { out[a.slice(2, eq)] = a.slice(eq + 1); continue; }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) { out[a.slice(2)] = next; i++; }
    else out[a.slice(2)] = true;
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const num = (v: string | true | undefined): number | undefined => {
    if (typeof v !== 'string') return undefined;
    const n = v.startsWith('0x') ? parseInt(v, 16) : Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const port = num(args.port) ?? 8787;
  const host = typeof args.host === 'string' ? args.host : '0.0.0.0';
  const shard = new ShardHost({
    seed: num(args.seed),
    keeperClass: typeof args.class === 'string' ? args.class : undefined,
    open: args.open === true,
    worldmass: args.worldmass === true,
    saveDir: args.ephemeral === true ? null : (typeof args['save-dir'] === 'string' ? args['save-dir'] : undefined),
  });
  // THE RESUME LAW (server/wildsSave.ts): a saved wilds stands back up before
  // the first socket or tick (listen awaits it too; this keeps the order plain).
  await shard.ready();
  const bound = await shard.listen(port, host);
  console.log(`[shard] ${shard.worldmass ? 'the Unbroken Wilds' : 'world'} 0x${shard.seed.toString(16).padStart(8, '0')} — listening on ws://${host === '0.0.0.0' ? 'localhost' : host}:${bound}`
    + (shard.savePath ? ` — saving to ${shard.savePath}` : ' — ephemeral'));
  shard.start();
  const bye = async (): Promise<void> => {
    console.log('[shard] closing — writing the world');
    await shard.stop();
    process.exit(0);
  };
  // Every ending writes the world: Ctrl-C, a closed console (SIGHUP on
  // Windows), Ctrl-Break, a service stop, and a throw nothing caught.
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'] as const) {
    try { process.on(sig, () => { void bye(); }); } catch { /* a platform without the signal */ }
  }
  process.on('uncaughtException', (e) => { console.error('[shard] uncaught:', e); void bye(); });
  process.on('unhandledRejection', (e) => { console.error('[shard] unhandled rejection:', e); void bye(); });
  console.log(`[shard] status page: http://${host === '0.0.0.0' ? 'localhost' : host}:${bound}/`);
}

void main();
