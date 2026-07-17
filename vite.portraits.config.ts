// ---------------------------------------------------------------------------
// The WEBSITE PORTRAIT BUNDLE build (`npm run build:portraits`): wraps
// src/render/portraitLib.ts — the portrait fabric + body baker + part grammar
// + LOOKS registry, all vis-pure — into ONE self-contained iife at
// site/assets/portraits.js (global `HWPortraits`). The database page draws
// monsters with the game's own painters; site/data JSON supplies the defs.
//
// CI runs this beside export-web-data (.github/workflows/pages.yml) and the
// output is gitignored like site/data/*.json — regenerated, never committed,
// so site pixels can no more drift from src/ than site facts can.
// ---------------------------------------------------------------------------

import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/render/portraitLib.ts'),
      name: 'HWPortraits',
      formats: ['iife'],
      fileName: () => 'portraits.js',
    },
    outDir: 'site/assets',
    // site/assets holds the committed hand-written site JS — never wipe it.
    emptyOutDir: false,
    sourcemap: false,
  },
});
