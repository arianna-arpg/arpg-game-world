import { build, type Plugin, type ResolvedConfig, type Rollup } from 'vite';
import { resolve } from 'node:path';

/** One classic-script asset: an opaque-origin sandbox cannot import same-origin
 * ESM chunks. Bundle the existing native painters once, without World or main. */
export function loadingFramePlugin(): Plugin {
  const virtual = 'virtual:mu-loading-script', internal = '\0' + virtual;
  let config: ResolvedConfig, pending: Promise<string> | undefined;
  const bundle = (): Promise<string> => pending ??= (async () => {
    const output = await build({ configFile: false, root: config.root, logLevel: 'warn',
      build: { write: false, emptyOutDir: false, minify: true,
        lib: { entry: resolve(config.root, 'src/loading/frame.ts'), name: 'MuCrossing', formats: ['iife'] },
      },
    });
    const chunks = (Array.isArray(output) ? output : [output]).flatMap(row => 'output' in row ? (row as Rollup.RollupOutput).output : []);
    const script: Rollup.OutputChunk | undefined = chunks.find((row): row is Rollup.OutputChunk => row.type === 'chunk');
    if (!script || script.type !== 'chunk' || script.imports.length) throw Error('Loading frame must be a self-contained script');
    for (const [id, module] of Object.entries(script.modules)) {
      const name = id.replace(/\\/g, '/');
      if (/\/src\/(?:engine\/world|main|meta\/(?:storage|character))\.ts$/.test(name))
        throw Error('The crossing must not import world or save authority: ' + name);
      // Shared cosmetic/class definitions retain this small immutable catalog;
      // no account constructors, serializers or mutation helpers may survive.
      if (name.endsWith('/src/meta/account.ts') && module.renderedExports.some(key => key !== 'STARTER_CLASSES'))
        throw Error('The crossing must not retain account authority');
    }
    return script.code;
  })();
  return {
    name: 'mu-loading-frame',
    configResolved(value) { config = value; },
    resolveId(id) { if (id === virtual) return internal; },
    async load(id) {
      if (id !== internal) return;
      if (config.command === 'serve') return `export default ${JSON.stringify(config.base + '__loading/minigame.js')}`;
      const ref = this.emitFile({ type: 'asset', name: 'mu-crossing.js', source: await bundle() });
      return `export default import.meta.ROLLUP_FILE_URL_${ref};`;
    },
    configureServer(server) {
      server.watcher.on('change', file => { if (file.replace(/\\/g, '/').includes('/src/')) pending = undefined; });
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] !== config.base + '__loading/minigame.js') return next();
        try { res.setHeader('Content-Type', 'application/javascript'); res.setHeader('Cache-Control', 'no-cache'); res.end(await bundle()); }
        catch (error) { pending = undefined; res.statusCode = 500; res.end('throw Error("The crossing could not be prepared")'); server.config.logger.error(String(error)); }
      });
    },
  };
}
