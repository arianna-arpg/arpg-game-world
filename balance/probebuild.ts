// ---------------------------------------------------------------------------
// THE PROBE BUILD — the same TypeScript, without the per-process loader bill.
//
// Every rig under `tsx` pays for a loader thread plus one resolve/transform
// round trip per module: ~2.2s of every probe on a CI runner and ~6s on Windows,
// before the rig does anything. Across 350+ rigs that was half of the whole
// lane. This compiles src/ + balance/ ONCE into a shadow tree of plain .mjs and
// lets Node's own ESM loader run the rigs (measured 2.3s vs 7.7s on Windows).
//
// THE SAME-SEMANTICS LAW: one output file per input file, nothing bundled and
// nothing tree-shaken, so module evaluation order is the native ESM order the
// tsx lane sees. Compiled by tsx's own esbuild with tsx's own settings (see
// compilerOptions), and import.meta.url keeps naming the REAL source file, so a
// rig reading ../src/engine/world.ts behaves exactly as it does under tsx.
//
// THE COMPILER CANNOT REDDEN OR HIDE A RESULT: a rig that fails here is re-run
// under tsx before anything is concluded (balance/runprobes.ts THE RETRY), and
// the daily full gate runs the entire roster under tsx (docs/ai/test-cadence.md).
//
// Keyed by the content of every input, so an unchanged tree recompiles nothing
// and concurrent runners on one checkout share a finished build.
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PROBE_BUILD_CFG = {
  /** Where finished builds live; inside node_modules so nothing can ever commit one. */
  cacheDir: 'node_modules/.cache/probe-build',
  /** A build older than this is pruned by the next one (concurrent runs keep theirs). */
  pruneAfterMs: 60 * 60 * 1000,
  /** tsx's own transform settings (dist/index: minifyWhitespace and keepNames). */
  compilerOptions: { keepNames: true, minifyWhitespace: true, treeShaking: false },
} as const;

export interface ProbeBuild {
  /** Absolute root of the shadow tree. */
  dir: string;
  modules: number;
  ms: number;
  reused: boolean;
}

/** Everything a rig can import through source: all of src/, the top level of balance/. */
export function probeBuildInputs(root: string): string[] {
  const inputs: string[] = [];
  const isSource = (name: string): boolean => /\.tsx?$/.test(name) && !name.endsWith('.d.ts');
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (isSource(entry.name)) inputs.push(full);
    }
  };
  walk(path.join(root, 'src'));
  for (const name of readdirSync(path.join(root, 'balance'))) {
    if (isSource(name)) inputs.push(path.join(root, 'balance', name));
  }
  return inputs.sort();
}

/** The compiler tsx itself runs, so the two lanes never disagree about the language. */
function tsxEsbuild(root: string): { version: string; build(options: object): Promise<{ errors: unknown[] }> } {
  const fromRoot = createRequire(path.join(root, 'package.json'));
  return createRequire(fromRoot.resolve('tsx/package.json'))('esbuild');
}

function contentKey(root: string, inputs: readonly string[], compilerVersion: string): string {
  const hash = createHash('sha256');
  hash.update(`${process.versions.node}\0${compilerVersion}\0${root}\0`);
  hash.update(JSON.stringify(PROBE_BUILD_CFG.compilerOptions));
  hash.update(readFileSync(path.join(root, 'tsconfig.json')));
  for (const file of inputs) {
    hash.update(path.relative(root, file));
    hash.update(readFileSync(file));
  }
  return hash.digest('hex').slice(0, 24);
}

/**
 * Plain-Node ESM needs real extensions, and every module is its own output, so
 * each relative import becomes a sibling .mjs. A relative import that is not
 * TypeScript (launcher .cjs, stylesheets) keeps pointing at the real file.
 */
