import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalizePath, type Plugin } from 'vite';

/** Consume the same selections as the website, without shipping provenance or
 * another hand-maintained registry. Vite owns offline and relative-base URLs. */
export function abilityArtworkPlugin(): Plugin {
  const catalogue = fileURLToPath(new URL('../src/render/abilityArtworkCatalog.ts', import.meta.url));
  const manifest = fileURLToPath(new URL('../site/assets/art/icons/manifest.json', import.meta.url));
  return {
    name: 'hollow-ability-artwork',
    enforce: 'pre',
    load(id) {
      if (normalizePath(id) !== normalizePath(catalogue)) return;
      this.addWatchFile(manifest);
      const entries = JSON.parse(readFileSync(manifest, 'utf8')).entries as { kind: string; id: string; key: string; src: string; imageSha256: string }[];
      const imports: string[] = [], rows: string[] = [], seen = new Set<string>();
      for (const entry of entries) {
        if (entry.kind !== 'skill' && entry.kind !== 'support') continue;
        const expected = `assets/art/icons/${entry.kind}/${entry.id}.${entry.imageSha256.slice(0, 12)}.webp`;
        if (!/^[a-z0-9_-]+$/.test(entry.id) || entry.key !== `${entry.kind}:${entry.id}`
          || entry.src !== expected || seen.has(entry.key)) throw new Error(`Invalid ability artwork selection: ${entry.key}`);
        seen.add(entry.key);
        const file = fileURLToPath(new URL('../site/' + entry.src, import.meta.url));
        this.addWatchFile(file);
        if (!existsSync(file)) {
          this.warn(`Missing ${entry.key} painting; retaining its drawn fallback.`);
          continue;
        }
        const binding = `art${rows.length}`;
        imports.push(`import ${binding} from ${JSON.stringify('../../site/' + entry.src + '?url')};`);
        rows.push(`${JSON.stringify(entry.key)}:${binding}`);
      }
      return imports.join('\n') + '\nexport const ABILITY_ARTWORK_URLS = {' + rows.join(',') + '};';
    },
    handleHotUpdate({ file, server }) {
      if (normalizePath(file) !== normalizePath(manifest)) return;
      const module = server.moduleGraph.getModuleById(normalizePath(catalogue));
      if (module) server.moduleGraph.invalidateModule(module);
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}