function shadowPlugin(root: string, outDir: string) {
  const outPath = (source: string): string =>
    path.join(outDir, path.relative(root, source)).replace(/\.tsx?$/, '.mjs');
  const resolveSource = (absolute: string): string | null => {
    const stem = absolute.replace(/\.js$/, '');
    for (const candidate of [absolute, `${absolute}.ts`, `${absolute}.tsx`, path.join(absolute, 'index.ts'), `${stem}.ts`, `${stem}.tsx`]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
    return null;
  };
  return {
    name: 'probe-shadow-tree',
    setup(build: {
      onResolve(o: { filter: RegExp }, cb: (a: { path: string; kind: string; importer: string; resolveDir: string }) => object | null): void;
      onLoad(o: { filter: RegExp }, cb: (a: { path: string }) => object): void;
    }): void {
      build.onResolve({ filter: /.*/ }, args => {
        if (args.kind === 'entry-point') return null;
        if (!args.path.startsWith('.')) return { path: args.path, external: true };
        const absolute = path.resolve(args.resolveDir, args.path);
        const source = resolveSource(absolute);
        if (source && /\.tsx?$/.test(source)) {
          const relative = path.relative(path.dirname(outPath(args.importer)), outPath(source)).split(path.sep).join('/');
          return { path: relative.startsWith('.') ? relative : `./${relative}`, external: true };
        }
        return { path: pathToFileURL(source ?? absolute).href, external: true };
      });
      // A rig's import.meta keeps naming the real source, wherever the output lives.
      build.onLoad({ filter: /\.tsx?$/ }, args => {
        const contents = readFileSync(args.path, 'utf8')
          .replaceAll('import.meta.url', JSON.stringify(pathToFileURL(args.path).href))
          .replaceAll('import.meta.dirname', JSON.stringify(path.dirname(args.path)))
          .replaceAll('import.meta.filename', JSON.stringify(args.path));
        return { contents, loader: args.path.endsWith('x') ? 'tsx' : 'ts' };
      });
    },
  };
}

function pruneOldBuilds(cacheRoot: string, keep: string): void {
  const now = Date.now();
  for (const name of readdirSync(cacheRoot)) {
    if (name === keep) continue;
    const full = path.join(cacheRoot, name);
    try {
      if (now - statSync(full).mtimeMs > PROBE_BUILD_CFG.pruneAfterMs) rmSync(full, { recursive: true, force: true });
    } catch { /* a concurrent runner owns it; the next build prunes it */ }
  }
}

/** The compiled path of a probe inside a finished build. */
export function compiledProbePath(build: ProbeBuild, probe: string): string {
  return path.join(build.dir, 'balance', probe.replace(/\.ts$/, '.mjs'));
}

/** True when this exact tree is already compiled (a run may as well use it). */
export function hasCurrentProbeBuild(root: string): boolean {
  const key = contentKey(root, probeBuildInputs(root), tsxEsbuild(root).version);
  return existsSync(path.join(root, PROBE_BUILD_CFG.cacheDir, key));
}

export async function buildProbes(root: string): Promise<ProbeBuild> {
  const started = Date.now();
  const inputs = probeBuildInputs(root);
  const esbuild = tsxEsbuild(root);
  const key = contentKey(root, inputs, esbuild.version);
  const cacheRoot = path.join(root, PROBE_BUILD_CFG.cacheDir);
  const dir = path.join(cacheRoot, key);
  if (existsSync(dir)) return { dir, modules: inputs.length, ms: Date.now() - started, reused: true };

  mkdirSync(cacheRoot, { recursive: true });
  const staging = `${dir}.tmp-${process.pid}`;
  // tsx applies tsconfig.json only to the files it includes (src/), so balance/
  // compiles without it: separate builds keep class-field semantics identical.
  const isSrc = (file: string): boolean => path.relative(root, file).startsWith(`src${path.sep}`);
  const groups = [
    { entryPoints: inputs.filter(isSrc), tsconfig: path.join(root, 'tsconfig.json') },
    { entryPoints: inputs.filter(file => !isSrc(file)), tsconfigRaw: {} },
  ];
  try {
    await Promise.all(groups.map(group => esbuild.build({
      ...group,
      ...PROBE_BUILD_CFG.compilerOptions,
      outdir: staging,
      outbase: root,
      bundle: true, // one output per input: the plugin makes every import external
      format: 'esm',
      platform: 'node',
      target: `node${process.versions.node}`,
      outExtension: { '.js': '.mjs' },
      logLevel: 'silent',
      plugins: [shadowPlugin(root, staging)],
    })));
    try {
      renameSync(staging, dir);
    } catch (error) {
      // A concurrent runner finished the identical build first: use theirs.
      if (!existsSync(dir)) throw error;
      rmSync(staging, { recursive: true, force: true });
    }
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }
  pruneOldBuilds(cacheRoot, key);
  return { dir, modules: inputs.length, ms: Date.now() - started, reused: false };
}
